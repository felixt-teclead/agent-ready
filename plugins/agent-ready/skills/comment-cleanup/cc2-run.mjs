#!/usr/bin/env node
// Driver for comment-cleanup: runs one batch of files with no orchestrating
// agent. The script does every mechanical step; two short-lived agents judge
// (one per file, or per group of small files) and verify. Agents only read the
// repository and answer JSON; the script writes every file.
//
//   node cc2-run.mjs --repo <worktree> --work <dir> --files <list> [options]
//
//   --model sonnet           judge model          --verify-model sonnet
//   --effort <level>         judge effort         --no-verify
//   --verify-turns 15        turn cap of the verifier; an item without an answer counts as UNSURE
//   --small-lines 12         a file at or under this many comment lines may share a judge
//   --group-files 4          at most this many files per group
//   --group-blocks 14        at most this many blocks per group
//   --chunk 25               at most this many blocks per judge call; a bigger file is
//                            judged in parallel parts of about equal comment lines
//   --jobs 4                 groups judged at the same time
//   --budget 4               $ cap per agent call
//   --dry                    prepare, pack and write prompts; call no agent
//
// Per group, <work>/<slug>/ holds pre/, blocks/, view/, prompt-*.md, the agents'
// logs and JSON, answers/, placed/, report-<file>.md. <work>/costs.jsonl gets one
// line per agent call, <work>/results.jsonl one line per file.

import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { identifiers, splitSentences, blockSentences, isLayoutUnit, alignLines, sentencesOfFact, sameWords, stripMarkers, qualifierDiff, DOC_CLAIM, keyTerms, unsourced, checkPin, codeLines, importsFile, tokens, sentenceRisk } from "./checks.mjs";

const SKILL = path.dirname(fileURLToPath(import.meta.url));
const CC2 = path.join(SKILL, "cc2.mjs");

// ---------------------------------------------------------------- options
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const flag = (name) => argv.includes(name);
const REPO = path.resolve(opt("--repo", "."));
const WORK = path.resolve(opt("--work", "/tmp/cc2-work"));
const LIST = opt("--files") && path.resolve(opt("--files"));
const MODEL = opt("--model", "sonnet");
const VMODEL = opt("--verify-model", MODEL);
const EFFORT = opt("--effort", "");
const VEFFORT = opt("--verify-effort", EFFORT);
const VTURNS = +opt("--verify-turns", 15);
const SMALL_LINES = +opt("--small-lines", 12);
const GROUP_FILES = +opt("--group-files", 4);
const GROUP_BLOCKS = +opt("--group-blocks", 14);
const JOBS = +opt("--jobs", 4);
const CHUNK = +opt("--chunk", 25);          // max blocks per judge call; a larger file is judged in parallel parts
const BUDGET = opt("--budget", "4");
const DRY = flag("--dry");
const VERIFY = !flag("--no-verify");
const CLAUDE = process.env.CLAUDE_BIN || "claude";
// Imported (the tests), it only defines its helpers for the current directory.
const MAIN = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })();
if (MAIN && !LIST) { console.error("usage: cc2-run.mjs --repo <worktree> --work <dir> --files <list> [options]"); process.exit(2); }

const READ_ONLY = ["Bash(grep:*)", "Bash(rg:*)", "Bash(sed -n:*)", "Bash(cat:*)", "Bash(head:*)", "Bash(tail:*)",
  "Bash(ls:*)", "Bash(wc:*)", "Bash(nl:*)", "Bash(git show:*)", "Bash(git grep:*)", "Bash(git log:*)"];

if (MAIN) { process.chdir(REPO); fs.mkdirSync(WORK, { recursive: true }); }
const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJSON = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 1) + "\n"); };
const slugOf = (f) => f.replace(/^src\//, "").replace(/\.[^.]+$/, "").replace(/[()[\]]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const appendLine = (p, v) => fs.appendFileSync(p, JSON.stringify(v) + "\n");

// ---------------------------------------------------------------- docs for a file
// Rule files whose `paths:` cover the file, plus the domain docs that name its
// route folder, its file name or a module it imports (the runner's step 0e).
function globRe(g) {
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*" && g[i + 1] === "*") { re += g[i + 2] === "/" ? "(?:.*/)?" : ".*"; i += g[i + 2] === "/" ? 2 : 1; }
    else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + re + "$");
}
// Path-scoped rule files, whatever the tool: any markdown file whose front
// matter lists `paths:`, `globs:` or `applyTo:`.
function frontGlobs(text) {
  if (!text.startsWith("---")) return [];
  const fm = text.split(/\n---\s*\n/)[0];
  const out = [];
  let inList = false;
  for (const l of fm.split("\n")) {
    const m = l.match(/^(paths|globs|applyTo)\s*:\s*(.*)$/);
    if (m) { inList = true; if (m[2].trim()) out.push(...m[2].replace(/[\[\]"']/g, "").split(",")); continue; }
    if (inList && /^\s*-\s*/.test(l)) out.push(l.replace(/^\s*-\s*"?|"?\s*$/g, ""));
    else if (!/^\s/.test(l)) inList = false;
  }
  return out.map((g) => g.trim()).filter(Boolean);
}
function listMd(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listMd(p, out);
    else if (/\.(md|mdc|mdx)$/.test(e.name)) out.push(p);
  }
  return out;
}
const MD = [...new Set([...listMd("docs"), ...listMd(".claude"), ...listMd(".cursor"), ...listMd(".github"),
  ...fs.readdirSync(".").filter((f) => /\.(md|mdx)$/.test(f))])];
const mdText = new Map(MD.map((d) => [d, fs.readFileSync(d, "utf8")]));
const ruleGlobs = MD.map((d) => ({ doc: d, globs: frontGlobs(mdText.get(d)).map(globRe) })).filter((r) => r.globs.length);
// Domain docs: every other markdown file outside tool folders.
const DOCS = MD.filter((d) => !ruleGlobs.some((r) => r.doc === d) && !/^\.(claude|cursor|github)\//.test(d) && !/^(CHANGELOG|LICENSE)/i.test(path.basename(d)));
const CODE_EXT = /\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rb|java|kt|rs|sql|sh|vue|svelte)$/;
// Tracked code files, capped so a huge repo costs a sample; null outside git.
function trackedCode(max = 5000) {
  let out;
  try { out = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 }); }
  catch { return null; }
  return out.split("\0").filter((f) => CODE_EXT.test(f)).slice(0, max);
}
// A file name shared by many files (page.tsx, index.ts) says nothing about which doc covers it.
const stemCount = new Map();
for (const f of trackedCode() ?? (fs.existsSync("src") ? (function walk(d, o = []) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, o); else o.push(p); } return o; })("src") : []))
  { const st = path.basename(f).replace(/\.[^.]+$/, ""); stemCount.set(st, (stemCount.get(st) ?? 0) + 1); }

function docsFor(file) {
  const out = new Set(ruleGlobs.filter((r) => r.globs.some((g) => g.test(file))).map((r) => r.doc));
  const dir = path.dirname(file), name = path.basename(file), stem = name.replace(/\.[^.]+$/, "");
  const pats = [dir.split("/").slice(-2).join("/") + "/"];
  if ((stemCount.get(stem) ?? 0) <= 3) pats.push(name);
  for (const d of DOCS) if (pats.some((p) => p.length > 4 && mdText.get(d).includes(p))) out.add(d);
  // docs naming a module this file imports
  const text = fs.readFileSync(file, "utf8");
  const mods = [...new Set([...text.matchAll(/from\s+["'](?:@\/|\.\.?\/)?((?:[\w-]+\/)*[\w-]+)["']/g)].map((m) => m[1].split("/").slice(-2).join("/")))].filter((m) => m.length > 6);
  const scored = DOCS.filter((d) => !out.has(d)).map((d) => [d, mods.filter((m) => mdText.get(d).includes(m)).length]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  for (const [d] of scored.slice(0, 3)) out.add(d);
  return [...out];
}

// ---------------------------------------------------------------- doc index
// Headings and bold lead-ins with their line ranges, and paragraphs for retrieval.
const docCache = new Map();
function docIndex(doc) {
  if (docCache.has(doc)) return docCache.get(doc);
  if (!fs.existsSync(doc)) { docCache.set(doc, null); return null; }
  const lines = fs.readFileSync(doc, "utf8").split("\n");
  const heads = [];
  let fence = false;
  lines.forEach((l, i) => {
    if (/^```/.test(l)) fence = !fence;
    if (!fence) { const m = l.match(/^(#{1,6}) (.*)$/); if (m) heads.push({ level: m[1].length, title: m[2].trim(), start: i + 1 }); }
  });
  heads.forEach((h, i) => { const n = heads.slice(i + 1).find((x) => x.level <= h.level); h.end = n ? n.start - 1 : lines.length; h.kind = "heading"; });
  const leads = [];
  const paras = [];
  let cur = null;
  fence = false;
  lines.forEach((l, i) => {
    if (/^```/.test(l)) fence = !fence;
    const startsItem = !fence && /^\s*(?:[-*]\s+|\d+\.\s+)/.test(l);
    const isHead = !fence && /^#{1,6} /.test(l);
    if (!l.trim() || isHead || (startsItem && cur && !/^\s{2,}/.test(l))) { if (cur) paras.push(cur); cur = null; }
    if (l.trim() && !isHead) { if (!cur) cur = { start: i + 1, end: i + 1 }; else cur.end = i + 1; }
    const joined = [l, ...lines.slice(i + 1, i + 5)].join("\n").split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, " ");
    const m = !fence && /^\s*(?:[-*]\s+|\d+\.\s+)?\*\*/.test(l) && joined.match(/^\s*(?:[-*]\s+|\d+\.\s+)?\*\*(.+?)\*\*/);
    if (m) leads.push({ title: m[1].trim(), start: i + 1, kind: "lead-in" });
  });
  if (cur) paras.push(cur);
  for (const ld of leads) { const p = paras.find((p) => p.start <= ld.start && ld.start <= p.end); ld.end = p ? p.end : ld.start; }
  const headingAt = (line) => [...heads].filter((h) => h.start <= line && line <= h.end).sort((a, b) => b.level - a.level)[0] ?? null;
  const d = { doc, lines, heads, leads, paras, headingAt };
  docCache.set(doc, d);
  return d;
}
const norm = (s) => s.replace(/[`*_]/g, "").replace(/\s+/g, " ").trim().replace(/[.:;!?]+$/, "").toLowerCase();
function resolveAnchor(doc, anchor) {
  const d = docIndex(doc);
  if (!d) return null;
  if (!anchor) return { title: "", start: 1, end: Math.min(d.lines.length, 60), kind: "doc" };
  const all = [...d.heads, ...d.leads];
  const slug = (t) => norm(t).replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
  return all.find((s) => s.title === anchor) ?? all.find((s) => norm(s.title) === norm(anchor)) ?? all.find((s) => slug(s.title) === anchor.toLowerCase()) ?? null;
}
const pointerText = (p, r) => p.form === "plain" ? p.doc : p.form === "slug" ? `${p.doc}#${p.anchor}` : `${p.doc} §"${r ? r.title : p.anchor}"`;
// A path segment may be or hold a (group) or [param] folder; brackets must close,
// so a path in parentheses or a markdown link does not take them in. Same in cc2.mjs.
const SEG = String.raw`(?:[\w.@-]|\([\w.@-]*\)|\[[\w.@-]*\])+`;
const POINTER = new RegExp(String.raw`^\`?((?:${SEG}\/)*${SEG}\.mdx?)\`?(?:\s*§\s*"(.+)"|#([\w-]+))?$`);
const CODEREF = new RegExp(String.raw`^\`?((?:${SEG}\/)*${SEG}\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rb|java|kt|rs|sql|sh))\`?`);
function parsePointer(p) {
  const m = String(p ?? "").trim().replace(/^See\s+/, "").replace(/\.$/, "").match(POINTER);
  if (!m || !fs.existsSync(m[1])) return null;
  return { doc: m[1], anchor: m[2] ?? m[3] ?? "", form: m[2] ? "section" : m[3] ? "slug" : "plain" };
}
const sectionText = (doc, s, cap = 60) => {
  const d = docIndex(doc);
  const end = Math.min(s.end, s.start + cap - 1);
  return d.lines.slice(s.start - 1, end).join("\n") + (s.end > end ? "\n[…]" : "");
};

// ---------------------------------------------------------------- conventions
// What the repository itself says about comments and docs: paragraphs of its
// instruction files that talk about them, and the pointer forms its code uses.
let conventionsCache = null;
function repoConventions() {
  if (conventionsCache !== null) return conventionsCache;
  const instr = ["CLAUDE.md", "AGENTS.md", "CONTRIBUTING.md", "docs/CONTRIBUTING.md", ".github/copilot-instructions.md", ".cursorrules",
    ...MD.filter((d) => /^\.(claude|cursor)\/rules\//.test(d) && !ruleGlobs.some((r) => r.doc === d))].filter((f) => fs.existsSync(f));
  const paras = [];
  for (const f of instr) {
    // paragraphs, and inside lists each top-level bullet on its own
    const blocks = fs.readFileSync(f, "utf8").split(/\n\s*\n/).flatMap((b) => b.split(/\n(?=[-*] )/));
    for (const b of blocks) if (/\bcomments?\b|pointer|§|single source|JSDoc|docstring/i.test(b) && b.length < 1500 && !/^#+ /.test(b.trim())) paras.push(`From ${f}:\n${b.trim()}`);
  }
  // pointer forms already in the code
  const forms = { section: [], anchor: [], plain: [] };
  const src = [];
  let bytes = 0;
  for (const f of trackedCode() ?? []) {
    if (bytes > 32 << 20) break;
    let t;
    try { t = fs.readFileSync(f, "utf8"); } catch { continue; }
    if (t.length > 1 << 20) continue; // generated or vendored
    bytes += t.length;
    for (const m of t.matchAll(/(?:\/\/|\*|#|--) *See [^ \n]+\.mdx?[^\n]{0,160}/g)) src.push(m[0]);
  }
  for (const l of src) (/§/.test(l) ? forms.section : /\.mdx?#/.test(l) ? forms.anchor : forms.plain).push(l.replace(/^(\/\/|\*|#|--)\s*/, ""));
  const top = Object.entries(forms).sort((a, b) => b[1].length - a[1].length)[0];
  const lines = [];
  if (paras.length) lines.push(...paras.slice(0, 8));
  else lines.push("The repository's instruction files say nothing about comments or docs.");
  if (top[1].length) lines.push(`Pointer form used in the code (${top[1].length} of ${src.length} pointers), e.g.:\n${[...new Set(top[1])].slice(0, 3).join("\n")}`);
  else lines.push("No pointers to docs exist in the code yet: write `See <doc path> §\"<section heading>\"`.");
  lines.push(`Path-scoped rule files (they load for the paths in their front matter): ${ruleGlobs.map((r) => r.doc).join(", ") || "none"}.`);
  conventionsCache = lines.join("\n\n");
  return conventionsCache;
}

// ---------------------------------------------------------------- pack
function relatedDeclarations(file, words, cap = 8) {
  const text = fs.readFileSync(file, "utf8");
  const out = [];
  for (const m of text.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']([^"']+)["']/g)) {
    const names = m[1].split(",").map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]).filter(Boolean);
    const spec = m[2];
    let target = null;
    const base = spec.startsWith("@/") ? path.join("src", spec.slice(2)) : spec.startsWith(".") ? path.join(path.dirname(file), spec) : null;
    if (!base) continue;
    for (const c of [base + ".ts", base + ".tsx", path.join(base, "index.ts"), path.join(base, "index.tsx"), base]) if (fs.existsSync(c) && fs.statSync(c).isFile()) { target = c; break; }
    if (!target) continue;
    const src = fs.readFileSync(target, "utf8").split("\n");
    for (const n of names) {
      if (!words.has(n) || out.length >= cap) continue;
      const i = src.findIndex((l) => new RegExp(`^export\\s+(?:default\\s+)?(?:async\\s+)?(?:function\\*?|const|let|class|type|interface|enum)\\s+${n}\\b`).test(l));
      if (i < 0) continue;
      let s = i;
      while (s > 0 && /^\s*(\/\/|\/\*|\*)/.test(src[s - 1])) s--;
      let e = i;
      while (e < src.length - 1 && e - i < 12 && !/[{=]\s*$/.test(src[e]) && !/;\s*$/.test(src[e])) e++;
      out.push(`${target}:${s + 1}-${e + 1}\n${src.slice(s, e + 1).join("\n")}`);
    }
  }
  return out;
}

// How the files that import an export use it: one line per call site, so the
// judge sees which contract facts callers rely on.
function importerUsage(b) {
  if (b.scope !== "interface" || !b.exported) return [];
  const names = b.exported === "default" ? [] : b.exported.split(/,\s*/);
  const out = [];
  for (const imp of b.importedBy ?? []) {
    if (!fs.existsSync(imp)) continue;
    const lines = fs.readFileSync(imp, "utf8").split("\n");
    let n = 0;
    lines.forEach((l, i) => {
      if (n >= 3 || /^\s*import\b|^\s*}\s*from\b/.test(l)) return;
      if (names.some((nm) => new RegExp(`\\b${nm.replace(/[$]/g, "\\$")}\\b`).test(l))) { out.push(`${imp}:${i + 1}: ${l.trim().slice(0, 160)}`); n++; }
    });
  }
  return out;
}

// Lookups found for the judge, a head start: the doc sections the file's
// pointers name, how importing files use its exports, and test lines naming the
// file or its exports. Capped; what is cut is said.
let testsCache = null;
function testFiles() {
  if (testsCache) return testsCache;
  testsCache = [];
  let bytes = 0;
  for (const f of (trackedCode() ?? []).filter((f) => /test|spec/i.test(f)).slice(0, 2000)) {
    if (bytes > 16 << 20) break;
    let t;
    try { t = fs.readFileSync(f, "utf8"); } catch { continue; }
    if (t.length > 1 << 20) continue;
    bytes += t.length;
    testsCache.push({ f, lines: t.split("\n") });
  }
  return testsCache;
}
function testMentions(file, blocks, perFile = 6) {
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stem = file.replace(/^src\//, "").replace(/\.[^.]+$/, ""), base = path.basename(stem);
  const words = [...new Set(blocks.flatMap((b) => (b.exported && b.exported !== "default" ? b.exported.split(/,\s*/) : [])))].filter((w) => w.length >= 4);
  if (base.length > 3 && (stemCount.get(base) ?? 0) <= 3) words.push(base);
  // a name found in many test files (POST, Button) does not point at this file
  const common = (w) => { const r = new RegExp(`\\b${esc(w)}\\b`); return testFiles().filter((t) => t.lines.some((l) => r.test(l))).length > 10; };
  const re = new RegExp([esc(stem), ...words.filter((w) => !common(w)).map((w) => `\\b${esc(w)}\\b`)].join("|"));
  const out = [];
  // comment lines name files without testing them: only code lines count
  for (const { f, lines } of testFiles()) {
    if (f === file) continue;
    let n = 0;
    for (const { n: at, text } of codeLines(lines.join("\n"))) if (n < perFile && re.test(text)) { out.push(`${f}:${at}: ${lines[at - 1].trim().slice(0, 160)}`); n++; }
  }
  return out;
}
function lookups(file, mine, cap = 12000) {
  const entries = [], sections = [];
  for (const b of mine) for (const p of b.pointers ?? []) {
    const r = p.anchor && resolveAnchor(p.doc, p.anchor); // a whole-doc pointer names no section
    if (!r || sections.includes(`${p.doc}:${r.start}`)) continue;
    sections.push(`${p.doc}:${r.start}`);
    entries.push({ kind: "pointer section", text: `### ${p.doc}:${r.start}-${r.end} "${r.title || p.doc}", named by ${b.id}\n\n${sectionText(p.doc, r, 40)}` });
  }
  const usage = mine.flatMap((b) => { const u = importerUsage(b); return u.length ? [`### ${b.id} (${b.exported})`, ...u] : []; });
  if (usage.length) entries.push({ kind: "importer usage", text: `### How importing files use the exports (what callers rely on)\n\n\`\`\`\n${usage.join("\n")}\n\`\`\`` });
  const tests = testMentions(file, mine);
  if (tests.length) {
    const named = [...new Set(tests.map((l) => l.slice(0, l.indexOf(":"))))];
    const imp = named.filter((t) => importsFile(t, file));
    const note = `Of these, import \`${file}\`: ${imp.join(", ") || "none"}. A test that does not import it tests nothing of it.`;
    entries.push({ kind: "test lines", text: `### Test lines naming \`${file}\` or its exports (code lines only)\n\n\`\`\`\n${tests.join("\n")}\n\`\`\`\n${note}` });
  }
  if (!entries.length) return { text: "", sections: [] };
  let text = `\n## Lookups found for \`${file}\` (a head start: read whatever else a claim you keep or write depends on)`;
  const cut = [];
  for (const e of entries) {
    if (text.length + e.text.length + 2 <= cap) { text += "\n\n" + e.text; continue; }
    const room = cap - text.length - 200;
    if (room > 500) {
      let part = e.text.slice(0, room).replace(/\n[^\n]*$/, "") + "\n[…]";
      if ((part.match(/```/g) ?? []).length % 2) part += "\n```";
      text += "\n\n" + part;
    }
    cut.push(e.kind);
  }
  if (cut.length) text += `\n\nTruncated at ${cap} characters: part or all of the ${[...new Set(cut)].join(", ")}. Look up the rest if a decision needs it.`;
  return { text, sections };
}

// A split pass sees its own code window, not the whole file: the import block,
// every export line, and the lines around each of its blocks, merged, with the
// file's line numbers kept.
const WIN_ABOVE = 30, WIN_BELOW = 40;
function windowView(view, blocks) {
  const lines = view.replace(/\n$/, "").split("\n");
  const src = lines.map((l) => l.slice(l.indexOf("| ") + 2));
  let head = 0, open = false;
  for (let i = 0; i < src.length; i++) {
    const l = src[i].trim();
    if (open) { if (/\bfrom\s*["']/.test(l)) open = false; head = i + 1; continue; }
    if (/^import\b/.test(l)) { open = !/\bfrom\s*["']|^import\s*["']/.test(l); head = i + 1; continue; }
    if (!l || /^(\/\/|\/\*|\*|["']use [\w ]+["'];?$)/.test(l)) continue;
    break;
  }
  const ranges = head ? [[1, head]] : [];
  src.forEach((l, i) => { if (/^export\b/.test(l)) ranges.push([i + 1, i + 1]); });
  for (const b of blocks) ranges.push([Math.max(1, b.line - WIN_ABOVE), Math.min(lines.length, b.anchorLine + WIN_BELOW)]);
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) { const m = merged.at(-1); if (m && r[0] <= m[1] + 3) m[1] = Math.max(m[1], r[1]); else merged.push([...r]); }
  const out = [];
  let at = 1;
  for (const [a, b] of merged) {
    if (a > at) out.push(`⋮ lines ${at}-${a - 1} not shown`);
    out.push(...lines.slice(a - 1, b));
    at = b + 1;
  }
  if (at <= lines.length) out.push(`⋮ lines ${at}-${lines.length} not shown`);
  return out.join("\n");
}

function buildPack(group, work, only = null) {
  const parts = [`Repository root: ${REPO} (your working directory).`, `\n# Repository conventions\n\n${repoConventions()}`];
  const usedSections = new Set();
  let budgetWords = 3500 + 1500 * (group.files.length - 1);
  for (const f of group.files) {
    const blocks = readJSON(path.join(work, "blocks", f + ".json"));
    if (!blocks.length) continue;
    const docs = group.docs.get(f);
    const mine = only ? blocks.filter((b) => only.get(f)?.has(b.id)) : blocks;
    const view = fs.readFileSync(path.join(work, "view", f + ".txt"), "utf8");
    if (!only) parts.push(`\n# File \`${f}\`\n\n\`\`\`\n${view}\`\`\``);
    else if (mine.length) parts.push(`\n# File \`${f}\`, the parts this pass needs\n\nIts imports, its export lines, and about ${WIN_ABOVE} lines above to ${WIN_BELOW} below each block of this pass. Line numbers and ids are those of the whole file; read a range not shown with \`sed -n 'a,bp' ${f}\`.\n\n\`\`\`\n${windowView(view, mine)}\n\`\`\``);
    if (!mine.length) continue;
    const rows = mine.map((b) => {
      const notes = [];
      if (b.exported) notes.push(`exports ${b.exported}`);
      if (b.importers) notes.push(`imported by ${b.importers} file(s): ${(b.importedBy ?? []).join(", ")}`);
      if (b.why) notes.push(b.why);
      if (b.component) notes.push(`component ${b.component}`);
      if (b.bodyLines) notes.push(`body ${b.bodyLines} lines`);
      if (b.kind === "jsx") notes.push("JSX comment");
      for (const t of b.tags ?? []) notes.push(t);
      for (const p of b.pointers ?? []) {
        const r = resolveAnchor(p.doc, p.anchor);
        notes.push(`pointer ${p.doc} §"${p.anchor}" ${r ? `resolves (${p.doc}:${r.start}-${r.end})` : "does NOT resolve"}`);
      }
      return `| ${b.id} | ${b.line}-${b.endLine} | ${b.anchorLine} | ${b.scope}${b.component ? ", component" : ""} | ${notes.join("; ")} |`;
    });
    parts.push(`\n## Blocks of \`${f}\`${only ? " to judge in this pass (the file's other blocks are judged in parallel passes; their comments are still in the file above, so you can see siblings)" : ""}\n\n| id | comment lines | anchor line | scope | notes |\n| --- | --- | --- | --- | --- |\n${rows.join("\n")}`);
    // the original sentences, by id, for `sentences[].from`
    const multi = mine.map((b) => [b, blockSentences(b)]).filter(([, ss]) => ss.length > 1 || ss.some(isLayoutUnit));
    const listed = (b, x, i) => (isLayoutUnit(x) ? `${b.id} S${i + 1} (table or divider: keep or cut whole, never rewrite):\n${x.split("\n").map((l) => `    ${l}`).join("\n")}` : `${b.id} S${i + 1}: ${x}`);
    if (multi.length) parts.push(`\n## Sentences of \`${f}\` (a block not listed here is one sentence, S1)\n\n${multi.flatMap(([b, ss]) => ss.map((x, i) => listed(b, x, i))).join("\n")}`);
    const look = lookups(f, mine);
    for (const k of look.sections) usedSections.add(k);
    if (look.text) parts.push(look.text);
    // docs: headings of the file's docs
    const heads = [];
    for (const d of docs) {
      const x = docIndex(d);
      if (!x) continue;
      heads.push(...x.heads.filter((h) => h.level >= 2 && h.level <= 4).map((h) => `${d}:${h.start}-${h.end}  ${"#".repeat(h.level)} ${h.title}`));
    }
    parts.push(`\n## Docs for \`${f}\`: headings (line ranges)\n\n${heads.join("\n") || "(no doc matched)"}`);
    // sections: pointer targets, doc lines naming the file, paragraphs sharing
    // identifiers. A word found in many paragraphs of these docs says nothing.
    const words = new Set(blocks.flatMap((b) => identifiers(b.comment)));
    const sel = [];
    const base = path.basename(f);
    const paras = docs.flatMap((d) => { const x = docIndex(d); return x ? x.paras.map((p) => ({ doc: d, ...p, text: x.lines.slice(p.start - 1, p.end).join("\n") })) : []; });
    const df = new Map([...words].map((w) => [w, paras.filter((p) => p.text.includes(w)).length]));
    const weight = (w) => Math.log((paras.length + 1) / (1 + df.get(w)));
    const rare = [...words].filter((w) => df.get(w) > 0 && df.get(w) <= Math.max(3, paras.length * 0.02));
    for (const p of paras) {
      if (p.end - p.start > 40) continue;
      const hits = rare.filter((w) => p.text.includes(w));
      let score = hits.reduce((n, w) => n + weight(w), 0);
      if (p.text.includes(base)) { score += 8; hits.push(base); }
      if (score >= 4) sel.push({ doc: p.doc, start: p.start, end: p.end, why: `mentions ${hits.slice(0, 4).join(", ")}`, score });
    }
    sel.sort((a, b) => b.score - a.score);
    const chosen = [];
    for (const s of sel) {
      const key = `${s.doc}:${s.start}`;
      if (usedSections.has(key)) continue;
      const text = sectionText(s.doc, s);
      const n = text.split(/\s+/).length;
      if (n > budgetWords && chosen.length) continue;
      budgetWords -= n;
      usedSections.add(key);
      const h = docIndex(s.doc).headingAt(s.start);
      chosen.push(`### ${s.doc}:${s.start}-${s.end}${h ? `  (under "${h.title}")` : ""}, ${s.why}\n\n${text}`);
      if (budgetWords <= 0) break;
    }
    if (chosen.length) parts.push(`\n## Doc text likely to matter for \`${f}\`\n\n${chosen.join("\n\n")}`);
    const decl = relatedDeclarations(f, words);
    if (decl.length) parts.push(`\n## Declarations the comments of \`${f}\` name\n\n\`\`\`\n${decl.join("\n\n")}\n\`\`\``);
  }
  parts.push(`\nJudge every block listed in the block table${group.files.length === 1 ? "" : "s"} and answer with the JSON the schema asks for.`);
  return parts.join("\n");
}

// ---------------------------------------------------------------- agents
function claudeArgs({ system, schema, model, effort, tools = true, resume, maxTurns }) {
  const args = ["-p", "--model", model, "--output-format", "stream-json", "--verbose",
    "--json-schema", JSON.stringify(schema), "--setting-sources", "local", "--strict-mcp-config",
    "--disable-slash-commands", "--permission-mode", "dontAsk", "--max-budget-usd", BUDGET];
  if (!resume) args.push("--system-prompt", system);
  if (tools) args.push("--tools", "Bash", "--allowedTools", ...READ_ONLY);
  else args.push("--tools", "");
  if (effort) args.push("--effort", effort);
  if (resume) args.push("--resume", resume);
  if (maxTurns) args.push("--max-turns", String(maxTurns));
  return args;
}
function runClaude({ prompt, logFile, ...o }) {
  const args = claudeArgs(o);
  return new Promise((resolve) => {
    const out = fs.openSync(logFile, "w"), err = fs.openSync(logFile.replace(/\.jsonl$/, ".err"), "w");
    const t0 = Date.now();
    const child = spawn(CLAUDE, args, { cwd: REPO, stdio: ["pipe", out, err] });
    child.stdin.end(prompt);
    child.on("close", (code) => {
      fs.closeSync(out); fs.closeSync(err);
      const lines = fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean);
      let result = null;
      for (const l of lines) { try { const j = JSON.parse(l); if (j.type === "result") result = j; } catch {} }
      const u = result?.usage ?? {};
      resolve({
        code, ms: Date.now() - t0, result, subtype: result?.subtype ?? null, structured: result?.structured_output ?? null,
        cost: result?.total_cost_usd ?? 0, turns: result?.num_turns ?? 0, session: result?.session_id,
        usage: { input: u.input_tokens ?? 0, cache_write: u.cache_creation_input_tokens ?? 0, cache_read: u.cache_read_input_tokens ?? 0, output: u.output_tokens ?? 0, thinking: u.output_tokens_details?.thinking_tokens ?? 0 },
        modelUsage: result?.modelUsage ?? {},
      });
    });
  });
}

// ---------------------------------------------------------------- after the judge
// The judge decides per original sentence: keep (word for word), cut, rewrite
// (with why) or add. An old-style answer (`text` lines, block-level `tests`) is
// aligned to the original sentences, so saved runs replay the same way.
// Entry: { from: [sentence index], action, text, why, facts: [fact index], tests, original }.
const REWRITE_WHY = ["wrong", "history", "untranslated"];
function decisionsOf(a, orig, blk, verdict, problems) {
  let entries;
  if (Array.isArray(a.sentences)) {
    entries = [];
    const used = new Set();
    for (const d of a.sentences) {
      const from = [...new Set((d.from ?? []).map((x) => +String(x).trim().replace(/^S/i, "") - 1))].filter((i) => Number.isInteger(i) && i >= 0 && i < orig.length && !used.has(i)).sort((x, y) => x - y);
      from.forEach((i) => used.add(i));
      let action = String(d.action ?? "").toLowerCase();
      let text = stripMarkers(d.text);
      const original = from.map((i) => orig[i]).join(" ");
      if (action === "keep") { if (!from.length) continue; text = original; }
      else if (action === "cut") text = "";
      else if (action === "rewrite" || action === "add") {
        if (!text) { if (!from.length) continue; action = "cut"; }
        else if (!from.length) action = "add";
        else if (sameWords(text, original)) { action = "keep"; text = original; }
        else action = "rewrite";
      } else continue;
      entries.push({ from, action, text, why: String(d.why_rewrite ?? ""), facts: (d.facts ?? []).map((n) => n - 1).filter((n) => n >= 0), tests: [...(d.tests ?? [])], original, ...(typeof d.pitfall === "string" ? { pitfall: d.pitfall.trim() } : {}) });
    }
    // A sentence the judge left undecided is cut: the default.
    const missing = orig.map((_, i) => i).filter((i) => !used.has(i));
    if (missing.length && verdict !== "CUT") {
      problems.push(`${blk.id}: judge left ${missing.map((i) => `S${i + 1}`).join(", ")} undecided; cut`);
      for (const i of missing) {
        const at = entries.findIndex((e) => e.from.length && Math.min(...e.from) > i);
        const e = { from: [i], action: "cut", text: "", why: "", facts: [], tests: [], original: orig[i] };
        if (at < 0) entries.push(e); else entries.splice(at, 0, e);
      }
    }
  } else {
    entries = alignLines((a.text ?? []).map((l) => stripMarkers(l)), orig);
    // originals no line uses are cut; listed, so the counters see them
    const usedOld = new Set(entries.flatMap((e) => e.from));
    for (const i of orig.map((_, i) => i).filter((i) => !usedOld.has(i))) entries.push({ from: [i], action: "cut", text: "", why: "", facts: [], tests: [], original: orig[i] });
    const tests = (a.tests ?? []).map((t) => String(t).trim().replace(/^`|`$/g, ""));
    const target = entries.filter((e) => e.action !== "ref").at(-1);
    if (target) target.tests.push(...tests);
    else if (tests.length) entries.push({ from: [], action: "ref", text: "", why: "", facts: [], tests, original: "" });
  }
  // Facts the judge did not map (old-style answers): by shared words.
  const facts = a.facts ?? [];
  facts.forEach((f, k) => {
    if (entries.some((e) => e.facts.includes(k))) return;
    const idx = sentencesOfFact(f.fact, orig);
    for (const e of entries) if (e.from.some((i) => idx.includes(i))) e.facts.push(k);
  });
  // A rewrite only shortens or corrects: another reason, or more words than the
  // original (translations aside), puts the original words back.
  const words = (t) => (String(t).match(/\S+/g) ?? []).length;
  for (const e of entries) {
    if (e.action !== "rewrite") continue;
    const why = e.from.some((i) => isLayoutUnit(orig[i])) ? "table or divider" : !REWRITE_WHY.includes(e.why) ? "rewrite reason" : e.why !== "untranslated" && words(e.text) > words(e.original) ? "expanded" : "";
    if (why) { e.action = "keep"; e.text = e.original; e.reverted = why; }
  }
  // Default cut: a kept or rewritten sentence needs a pitfall, what breaks
  // silently without it. An answer with no pitfall field (older runs) maps its
  // scores: a silent failure (C 2) or a protected fact that is not findable (F 0).
  const cut = [];
  for (const e of entries) {
    if (!["keep", "rewrite"].includes(e.action)) continue;
    if (e.pitfall === undefined) {
      const f = e.facts.map((k) => facts[k]).find((x) => x && (x.C === 2 || x.protected) && !(x.F >= 1));
      e.pitfall = f ? `older answer: ${f.C === 2 ? "C 2" : "protected"}, not findable` : "";
    }
    if (!e.pitfall) { e.action = "cut"; e.text = ""; e.nopitfall = true; cut.push(...e.from.map((i) => `S${i + 1}`)); }
  }
  if (cut.length && Array.isArray(a.sentences)) problems.push(`${blk.id}: ${cut.join(", ")} kept without a pitfall; cut`);
  // A kept sentence that opens by referring back ("it", "both", "those", …) needs
  // the sentence it refers to: when that one was cut, its original words come back
  // with the kept sentence's pitfall, else the kept text cannot be followed.
  const REFERS = /^\s*(?:it|its|this|that|these|those|they|them|both|such|either|neither|otherwise|the (?:same|former|latter))\b/i;
  const back = [];
  for (let changed = true; changed;) {
    changed = false;
    for (const e of entries) {
      // a restored antecedent that opens lowercase is a split-off fragment: its start comes back too
      const needs = REFERS.test(e.text) || (e.antecedent && /^\s*[a-z]/.test(e.text));
      if (!["keep", "rewrite"].includes(e.action) || !e.from.length || !needs) continue;
      const i = Math.min(...e.from) - 1;
      let prev = entries.find((x) => x.from.includes(i));
      if (!prev || prev.action !== "cut") continue;
      // only the one sentence right before comes back; the rest of a grouped cut stays cut
      if (prev.from.length > 1) {
        prev.from = prev.from.filter((k) => k !== i);
        prev.original = prev.from.map((k) => orig[k]).join(" ");
        prev = { from: [i], action: "cut", text: "", why: "", facts: [], tests: [], original: orig[i] };
        entries.splice(entries.indexOf(e), 0, prev);
      }
      Object.assign(prev, { action: "keep", text: prev.original, pitfall: `antecedent of ${e.from.map((k) => `S${k + 1}`).join(", ")}: ${e.pitfall}`, antecedent: true });
      delete prev.nopitfall;
      back.push(`S${i + 1}`);
      changed = true;
      break;   // entries changed: rescan
    }
  }
  if (back.length) problems.push(`${blk.id}: ${back.join(", ")} kept as the antecedent of a kept sentence`);
  return entries;
}

// The written lines of a block: its kept sentences. Tests are evidence for the
// verifier only; no "Pinned by" line is ever written.
const assemble = (entries) => entries.flatMap((e) => (e.action === "cut" || !e.text ? [] : [e.text]));

// 2d: a sentence claiming something is documented, an exception or a rule, or
// naming a doc. A named section must exist and name the sentence's key terms;
// a claim naming no section cannot be checked here. The evidence is what a
// checker needs: the section text, the closest paragraphs, or "no such section".
const DOCREF = new RegExp(String.raw`\`?((?:${SEG}\/)*${SEG}\.mdx?)\`?(?:\s*§\s*"([^"]+)"|\s*§\s*([\w.-]+)|#([\w-]+))?`, "g");
const findDoc = (name) => (fs.existsSync(name) ? name : MD.find((d) => d.endsWith("/" + name)) ?? null);
const docsForCache = new Map();
const fileDocs = (file) => {
  if (!docsForCache.has(file)) docsForCache.set(file, [...new Set([...(fs.existsSync(file) ? docsFor(file) : []), ...ruleGlobs.filter((r) => r.globs.some((g) => g.test(file))).map((r) => r.doc)])]);
  return docsForCache.get(file);
};
const parasOf = (doc) => { const x = docIndex(doc); return x ? x.paras.map((p) => ({ doc, ...p, text: x.lines.slice(p.start - 1, p.end).join("\n") })) : []; };
const cap = (t, n = 900) => (t.length > n ? t.slice(0, n) + " […]" : t);
function checkDocClaim(sentence, file) {
  if (!DOC_CLAIM.test(sentence)) return null;
  const terms = keyTerms(sentence);
  const need = Math.min(2, terms.length);
  const hitsIn = (t) => terms.filter((w) => t.toLowerCase().includes(w.toLowerCase()));
  for (const m of sentence.matchAll(DOCREF)) {
    const doc = findDoc(m[1]);
    if (!doc) return { ok: false, why: `names ${m[1]}, which does not exist`, evidence: `no such doc: ${m[1]}` };
    const anchor = m[2] ?? m[3] ?? m[4];
    if (anchor) {
      let r = resolveAnchor(doc, anchor);
      if (!r && /^\d+$/.test(anchor)) r = docIndex(doc)?.headingAt(+anchor) ?? null;
      if (!r) return { ok: false, why: `${doc} has no section "${anchor}"`, evidence: `no such section: ${doc} §${anchor}` };
      const text = sectionText(doc, r, 40);
      const h = hitsIn(text);
      return h.length >= need ? { ok: true } : { ok: false, why: `${doc} §"${r.title}" does not name ${terms.filter((w) => !h.includes(w)).slice(0, 4).join(", ")}`, evidence: `${doc}:${r.start}-${r.end}\n${text}` };
    }
    const best = parasOf(doc).map((p) => ({ p, h: hitsIn(p.text) })).sort((a, b) => b.h.length - a.h.length)[0];
    if (best && best.h.length >= need) return { ok: true };
    return { ok: false, why: `${doc} has no paragraph naming ${terms.slice(0, 4).join(", ")}`, evidence: best ? `${doc}:${best.p.start}-${best.p.end}\n${cap(best.p.text)}` : `nothing found in ${doc}` };
  }
  // The rule files that load for this file decide what is "documented"; their
  // best paragraph always comes first, then the best of the other docs (two
  // when no rule file has one).
  const claimWords = [...new Set((sentence.toLowerCase().match(/\b(documented|exception|rule)/g) ?? []))];
  const rules = new Set(ruleGlobs.filter((r) => r.globs.some((g) => g.test(file))).map((r) => r.doc));
  const scored = fileDocs(file).flatMap(parasOf).filter((p) => p.end - p.start <= 30)
    .map((p) => ({ p, n: hitsIn(p.text).length + claimWords.filter((w) => p.text.toLowerCase().includes(w)).length })).filter((x) => x.n >= 2).sort((a, b) => b.n - a.n);
  const fromRules = scored.filter((x) => rules.has(x.p.doc)).slice(0, 1);
  const pick = [...fromRules, ...scored.filter((x) => !rules.has(x.p.doc)).slice(0, 2 - fromRules.length)];
  const label = (x) => `${x.p.doc}:${x.p.start}-${x.p.end}${rules.has(x.p.doc) ? " (rule file for this path)" : ""}${docIndex(x.p.doc)?.headingAt(x.p.start) ? ` under "${docIndex(x.p.doc).headingAt(x.p.start).title}"` : ""}`;
  return { ok: false, why: "names no doc section", evidence: pick.length ? pick.map((x) => `${label(x)}\n${cap(x.p.text)}`).join("\n\n") : "no paragraph of this file's docs names these terms" };
}

// The deterministic checks of one block's entries (2b-2e). Each written
// sentence gets `risk` (why a checker must see it) and `evidence`.
function checkEntries(file, blk, entries, facts, findings) {
  for (const e of entries) {
    e.risk = []; e.evidence = {};
    if (e.action === "cut" || e.action === "ref") continue;
    // 2e: a fact whose only source is the comment is kept word for word, never rewritten
    const bare = e.facts.map((k) => facts[k]).filter((f) => f && ["KEEP", "KEEP?"].includes(f.flag) && unsourced(f.source, file, blk));
    if (bare.length) {
      if (e.action === "rewrite" && !["history", "untranslated"].includes(e.why)) { e.action = "keep"; e.text = e.original; e.reverted = "unsourced"; }
      e.risk.push({ kind: "unsourced", detail: bare.map((f) => f.fact).join("; ") });
    }
    // 2c: qualifiers, numbers and examples a rewrite lost or added
    if (e.action === "rewrite") {
      const d = qualifierDiff(e.original, e.text);
      if (d.lost.length || d.added.length) e.risk.push({ kind: "qualifier", detail: [d.lost.length ? `lost ${d.lost.join(", ")}` : "", d.added.length ? `added ${d.added.join(", ")}` : ""].filter(Boolean).join("; ") });
    }
    // rewritten, security words, numbers
    e.risk.push(...sentenceRisk(e));
    // 2d: doc claims
    const dc = e.text && checkDocClaim(e.text, file);
    if (dc && !dc.ok) { e.risk.push({ kind: "doc", detail: dc.why }); e.evidence.doc = dc.evidence; }
    // 2b: a test the judge names is evidence for the verifier, never a line in
    // the comment. It counts when it imports the file and an assertion or call
    // names the sentence; a test that catches the break makes it no silent pitfall.
    for (const t of e.tests) {
      const tp = String(t).trim().replace(/^`|`$/g, "");
      if (!tp || e.evidence.tests?.[tp] || e.evidence.testsRejected?.[tp]) continue;
      const c = checkPin(tp, file, e.text || e.original || blk.comment, blk);
      if (!c.ok) { (e.evidence.testsRejected ??= {})[tp] = c.why; continue; }
      (e.evidence.tests ??= {})[tp] = c.lines;
      e.risk.push({ kind: "tested", detail: tp });
    }
  }
}

function toAnswers(file, fileOut, blocks, problems) {
  const byId = new Map((fileOut?.blocks ?? []).map((b) => [b.id, b]));
  const rows = [];
  const seenPointer = new Map();
  const extraFindings = [];
  for (const blk of blocks) {
    const a = byId.get(blk.id);
    if (!a) { problems.push(`${blk.id}: judge gave no answer; original words kept as KEEP?`); rows.push({ id: blk.id, verdict: "KEEP?", text: [blk.comment], route: "COMMENT", source: "", fallback: true }); continue; }
    let verdict = String(a.verdict).toUpperCase();
    const orig = blockSentences(blk);
    const facts = a.facts ?? [];
    const entries = decisionsOf(a, orig, blk, verdict, problems);
    let pointer = (a.pointer ?? "").trim();
    let pointerRisk = null;
    // A pointer only to a place that is hard to find and critical to a change;
    // the judge says why, or it is dropped. The same holds for a reference line.
    const pointerWhy = { hard: String(a.pointer_hard ?? "").trim(), critical: String(a.pointer_critical ?? "").trim() };
    const pointerEarned = Boolean(pointerWhy.hard && pointerWhy.critical);
    if (pointer && !pointerEarned) { problems.push(`${blk.id}: pointer with no hard-to-find and critical reason; dropped: ${pointer}`); pointer = ""; }
    for (const e of entries.filter((x) => x.action === "ref")) if (!pointerEarned) { problems.push(`${blk.id}: reference line with no hard-to-find and critical reason; dropped: ${e.text}`); entries.splice(entries.indexOf(e), 1); }
    if (pointer && !parsePointer(pointer) && CODEREF.test(pointer.replace(/^See\s+/, "")) && fs.existsSync(pointer.replace(/^See\s+/, "").match(CODEREF)[1])) {
      // a test or code path in the pointer field: keep it as a reference line
      entries.push({ from: [], action: "ref", text: `See ${pointer.replace(/^See\s+/, "").match(CODEREF)[1]}.`, why: "", facts: [], tests: [], original: "" });
      pointer = "";
    }
    if (pointer) {
      const p = parsePointer(pointer);
      const r = p && resolveAnchor(p.doc, p.anchor);
      if (!p || !r) {
        problems.push(`${blk.id}: pointer does not resolve: ${pointer}`);
        extraFindings.push({ id: blk.id, category: "dead-ref", status: "open", line: blk.anchorLine, claim: pointer, why: "the judge's pointer names no heading or bold lead-in of that doc", done: "Pointer left out.", if_wrong: `Add the pointer: See ${pointer}` });
        pointer = "";
      } else {
        pointer = pointerText(p, r);
        if (seenPointer.has(pointer)) { problems.push(`${blk.id}: pointer already serves ${seenPointer.get(pointer)}: ${pointer}`); pointer = ""; }
        else seenPointer.set(pointer, blk.id);
        // a pointer the original did not have claims its section states the fact
        const had = r && (blk.pointers ?? []).some((q) => q.doc === p.doc && resolveAnchor(q.doc, q.anchor)?.start === r.start);
        if (pointer && r && !had) pointerRisk = { evidence: `${p.doc}:${r.start}-${r.end}\n${sectionText(p.doc, r, 40)}`, why: pointerWhy };
      }
    }
    // No additions: a sentence with no original is never written. It becomes a
    // missing-doc finding for a human.
    for (const e of entries.filter((x) => x.action === "add")) {
      extraFindings.push({ id: blk.id, category: "missing-doc", status: "open", line: blk.anchorLine, claim: e.text, why: "the judge wanted to add this sentence; the cleanup adds nothing", done: "Nothing written.", if_wrong: `Add the sentence by hand if it names a silent pitfall: ${e.text}` });
      entries.splice(entries.indexOf(e), 1);
    }
    // A kept sentence of the original whose pointer does not resolve is cut.
    for (const e of entries) {
      if (!["keep", "rewrite"].includes(e.action)) continue;
      const dead = (blk.pointers ?? []).filter((q) => !q.ok && (e.text || e.original).includes(q.doc));
      if (!dead.length) continue;
      extraFindings.push({ id: blk.id, category: "dead-ref", status: "acted", line: blk.anchorLine, claim: e.text || e.original, why: `names ${dead.map((q) => `${q.doc}${q.anchor ? ` §"${q.anchor}"` : ""}`).join(", ")}, which does not resolve (${dead[0].why ?? "not found"})`, done: "Sentence cut.", if_wrong: `Repoint it and put it back: ${e.original}` });
      e.action = "cut"; e.text = ""; e.deadref = true;
    }
    if (verdict === "CUT") for (const e of entries) e.action = "cut";
    checkEntries(file, blk, entries, facts, extraFindings);
    // A sentence kept on the comment's word alone makes the block KEEP?.
    const bare = entries.filter((e) => e.action !== "cut" && e.risk.some((r) => r.kind === "unsourced"));
    let unsourcedKeep = false;
    if (bare.length && verdict === "KEEP") {
      verdict = "KEEP?"; unsourcedKeep = true;
      for (const e of bare) extraFindings.push({ id: blk.id, key: `${blk.id}.${entries.indexOf(e) + 1}`, category: "unsure", status: "acted", line: blk.anchorLine, claim: e.text, why: "no source other than the comment itself", done: "Kept word for word as KEEP?.", if_wrong: "Cut or correct the sentence." });
    }
    let text = assemble(entries);
    if (["KEEP", "KEEP?"].includes(verdict) && !text.length && !pointer) {
      // Kept, but no sentence survived and there is nowhere to point: cut.
      problems.push(`${blk.id}: judged ${verdict} but no sentence kept; cut`);
      verdict = "CUT";
    }
    if (verdict === "CUT") { text = []; pointer = ""; }
    const sentences = entries.map((e, n) => ({ key: `${blk.id}.${n + 1}`, from: e.from.map((i) => `S${i + 1}`), action: e.action, why: e.why, original: e.original, text: e.text, pitfall: e.pitfall ?? "", facts: e.facts.map((k) => k + 1), risk: e.risk ?? [], evidence: e.evidence ?? {}, ...(e.reverted ? { reverted: e.reverted } : {}), ...(e.nopitfall ? { nopitfall: true } : {}) }));
    rows.push({ id: blk.id, verdict, text, route: pointer ? "DOC" : "COMMENT", source: pointer, sentences,
      ...(pointer && pointerRisk ? { pointerRisk } : {}), ...(unsourcedKeep ? { unsourcedKeep } : {}) });
  }
  return { rows, extraFindings };
}

const run = (args, opts = {}) => {
  try { return { code: 0, out: execFileSync("node", args, { encoding: "utf8", cwd: REPO, stdio: ["ignore", "pipe", "pipe"], ...opts }) }; }
  catch (e) { return { code: e.status ?? 1, out: (e.stdout ?? "") + (e.stderr ?? "") }; }
};

// The verifier checks every kept sentence (there should be few): true, a real
// pitfall, not stated elsewhere. Also every new pointer, and removed blocks that
// held a protected fact. Per item: the original words, the sentence, its
// pitfall, the script's notes and evidence; per file the code around those
// blocks as written now, numbered.
const WIN = 40;
function riskItems(rows, blocks, facts) {
  const items = [];
  for (const row of rows) {
    const b = blocks.get(row.id);
    if (!b) continue;
    for (const s of row.sentences ?? []) {
      if (s.action === "cut" || s.action === "ref" || !s.text) continue;
      items.push({ key: s.key, kind: "sentence", row, s, b });
    }
    if (row.pointerRisk && row.source) items.push({ key: `${row.id} pointer`, kind: "pointer", row, b });
    const all = facts?.get(row.id) ?? [];
    const costly = all.filter((x) => x.protected || (x.C === 2 && !(x.F >= 1)));
    if (row.verdict === "CUT" && costly.length) items.push({ key: `${row.id} removed`, kind: "removed", row, b, costly, costlyNums: new Set(costly.map((x) => all.indexOf(x) + 1)) });
  }
  return items;
}
function numbered(cur, ranges) {
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) { const m = merged.at(-1); if (m && r[0] <= m[1] + 3) m[1] = Math.max(m[1], r[1]); else merged.push([...r]); }
  const w = String(cur.length).length, out = [];
  let at = 1;
  for (const [a, b] of merged) {
    if (a > at) out.push(`⋮ lines ${at}-${a - 1} not shown`);
    for (let i = a; i <= b; i++) out.push(`${String(i).padStart(w)} | ${cur[i - 1]}`);
    at = b + 1;
  }
  if (at <= cur.length) out.push(`⋮ lines ${at}-${cur.length} not shown`);
  return out.join("\n");
}
function verifyPack(group, work, answers, factsOf, { usePlaced = true, blocksOf = null } = {}) {
  const parts = [`Repository root: ${REPO} (your working directory).`];
  const files = [], items = new Map();
  for (const f of group.files) {
    const a = answers.get(f);
    if (!a) continue;
    const blocks = new Map((blocksOf?.get(f) ?? readJSON(path.join(work, "blocks", f + ".json"))).map((b) => [b.id, b]));
    const placedFile = path.join(work ?? "", "placed", f + ".json");
    const placed = usePlaced && work && fs.existsSync(placedFile) ? readJSON(placedFile) : {};
    const list = riskItems(a.rows, blocks, factsOf.get(f));
    if (!list.length) continue;
    files.push(f);
    const cur = fs.readFileSync(f, "utf8").split("\n");
    const where = (it) => {
      const p = placed[it.row.id];
      if (p) return { start: p.start, end: p.end, anchor: p.end + 1 };
      if (!usePlaced) return { start: it.b.line, end: it.b.endLine, anchor: it.b.anchorLine }; // the file is the original
      const i = cur.findIndex((l) => l.trim() === it.b.anchor);
      return i >= 0 ? { start: i + 1, end: i, anchor: i + 1 } : { start: it.b.line, end: it.b.line - 1, anchor: it.b.anchorLine };
    };
    const ranges = list.map((it) => { const w = where(it); return [Math.max(1, w.start - WIN), Math.min(cur.length, w.anchor + WIN)]; });
    parts.push(`\n# File \`${f}\`: the code around the checked blocks, as written now\n\n\`\`\`\n${numbered(cur, ranges)}\n\`\`\``);
    parts.push(`\n## Items of \`${f}\``);
    const factList = (row) => (factsOf.get(f)?.get(row.id) ?? []);
    for (const it of list) {
      items.set(`${f}\u0000${it.key}`, { file: f, ...it });
      const w = where(it);
      const at = it.row.verdict === "CUT" ? `block ${it.b.id}, was above line ${w.anchor}` : `block ${it.b.id}, now lines ${w.start}-${w.end} above line ${w.anchor}`;
      const L = [`### ${it.key}`, `(${at}; scope ${it.b.scope}${it.b.exported ? `, exports ${it.b.exported}` : ""})`];
      if (it.kind === "sentence") {
        L.push(`Original: "${it.s.original}"`, `Now: "${it.s.text}"`);
        L.push(`Pitfall (the writer's): ${it.s.pitfall || "none given"}`);
        L.push(`Script notes: ${it.s.risk.map((r) => `${r.kind}${r.detail ? ` (${r.detail})` : ""}`).join("; ") || "none"}`);
        const src = (it.s.facts ?? []).map((n) => factList(it.row)[n - 1]).filter(Boolean).map((x) => `${x.fact} (source: ${x.source || "none"})`);
        if (src.length) L.push(`The writer's facts and sources: ${src.join("; ")}`);
        if (it.s.evidence?.doc) L.push(`Doc evidence:\n\n${it.s.evidence.doc}`);
        for (const [t, lines] of Object.entries(it.s.evidence?.tests ?? {})) L.push(`Test ${t} (imports the file; if it fails when the pitfall is triggered, the break is not silent): import and assertion lines naming it:\n\n\`\`\`\n${lines.join("\n")}\n\`\`\``);
        for (const [t, why] of Object.entries(it.s.evidence?.testsRejected ?? {})) L.push(`Test ${t} named by the writer does not count: ${why}.`);
      } else if (it.kind === "pointer") {
        L.push(`Original: "${it.b.comment}"`, `Now: ${it.row.text.join(" ") || "(no text)"}`, `Pointer: See ${it.row.source}`, ...(it.row.pointerRisk.why ? [`The writer says it is hard to find: ${it.row.pointerRisk.why.hard || "-"}; critical to a change: ${it.row.pointerRisk.why.critical || "-"}`] : []), `Question: does this section state the fact the block leaves to it, and is it hard to find and critical to a change here?`, `Section:\n\n${it.row.pointerRisk.evidence}`);
      } else {
        L.push(`Original words: ${it.b.comment}`, `Facts the writer marked protected: ${it.costly.map((x) => `${x.fact} (flag ${x.flag})`).join("; ")}`, "Question: does its loss cause silent or late harm that no kept text states?");
      }
      parts.push(L.join("\n"));
    }
  }
  parts.push("\nAnswer every item above by its key with the JSON the schema asks for.");
  return files.length ? { text: parts.join("\n"), files, items } : null;
}

// The verifier's answers onto the rows. WRONG, NO-PITFALL or ELSEWHERE: the
// sentence is cut (WRONG with an open finding carrying the correction; the
// verifier's wording is never written). UNSURE or no answer: the original
// words, KEEP?. A dropped pointer leaves the block cut when nothing else is
// kept. OK on a sentence kept on the comment's word lifts the KEEP? that
// caused. Returns the files whose rows changed.
function applyVerify(pack, structured, findingsOf) {
  const got = new Map();
  for (const vf of structured?.files ?? []) for (const vi of vf.items ?? []) got.set(`${vf.path}\u0000${String(vi.key).trim()}`, vi);
  const changed = new Set(), touched = new Map();
  for (const [k, it] of pack.items) {
    const v = got.get(k) ?? { status: "UNSURE", correction: "", evidence: "", note: "no answer from the verifier" };
    const { file: f, row, s } = it;
    const fnd = findingsOf.get(f);
    const note = [v.note, v.evidence && `(${v.evidence})`].filter(Boolean).join(" ") || v.status;
    row.verify = [...(row.verify ?? []), { key: it.key, status: v.status, note }];
    touched.set(row, f);
    if (v.status === "OK") { if (s && it.kind === "sentence") s.verified = true; continue; }
    changed.add(f);
    if (it.kind === "sentence") {
      const was = s.text;
      if (v.status === "WRONG") {
        s.action = "cut"; s.cutBy = "WRONG";
        fnd.push({ id: row.id, category: "wrong-info", status: "open", line: 0, claim: was, why: `Verifier: ${note}`, done: "Sentence cut.", if_wrong: v.correction && !/^restore/i.test(v.correction) ? `If the fact is a silent pitfall, write it correctly: ${v.correction}` : `Put back: ${was}` });
      } else if (v.status === "NO-PITFALL" || v.status === "ELSEWHERE") {
        s.action = "cut"; s.cutBy = v.status;
      } else {
        if (s.action === "rewrite") { s.action = "keep"; s.text = s.original; s.restored = "unsure"; }
        if (row.verdict !== "CUT") row.verdict = "KEEP?";
        if (!fnd.some((x) => x.key === s.key)) fnd.push({ id: row.id, key: s.key, category: "unsure", status: "acted", line: 0, claim: s.text, why: `Verifier unsure: ${note}`, done: "Original words kept as KEEP?.", if_wrong: "Cut or correct the sentence." });
      }
    } else if (it.kind === "pointer") {
      fnd.push({ id: row.id, category: "dead-ref", status: "open", line: 0, claim: `See ${row.source}`, why: `Verifier ${v.status}: ${note}`, done: "Pointer left out.", if_wrong: `Add the pointer: See ${row.source}` });
      row.source = ""; row.route = "COMMENT";
    } else if (it.kind === "removed") {
      // the original sentences of the costly facts come back word for word
      let back = 0;
      for (const x of row.sentences ?? []) if (x.from.length && x.facts.some((n) => it.costlyNums.has(n))) { x.action = "keep"; x.text = x.original; back++; }
      if (!back) for (const x of row.sentences ?? []) if (x.from.length) { x.action = "keep"; x.text = x.original; back++; }
      row.verdict = v.status === "RESTORE" ? "KEEP" : "KEEP?";
      row.text = back ? assemble(row.sentences) : [it.b.comment];
      fnd.push({ id: row.id, category: v.status === "RESTORE" ? "wrong-info" : "unsure", status: "acted", line: 0, claim: "block restored by the verifier", why: note, done: "Original sentences of the costly facts put back.", if_wrong: "Cut the block again." });
      continue;
    }
  }
  for (const [row, f] of touched) {
    if (row.unsourcedKeep && (row.sentences ?? []).filter((x) => x.action !== "cut" && x.risk?.some((r) => r.kind === "unsourced")).every((x) => x.verified)) {
      row.verdict = "KEEP"; row.unsourcedKeep = false;
      findingsOf.set(f, findingsOf.get(f).filter((x) => !(x.key && x.key.startsWith(row.id + ".") && /comment itself/.test(x.why))));
      changed.add(f);
    }
    if (row.verdict !== "CUT" && row.sentences) {
      row.text = assemble(row.sentences);
      if (!row.text.length && !row.source) { row.verdict = "CUT"; row.text = []; }
    }
  }
  return changed;
}
// The verifier hit its turn cap or failed: the judge's result stands, one note per file.
const noVerifyFinding = (v) => ({ category: "unsure", status: "open", line: 0, claim: "The verifier gave no answer.",
  why: `verify ended without an answer (${v.subtype ?? `exit ${v.code}`}, ${v.turns} turns)`, done: "Every kept sentence went back to its original words as KEEP?; unconfirmed pointers were left out.", if_wrong: "Check the written blocks by hand or rerun the file." });

// Per file: sentences kept (each with its pitfall), sentences cut, and findings
// that propose an executable form (a test, a type, a named constant).
const EXECUTABLE = ["missing-test", "weak-type", "named-constant"];
function counters(rows, blocks, findings) {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  let kept = 0, cut = 0;
  for (const r of rows) {
    if (!r.sentences) { const n = byId.has(r.id) ? blockSentences(byId.get(r.id)).length : 1; if (r.verdict === "CUT") cut += n; else kept += n; continue; }
    for (const x of r.sentences) {
      if (!x.from?.length) continue;
      if (r.verdict !== "CUT" && x.action !== "cut" && x.text) kept += 1; else cut += x.from.length;
    }
  }
  return { kept, cut, executable: findings.filter((x) => EXECUTABLE.includes(x.category)).length };
}

// v1's final message, so keep_result, the placer and the reporter need no change
function report(f, work, { status, before, after, facts, rows, findings, docfixes, problems, blocks, costs }) {
  const placedFile = path.join(work, "placed", f + ".json");
  const placed = fs.existsSync(placedFile) ? readJSON(placedFile) : {};
  const cur = fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n") : [];
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const lineNow = (fnd) => {
    if (fnd.id && placed[fnd.id]) return placed[fnd.id].start;
    const b = fnd.id ? byId.get(fnd.id) : blocks.find((x) => x.line <= fnd.line && fnd.line <= x.anchorLine);
    if (b) { const i = cur.findIndex((l) => l.trim() === b.anchor); if (i >= 0) return i + 1; }
    return fnd.line ?? 0;
  };
  const n = counters(rows, blocks, findings);
  const out = [`STATUS ${status}`, `COMMENT_LINES ${before} -> ${after}`, `KEPT ${n.kept} (pitfalls)`, `CUT ${n.cut}`, `FINDINGS executable ${n.executable}`, `FACTS ${facts.length}`];
  out.push("HANDBACK 0"); // the cleanup hands no doc sentences back; the line stays for readers of the format
  const one = (x) => ["wrong-info", "missing-doc", "dead-ref", "doc-drift", "weak-type"].includes(x.category) && x.status === "acted" && !x.why;
  for (const x of findings) {
    out.push(`FINDING ${x.category} ${x.status} ${f}:${lineNow(x)}`);
    if (!one(x)) for (const [k, v] of [["Claim", x.claim], ["Why unclear", x.why], ["Done", x.done], ["If wrong", x.if_wrong]]) out.push(`  ${k}: ${String(v || "-").replace(/\s*\n\s*/g, " ")}`);
  }
  for (const x of docfixes) out.push(`DOCFIX_BLOCK ${x.doc} § ${x.heading}`, `old: ${x.old}`, `new: ${x.new}`, "END_DOCFIX_BLOCK");
  for (const p of problems) out.push(`PROBLEM ${p}`);
  const flags = {};
  for (const x of facts) flags[x.flag] = (flags[x.flag] ?? 0) + 1;
  out.push("", `Report for ${f} (comment-cleanup).`,
    `Blocks ${blocks.length}: ${rows.filter((r) => r.verdict === "CUT").length} cut, ${rows.filter((r) => r.verdict === "KEEP").length} kept, ${rows.filter((r) => r.verdict === "KEEP?").length} KEEP?, ${rows.filter((r) => r.route === "DOC").length} with a pointer.`,
    `Sentences: ${n.kept} kept, each with its pitfall; ${n.cut} cut. Findings proposing an executable form: ${n.executable}.`,
    `Facts ${facts.length}: ${Object.entries(flags).map(([k, v]) => `${k} ${v}`).join(", ")}.`,
    `Cost: ${costs.map((c) => `${c.step} $${c.cost.toFixed(3)}`).join(", ")}.`);
  const text = out.join("\n") + "\n";
  fs.writeFileSync(path.join(work, `report-${slugOf(f)}.md`), text);
  return text;
}

// ---------------------------------------------------------------- one group
// Items in order, cut into as many parts as `max` items per part needs, with
// the heaviest part as light as it can be: the smallest weight cap at which a
// greedy fill still needs no more parts.
function balancedParts(items, weight, max) {
  if (!items.length) return [];
  const k = Math.ceil(items.length / max);
  const fill = (cap) => {
    const parts = [[]];
    let w = 0;
    for (const x of items) {
      const cur = parts.at(-1);
      if (cur.length && (cur.length >= max || w + weight(x) > cap)) { parts.push([]); w = 0; }
      parts.at(-1).push(x); w += weight(x);
    }
    return parts;
  };
  let lo = Math.max(...items.map(weight)), hi = items.reduce((n, x) => n + weight(x), 0);
  while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (fill(mid).length <= k) hi = mid; else lo = mid + 1; }
  return fill(lo);
}

const judgeSystem = fs.readFileSync(path.join(SKILL, "steps", "judge.md"), "utf8");
const verifySystem = fs.readFileSync(path.join(SKILL, "steps", "verify.md"), "utf8");
const judgeSchema = readJSON(path.join(SKILL, "schemas", "judge.json"));
const verifySchema = readJSON(path.join(SKILL, "schemas", "verify.json"));

async function runGroup(group) {
  const work = path.join(WORK, group.slug);
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  fs.writeFileSync(path.join(work, "files.txt"), group.files.join("\n") + "\n");
  const allDocs = [...new Set(group.files.flatMap((f) => group.docs.get(f)))];
  const prep = run([CC2, "prepare", path.join(work, "files.txt"), work, ...allDocs]);
  const costs = [];
  const results = [];
  if (prep.code === 3) {
    for (const f of group.files) results.push({ file: f, status: "ok no-comments", blocks: 0, cost: 0 });
    return results;
  }
  if (prep.code !== 0) { for (const f of group.files) results.push({ file: f, status: `failed prepare exit ${prep.code}`, cost: 0 }); return results; }
  const blocksOf = new Map(group.files.map((f) => [f, readJSON(path.join(work, "blocks", f + ".json"))]));
  const prompt = buildPack(group, work);
  fs.writeFileSync(path.join(work, "prompt-judge.md"), prompt);

  // judge: one call, or parallel parts of at most CHUNK blocks for a big file,
  // balanced by comment lines so the parts take about as long as each other
  const allIds = group.files.flatMap((f) => blocksOf.get(f).map((b) => [f, b.id]));
  const linesOf = new Map(group.files.flatMap((f) => blocksOf.get(f).map((b) => [`${f} ${b.id}`, b.endLine - b.line + 1])));
  const partLines = (list) => list.reduce((n, [f, id]) => n + linesOf.get(`${f} ${id}`), 0);
  const parts = balancedParts(allIds, ([f, id]) => linesOf.get(`${f} ${id}`), CHUNK);
  const onlyOf = (list) => { const m = new Map(); for (const [f, id] of list) { if (!m.has(f)) m.set(f, new Set()); m.get(f).add(id); } return m; };
  if (DRY) {
    if (parts.length > 1) parts.forEach((list, k) => fs.writeFileSync(path.join(work, `prompt-judge${k}.md`), buildPack(group, work, onlyOf(list))));
    const split = parts.map((l) => ({ blocks: l.length, lines: partLines(l) }));
    if (parts.length > 1) log(`${group.slug}: ${parts.length} judge parts (blocks/lines): ${split.map((x) => `${x.blocks}/${x.lines}`).join(", ")}`);
    // how much a verifier would see if every sentence were kept word for word
    for (const f of group.files) {
      const ss = blocksOf.get(f).flatMap((b) => blockSentences(b));
      const risky = ss.filter((x) => sentenceRisk({ action: "keep", text: x }).length || checkDocClaim(x, f)?.ok === false).length;
      results.push({ file: f, status: "dry", blocks: blocksOf.get(f).length, sentences: ss.length, riskyIfKept: risky, promptChars: prompt.length, parts: split });
    }
    return results;
  }
  const merged = new Map(group.files.map((f) => [f, { path: f, blocks: [], findings: [], docfixes: [] }]));
  const absorb = (st) => {
    for (const fo of st?.files ?? []) {
      const m = merged.get(fo.path); if (!m) continue;
      const have = new Set(m.blocks.map((b) => b.id));
      m.blocks.push(...(fo.blocks ?? []).filter((b) => !have.has(b.id)));
      m.findings.push(...(fo.findings ?? [])); m.docfixes.push(...(fo.docfixes ?? []));
    }
  };
  const runPart = async (list, k, step) => {
    const pr = parts.length > 1 || step !== "judge" ? buildPack(group, work, onlyOf(list)) : prompt;
    fs.writeFileSync(path.join(work, `prompt-${step}${k}.md`), pr);
    const r = await runClaude({ system: judgeSystem, prompt: pr, schema: judgeSchema, model: MODEL, effort: EFFORT, logFile: path.join(work, `${step}${k}.jsonl`) });
    costs.push({ step: parts.length > 1 ? `${step}${k}` : step, cost: r.cost, turns: r.turns, ms: r.ms, usage: r.usage, model: MODEL });
    absorb(r.structured);
    return r;
  };
  await Promise.all(parts.map((list, k) => runPart(list, k, "judge")));
  const missingIds = () => allIds.filter(([f, id]) => !merged.get(f).blocks.some((b) => b.id === id));
  if (missingIds().length) await runPart(missingIds(), 0, "judge-missing");
  let gap = missingIds().map(([f, id]) => `${f} ${id}`);
  let j = { structured: { files: [...merged.values()] } };
  writeJSON(path.join(work, "judge.json"), j.structured ?? {});

  // answers, apply
  const answers = new Map(), factsOf = new Map(), findingsOf = new Map(), docfixOf = new Map(), problemsOf = new Map();
  for (const f of group.files) {
    const fo = (j.structured?.files ?? []).find((x) => x.path === f);
    const problems = [];
    const { rows, extraFindings } = toAnswers(f, fo, blocksOf.get(f), problems);
    answers.set(f, { rows });
    writeJSON(path.join(work, "answers", f + ".json"), { rows });
    factsOf.set(f, new Map((fo?.blocks ?? []).map((b) => [b.id, b.facts ?? []])));
    findingsOf.set(f, [...(fo?.findings ?? []), ...extraFindings]);
    docfixOf.set(f, fo?.docfixes ?? []);
    problemsOf.set(f, problems);
  }
  const ap = run([CC2, "apply", work]);
  if (ap.code) for (const l of ap.out.split("\n").filter((l) => /^A\d+:|parse would break|no comment syntax/.test(l))) problemsOf.get(group.files[0]).push(`apply: ${l}`);

  // verify: only when something is risky; no answer counts as UNSURE
  if (VERIFY) {
    const vp = verifyPack(group, work, answers, factsOf);
    if (vp) {
      fs.writeFileSync(path.join(work, "prompt-verify.md"), vp.text);
      const v = await runClaude({ system: verifySystem, prompt: vp.text, schema: verifySchema, model: VMODEL, effort: VEFFORT, maxTurns: VTURNS, logFile: path.join(work, "verify.jsonl") });
      costs.push({ step: "verify", cost: v.cost, turns: v.turns, ms: v.ms, usage: v.usage, model: VMODEL, items: vp.items.size });
      writeJSON(path.join(work, "verify.json"), v.structured ?? {});
      if (!v.structured) for (const f of vp.files) findingsOf.get(f).push(noVerifyFinding(v));
      const changed = applyVerify(vp, v.structured, findingsOf);
      for (const f of group.files) if (answers.has(f)) writeJSON(path.join(work, "answers", f + ".json"), answers.get(f));
      if (changed.size) {
        const ap2 = run([CC2, "apply", work]);
        if (ap2.code) problemsOf.get(group.files[0]).push(`apply after verify: ${ap2.out.split("\n").slice(1, 4).join(" / ")}`);
      }
    }
  }

  // finish
  const fin = run([CC2, "finish", path.join(work, "files.txt"), work]);
  const bad = fin.code ? fin.out : "";
  const total = costs.reduce((s, c) => s + c.cost, 0);
  const lines = new Map(group.files.map((f) => [f, blocksOf.get(f).reduce((n, b) => n + b.endLine - b.line + 1, 0)]));
  const sumLines = [...lines.values()].reduce((a, b) => a + b, 0) || 1;
  for (const f of group.files) {
    const share = lines.get(f) / sumLines;
    const fileCosts = costs.map((c) => ({ ...c, cost: c.cost * share }));
    let status = gap.length === allIds.length ? "failed no judge answer" : "ok";
    if (bad.includes(f)) {
      status = "failed finish";
      fs.copyFileSync(path.join(work, "pre", f), f); // never leave a code change behind
    }
    const facts = [...(factsOf.get(f)?.values() ?? [])].flat();
    const before = blocksOf.get(f).reduce((n, b) => n + b.endLine - b.line + 1, 0);
    const placed = fs.existsSync(path.join(work, "placed", f + ".json")) ? readJSON(path.join(work, "placed", f + ".json")) : {};
    const after = Object.values(placed).reduce((n, p) => n + p.end - p.start + 1, 0);
    report(f, work, { status, before, after, facts, rows: answers.get(f)?.rows ?? [], findings: findingsOf.get(f) ?? [], docfixes: docfixOf.get(f) ?? [], problems: problemsOf.get(f) ?? [], blocks: blocksOf.get(f), costs: fileCosts });
    const n = counters(answers.get(f)?.rows ?? [], blocksOf.get(f), findingsOf.get(f) ?? []);
    results.push({ file: f, group: group.slug, status, blocks: blocksOf.get(f).length, lines_before: before, lines_after: after, kept: n.kept, cut: n.cut, executable: n.executable, cost: total * share, group_cost: total, steps: costs.map((c) => ({ step: c.step, cost: +c.cost.toFixed(4), turns: c.turns, s: Math.round(c.ms / 1000) })) });
  }
  for (const c of costs) appendLine(path.join(WORK, "costs.jsonl"), { group: group.slug, files: group.files, ...c });
  return results;
}

// ---------------------------------------------------------------- batch
async function main() {
  const files = fs.readFileSync(LIST, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
  const scanWork = path.join(WORK, "_scan");
  fs.rmSync(scanWork, { recursive: true, force: true });
  fs.mkdirSync(scanWork, { recursive: true });
  fs.writeFileSync(path.join(scanWork, "files.txt"), files.join("\n") + "\n");
  run([CC2, "prepare", path.join(scanWork, "files.txt"), scanWork]);
  const stats = new Map(fs.readFileSync(path.join(scanWork, "prepare.tsv"), "utf8").split("\n").slice(1).filter(Boolean).map((l) => { const [f, b, n] = l.split("\t"); return [f, { blocks: +b, lines: +n }]; }));
  const docs = new Map(files.map((f) => [f, docsFor(f)]));

  // small files of one folder share a judge and a verifier
  const groups = [];
  const open = new Map();
  for (const f of files) {
    const s = stats.get(f) ?? { blocks: 0, lines: 0 };
    if (s.blocks === 0) { groups.push({ files: [f] }); continue; }
    if (s.lines > SMALL_LINES) { groups.push({ files: [f] }); continue; }
    const dir = path.dirname(f);
    let g = open.get(dir);
    if (!g || g.files.length >= GROUP_FILES || g.blocks + s.blocks > GROUP_BLOCKS) { g = { files: [], blocks: 0 }; groups.push(g); open.set(dir, g); }
    g.files.push(f); g.blocks += s.blocks;
  }
  for (const g of groups) { g.slug = slugOf(g.files[0]) + (g.files.length > 1 ? `+${g.files.length - 1}` : ""); g.docs = new Map(g.files.map((f) => [f, docs.get(f)])); }
  log(`${files.length} file(s) in ${groups.length} group(s), ${JOBS} at a time; model ${MODEL}, verify ${VERIFY ? VMODEL : "off"}${DRY ? ", dry run" : ""}`);

  const queue = [...groups];
  const all = [];
  async function worker() {
    while (queue.length) {
      const g = queue.shift();
      const t0 = Date.now();
      try {
        const r = await runGroup(g);
        for (const x of r) { all.push(x); appendLine(path.join(WORK, "results.jsonl"), { ...x, s: Math.round((Date.now() - t0) / 1000) }); }
        log(`${g.slug}: ${r.map((x) => `${x.status}${x.cost ? ` $${x.cost.toFixed(3)}` : ""}`).join(", ")} (${Math.round((Date.now() - t0) / 1000)} s)`);
      } catch (e) {
        log(`${g.slug}: crashed: ${e.stack}`);
        for (const f of g.files) { const pre = path.join(WORK, g.slug, "pre", f); if (fs.existsSync(pre)) fs.copyFileSync(pre, f); all.push({ file: f, status: "failed crash" }); }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, JOBS) }, worker));
  const cost = all.reduce((s, x) => s + (x.cost ?? 0), 0);
  log(`done: ${all.filter((x) => x.status?.startsWith("ok")).length} ok, ${all.filter((x) => x.status?.startsWith("failed")).length} failed, $${cost.toFixed(2)} total`);
}

export { docIndex, assemble, counters, report, decisionsOf, checkEntries, checkDocClaim, riskItems, applyVerify, windowView, lookups, testMentions, buildPack, verifyPack, claudeArgs, noVerifyFinding, VTURNS, toAnswers, parsePointer, resolveAnchor, repoConventions, trackedCode, stemCount, balancedParts, POINTER, CODEREF, JOBS };
if (MAIN) await main();
