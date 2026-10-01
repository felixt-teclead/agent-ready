// Deterministic checks of what the judge and the verifier write: original
// sentences and the alignment of written lines to them, comment markers,
// qualifier diffs, doc claims, sources, and whether a test pins a sentence.
// No agent, no writes; repository files are read relative to the working directory.

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------- words
const STOP = new Set("this that with from when then they there their which where while what have been only must never also each into over under same other because before after during about above below those these than cannot could would should does done make made uses used using value values data type types true false null undefined return returns string number boolean array object props state error errors result results".split(" "));
// Code-like names in prose: backticked text, camelCase, PascalCase with a second
// capital, snake_case, SCREAMING_CASE.
export function identifiers(text) {
  const out = new Set();
  for (const m of String(text ?? "").matchAll(/`([^`]{3,60})`/g)) out.add(m[1].replace(/\(\)$/, ""));
  for (const m of String(text ?? "").matchAll(/\b([a-z]+[A-Z][A-Za-z0-9]*|[A-Z][a-z0-9]+[A-Z][A-Za-z0-9]*|[a-z]+(?:_[a-z0-9]+)+|[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g)) out.add(m[1]);
  return [...out].filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase()));
}
const SMALL = new Set("the and for are but not you all any can her was one our out his has had how its may new now see two who did get let put say she too use via per into onto than then them this that with from when will just only also some such each most more very what which while where there these those have been were they your".split(" "));
// Content words of a sentence, for alignment: lower case, three letters or more.
export const tokens = (s) => new Set((String(s ?? "").toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) ?? []).filter((w) => !SMALL.has(w)));
export const overlap = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n; };
export const sameWords = (a, b) => { const n = (s) => String(s ?? "").replace(/\s+/g, " ").replace(/[\s.]+$/, "").trim(); return n(a) === n(b); };

// ---------------------------------------------------------------- sentences
// The original comment (markers already stripped, lines joined) in sentences.
// A boundary is . ! or ? (closing quotes and brackets included) followed by
// white space and a capital, digit, quote, bracket or backtick; or white space
// before a JSDoc tag. Common abbreviations do not end a sentence.
const ABBR = /(?:^|[\s(])(?:e\.g|i\.e|etc|vs|cf|approx|incl|resp|z\.B|d\.h|bzw|ca|Nr|Abs|Art)\.$/i;
const TAG = /^@(?:param|returns?|throws|example|see|deprecated|remarks|typedef|type|template|default)\b/;
export function splitSentences(text) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!s) return [];
  const out = [];
  let start = 0;
  const re = /[.!?]["')\]]*(?=\s)|(?=\s@\w)/g;
  let m;
  while ((m = re.exec(s))) {
    if (!m[0]) re.lastIndex = m.index + 1; // a zero-width match must not stall the loop
    const end = m.index + m[0].length;
    if (end <= start) continue;
    const rest = s.slice(end).trimStart();
    const piece = s.slice(start, end);
    const tagNext = TAG.test(rest);
    if (!tagNext && (!m[0] || !/^["'`(\[*¿¡\p{Lu}\p{N}]/u.test(rest) || ABBR.test(piece))) continue;
    if (piece.trim()) out.push(piece.trim());
    start = end;
  }
  if (s.slice(start).trim()) out.push(s.slice(start).trim());
  return out;
}

// ---------------------------------------------------------------- alignment
// A written line (an old-style answer's `text`, or any free text) against the
// original sentences: which ones it keeps word for word, which it rewrites.
// Returns entries in the written order; originals no line uses are cut.
export function alignLines(lines, orig) {
  const entries = [];
  const used = new Set();
  const toks = orig.map(tokens);
  for (const raw of lines) {
    const text = String(raw ?? "").trim();
    if (!text) continue;
    const pin = text.match(/^Pinned by (\S+?)\.?$/);
    if (pin) { const last = entries.at(-1); if (last) last.tests.push(pin[1]); else entries.push({ from: [], action: "ref", text, why: "", facts: [], tests: [] }); continue; }
    if (/^See\s/.test(text)) { entries.push({ from: [], action: "ref", text, why: "", facts: [], tests: [] }); continue; }
    // a line of a table or divider unit stands for the whole unit, kept as written
    const unit = orig.findIndex((o) => o.includes("\n") && o.split("\n").some((x) => sameWords(x.trim(), text)));
    if (unit >= 0) { if (!used.has(unit)) { used.add(unit); entries.push({ from: [unit], action: "keep", text: orig[unit], why: "", facts: [], tests: [] }); } continue; }
    const exact = orig.findIndex((o, i) => !used.has(i) && sameWords(o, text));
    if (exact >= 0) { used.add(exact); entries.push({ from: [exact], action: "keep", text: orig[exact], why: "", facts: [], tests: [] }); continue; }
    const t = tokens(text);
    const scored = orig.map((_, i) => ({ i, n: overlap(t, toks[i]), share: toks[i].size ? overlap(t, toks[i]) / toks[i].size : 0 })).filter((x) => !used.has(x.i) && x.n > 0);
    const best = scored.sort((a, b) => b.n - a.n)[0];
    const from = best ? scored.filter((x) => x.i === best.i || (x.n >= 2 && x.share >= 0.3)).map((x) => x.i).sort((a, b) => a - b) : [];
    from.forEach((i) => used.add(i));
    entries.push({ from, action: from.length ? "rewrite" : "add", text, why: "", facts: [], tests: [] });
  }
  for (const e of entries) e.original = e.from.map((i) => orig[i]).join(" ");
  return entries;
}

// The original sentences a fact came from: the ones sharing most of its words.
export function sentencesOfFact(fact, orig) {
  const t = tokens(fact);
  const scored = orig.map((o, i) => ({ i, n: overlap(t, tokens(o)) })).filter((x) => x.n >= 2 || (x.n >= 1 && t.size <= 2));
  if (!scored.length) return [];
  const top = Math.max(...scored.map((x) => x.n));
  return scored.filter((x) => x.n >= Math.max(2, top * 0.6) || x.n === top).map((x) => x.i);
}

// ---------------------------------------------------------------- 2a markers
// A written line carries no comment marker of its own: the script adds them.
// Markers at either end go, and so do stray ones inside the text (`/** /**`,
// `*/`, the `* /` an earlier run made of it), which would garble or close the
// comment. A glob such as src/**/*.ts has no white space around its stars and stays.
const STRAY = /(^|\s)(?:\{\/\*+|\/\*+|\*+\s?\/\}?|\/\/+)(?=\s|[.,;:!?]|$)/g;
export function stripMarkers(line) {
  let s = String(line ?? "").trim(), prev;
  do {
    prev = s;
    s = s.replace(/^(?:\{\/\*+|\/\*+|\/\/+|\*\/\}?|\*+(?=\s|$))\s*/, "").replace(/\s*\*+\/\}?$/, "").trim();
  } while (s !== prev);
  if (STRAY.test(s)) s = s.replace(STRAY, "$1").replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").replace(/([.!?])\.+/g, "$1").trim();
  STRAY.lastIndex = 0;
  return s;
}
// ---------------------------------------------------------------- units
// Tables, box-drawing lines and dividers are one unit each: never split into
// sentences, never rewritten, kept or cut whole. A table is a run of rows: a
// markdown row (| … |), a line with box-drawing characters, or a line whose
// columns are aligned by runs of three or more spaces; an indented line right
// after a row continues the table. A divider is a line
// that opens or ends with three or more of - = _ ~ or a box-drawing rule.
const BOX = /[\u2500-\u259F]/;
const RULE = /^[-=_~\u2500-\u257F]{3,}|[-=_~\u2500-\u257F]{3,}$/;
export const isDivider = (l) => RULE.test(String(l).trim());
export const isTableRow = (l) => { const t = String(l).trim(); return /^\|.*\|$/.test(t) || BOX.test(t) || /\S {3,}\S/.test(t); };
export const isLayoutLine = (l) => String(l ?? "").trim() !== "" && (isDivider(l) || isTableRow(l));
// A unit written as one text of several lines, or one layout line.
export const isLayoutUnit = (u) => String(u ?? "").split("\n").some(isLayoutLine);
const hasWord = (x) => /[\p{L}\p{N}]/u.test(x);
// The original units of a block, in order: prose sentences (a blank line ends
// a paragraph; stray markers removed; a piece with no letter or digit, such as
// a lone "* /.", is none), and tables and dividers as they are written. A block
// without `lines` (saved answers, tests) is split from its joined comment.
export function blockSentences(blk) {
  if (!Array.isArray(blk.lines)) return splitSentences(blk.comment).map(stripMarkers).filter(hasWord);
  const units = [];
  let prose = [], table = [];
  const flush = () => { if (prose.length) units.push(...splitSentences(prose.join(" ")).map(stripMarkers).filter(hasWord)); prose = []; };
  const close = () => { if (table.length) units.push(table.join("\n")); table = []; };
  for (const raw of blk.lines) {
    const l = String(raw).replace(/\s+$/, "");
    if (isLayoutLine(l)) {
      flush();
      if (isDivider(l)) { close(); units.push(l); } else table.push(l);
      continue;
    }
    if (table.length && /^\s{2,}\S/.test(l)) { table.push(l); continue; }
    close();
    if (!l.trim()) flush(); else prose.push(l.trim());
  }
  close(); flush();
  return units;
}

// ---------------------------------------------------------------- 2c qualifiers
export const QUALIFIERS = ["only", "except", "unless", "never", "always", "exactly", "every", "all", "none", "at most", "at least", "defensive", "not"];
const qualRe = (q) => q === "defensive" ? /\bdefensive(?:ly)?\b/g : q === "not" ? /\bnot\b|n't\b|\bcannot\b/g : new RegExp(`\\b${q.replace(" ", "\\s+")}\\b`, "g");
const count = (s, re) => (String(s).toLowerCase().match(re) ?? []).length;
// numbers with their unit, and quoted or backticked examples
export const numbersIn = (s) => new Set((String(s ?? "").match(/(?<![\w.])[-+~]?\d[\d.,_]*(?:\s?(?:px|ms|s|h|min|%|×|x|dp|kb|mb|gb|days?|hours?|minutes?|seconds?))?(?![\w])/gi) ?? []).map((n) => n.replace(/[~+]/g, "").replace(/[.,]$/, "").replace(/\s+/g, "").toLowerCase()));
export const examplesIn = (s) => new Set([...String(s ?? "").matchAll(/"([^"]{1,60})"|`([^`]{1,60})`/g)].map((m) => m[1] ?? m[2]));
// What a rewrite lost or added against the original sentences it replaces.
export function qualifierDiff(original, text) {
  const lost = [], added = [];
  for (const q of QUALIFIERS) {
    const a = count(original, qualRe(q)), b = count(text, qualRe(q));
    if (a > b) lost.push(q); else if (b > a) added.push(q);
  }
  const on = numbersIn(original), nn = numbersIn(text), oe = examplesIn(original), ne = examplesIn(text);
  for (const n of on) if (!nn.has(n)) lost.push(n);
  for (const n of nn) if (!on.has(n)) added.push(n);
  for (const x of oe) if (!ne.has(x) && !String(text).includes(x)) lost.push(`"${x}"`);
  for (const x of ne) if (!oe.has(x) && !String(original).includes(x)) added.push(`"${x}"`);
  return { lost, added };
}

// ---------------------------------------------------------------- 2d doc claims
export const DOC_CLAIM = /\b(?:documented|exceptions?|rules?)\b|§|\bsee\s+\S+\.mdx?\b|\S\.mdx?\b/i;
const DOC_WORDS = new Set(["documented", "exception", "exceptions", "rule", "rules", "see", "doc", "docs"]);
// The words a doc section must name for the claim to be about it.
export function keyTerms(sentence, max = 8) {
  const ids = identifiers(sentence);
  const words = [...tokens(sentence.replace(/\S+\.mdx?\S*/g, " "))].filter((w) => w.length >= 4 && !DOC_WORDS.has(w) && !STOP.has(w) && !/^\d/.test(w));
  return [...new Set([...ids, ...words])].slice(0, max);
}

// ---------------------------------------------------------------- 2e sources
// A fact whose only source is the comment under judgement is not established.
export function unsourced(source, file, blk) {
  const s = String(source ?? "").trim().replace(/[`'"]/g, "").replace(/\.+$/, "").trim();
  if (!s) return true;
  const low = s.toLowerCase();
  if (/^(?:(?:per|from|in|see|the|this|its|original|own|same|block|judged|existing)\s+)*comments?(?:\s+(?:itself|above|text|block|wording|under judgement))?$/.test(low)) return true;
  if (blk && new RegExp(`^(?:block\\s+)?${blk.id}$`, "i").test(s)) return true;
  // the judged file at the block's own lines
  const m = s.match(/^(.+?):(\d+)(?:-(\d+))?$/);
  if (m && blk && m[1] === file) { const a = +m[2], b = +(m[3] ?? m[2]); if (a >= blk.line && b <= blk.endLine) return true; }
  return false;
}

// ---------------------------------------------------------------- 2b pins
// Code lines of a file, comments removed (line and block comments, outside strings).
export function codeLines(text) {
  const out = [];
  let inBlock = false;
  String(text).split("\n").forEach((line, i) => {
    let s = "", q = null;
    for (let k = 0; k < line.length; k++) {
      const c = line[k], d = line[k + 1];
      if (inBlock) { if (c === "*" && d === "/") { inBlock = false; k++; } continue; }
      if (q) { s += c; if (c === "\\") { s += d ?? ""; k++; } else if (c === q) q = null; continue; }
      if (c === "/" && d === "/") break;
      if (c === "/" && d === "*") { inBlock = true; k++; continue; }
      if (c === '"' || c === "'" || c === "`") q = c;
      s += c;
    }
    if (s.trim()) out.push({ n: i + 1, text: s });
  });
  return out;
}

let pathsCache;
function readJsonc(p) {
  const t = fs.readFileSync(p, "utf8").replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, str) => str ?? "").replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(t);
}
// The repository's path aliases: compilerOptions.paths of tsconfig.json or
// jsconfig.json (one `extends` level), relative to baseUrl.
export function aliasPaths() {
  if (pathsCache !== undefined) return pathsCache;
  pathsCache = [];
  for (const f of ["tsconfig.json", "jsconfig.json"]) {
    if (!fs.existsSync(f)) continue;
    try {
      let j = readJsonc(f);
      let co = j.compilerOptions ?? {};
      if (!co.paths && typeof j.extends === "string" && j.extends.startsWith(".")) {
        const base = path.join(path.dirname(f), j.extends.endsWith(".json") ? j.extends : j.extends + ".json");
        if (fs.existsSync(base)) co = { ...(readJsonc(base).compilerOptions ?? {}), ...co };
      }
      const baseUrl = co.baseUrl ?? ".";
      for (const [pat, targets] of Object.entries(co.paths ?? {})) pathsCache.push({ pat, targets: targets.map((t) => path.join(baseUrl, t)) });
    } catch {}
    if (pathsCache.length) break;
  }
  return pathsCache;
}
const EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
// A module specifier to a repository file, or null (a package, or not found).
export function resolveSpec(from, spec) {
  const bases = [];
  if (spec.startsWith(".")) bases.push(path.join(path.dirname(from), spec));
  else for (const { pat, targets } of aliasPaths()) {
    const star = pat.indexOf("*");
    if (star < 0) { if (spec === pat) bases.push(...targets); continue; }
    const pre = pat.slice(0, star), post = pat.slice(star + 1);
    if (spec.startsWith(pre) && spec.endsWith(post) && spec.length >= pre.length + post.length) {
      const mid = spec.slice(pre.length, spec.length - post.length);
      bases.push(...targets.map((t) => t.replace("*", mid)));
    }
  }
  for (const b of bases) for (const e of EXTS) { const c = path.normalize(b + e); if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; }
  return null;
}
// Import statements: specifier, imported names (with local names), line.
export function importsOf(text) {
  const out = [];
  const lineAt = (i) => text.slice(0, i).split("\n").length;
  for (const m of text.matchAll(/(^|\n)[ \t]*import\s+(?:type\s+)?([^'";]*?)\s*from\s*["']([^"']+)["']/g)) {
    const clause = m[2], names = [];
    const brace = clause.match(/\{([^}]*)\}/);
    if (brace) for (const part of brace[1].split(",")) { const [imp, local] = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/); if (imp) names.push({ imported: imp.trim(), local: (local ?? imp).trim() }); }
    const def = clause.replace(/\{[^}]*\}/, "").split(",").map((x) => x.trim()).filter(Boolean);
    for (const d of def) { const ns = d.match(/^\*\s+as\s+(\w+)/); if (ns) names.push({ imported: "*", local: ns[1] }); else if (/^\w+$/.test(d)) names.push({ imported: "default", local: d }); }
    out.push({ spec: m[3], names, line: lineAt(m.index + m[1].length) });
  }
  for (const m of text.matchAll(/\b(?:import|require|(?:vi|jest)\.(?:mock|doMock|importActual|requireActual))\(\s*["']([^"']+)["']/g)) out.push({ spec: m[1], names: [], line: lineAt(m.index) });
  return out;
}
// Names a module exports.
export function exportsOf(file) {
  const out = new Set();
  let t;
  try { t = fs.readFileSync(file, "utf8"); } catch { return out; }
  for (const m of t.matchAll(/^\s*export\s+(?:declare\s+)?(?:default\s+)?(?:async\s+)?(?:abstract\s+)?(?:function\*?|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm)) out.add(m[1]);
  for (const m of t.matchAll(/^\s*export\s+(?:type\s+)?\{([^}]*)\}/gm)) for (const p of m[1].split(",")) { const n = p.trim().split(/\s+as\s+/).pop()?.trim(); if (n) out.add(n); }
  if (/^\s*export\s+default\b/m.test(t)) out.add("default");
  return out;
}
const COMMON_EXPORT = new Set(["default", "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "config", "metadata", "handler", "runtime", "dynamic"]);
export const ASSERT = /\b(?:expect|assert\w*)\s*[(.]|\.(?:to[A-Z]\w*|should\w*)\b|\bt\.(?:is|not|deepEqual|true|false|truthy|falsy|throws\w*|regex|like|snapshot)\s*\(|\.(?:rejects|resolves)\b/;
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Does `test` pin `sentence` of `file`? It must import the file (a relative
// import, a path alias, or a module re-exporting it) or a name the file
// exports, and an assertion line or a call must name an identifier of the
// sentence or the block's export. Comment lines do not count.
export function checkPin(test, file, sentence, blk = {}) {
  if (!fs.existsSync(test)) return { ok: false, why: `${test} does not exist` };
  const text = fs.readFileSync(test, "utf8");
  const src = text.split("\n");
  const exp = exportsOf(file);
  const imps = importsOf(text).map((i) => ({ ...i, target: resolveSpec(test, i.spec) }));
  const reexports = (mod) => { try { return [...fs.readFileSync(mod, "utf8").matchAll(/^\s*export\s+(?:\*(?:\s+as\s+\w+)?|(?:type\s+)?\{[^}]*\})\s*from\s*["']([^"']+)["']/gm)].some((m) => resolveSpec(mod, m[1]) === file); } catch { return false; } };
  const direct = imps.filter((i) => i.target && (i.target === file || reexports(i.target)));
  const byName = imps.filter((i) => i.target && !direct.includes(i) && i.names.some((n) => exp.has(n.imported) && !COMMON_EXPORT.has(n.imported)));
  if (!direct.length && !byName.length) return { ok: false, why: `${test} imports neither ${file} nor a name it exports` };
  const local = [...direct.flatMap((i) => i.names.map((n) => n.local)), ...byName.flatMap((i) => i.names.filter((n) => exp.has(n.imported)).map((n) => n.local))];
  const exported = blk.exported && blk.exported !== "default" ? blk.exported.split(/,\s*/) : [];
  const ids = new Set([...identifiers(sentence), ...exported]);
  // a block that exports nothing (a body or private block): what the test takes from the file
  if (!exported.length) for (const n of local) ids.add(n);
  if (!ids.size) return { ok: false, why: `nothing in ${test} names an identifier of the sentence` };
  const idRe = new RegExp(`\\b(?:${[...ids].map(esc).join("|")})\\b`);
  const callRe = new RegExp(`(?:\\b(?:${[...ids].map(esc).join("|")})\\s*(?:<[^>]*>)?\\(|(?:^|[\\s({>])<(?:${[...ids].map(esc).join("|")})\\b)`);
  const code = codeLines(text);
  const hits = code.filter((l) => (ASSERT.test(l.text) && idRe.test(l.text)) || callRe.test(l.text));
  if (!hits.length) return { ok: false, why: `${test} imports the file, but no assertion or call names ${[...ids].slice(0, 5).join(", ")}` };
  // the test titles above the hits, for whoever checks the pin
  // the lines closest to the sentence first
  const st = tokens(sentence);
  hits.sort((a, b) => overlap(st, tokens(b.text)) - overlap(st, tokens(a.text)) || a.n - b.n);
  const titles = new Set();
  for (const h of hits.slice(0, 6)) for (let k = h.n - 1; k >= 0 && k >= h.n - 40; k--) if (/\b(?:it|test|describe)(?:\.\w+)?\s*\(\s*["'`]/.test(src[k])) { titles.add(k + 1); break; }
  const lines = [...new Set([...[...direct, ...byName].map((i) => i.line), ...titles, ...hits.slice(0, 8).map((h) => h.n)])].sort((a, b) => a - b);
  return { ok: true, lines: lines.map((n) => `${test}:${n}: ${src[n - 1].trim().slice(0, 200)}`) };
}
// Does the test import the file at all (for the judge's test lookup)?
export const importsFile = (test, file) => { try { return importsOf(fs.readFileSync(test, "utf8")).some((i) => resolveSpec(test, i.spec) === file); } catch { return false; } };

// ---------------------------------------------------------------- 3 risk
// Words that make a sentence worth a check even when kept word for word.
export const SECURITY = /\b(?:auth\w*|RLS|row[- ]level|polic(?:y|ies)|permissions?|privileg\w*|service[- ]role|roles?|admins?|bypass\w*|secrets?|credentials?|tenants?|access|csrf|xss|injection|saniti[sz]\w*|escap(?:e|es|ed|ing))\b/i;
// Rule 4: what will not stay true: a ticket, pull request or date, and a
// measured value (a number with a unit of size, time, share or count).
const UNSTABLE = [
  [/\b[A-Z][A-Z0-9]{1,9}-\d{1,6}\b/g, "ticket"],
  [/\b(?:PR|MR)\s*#?\d+|(?<![\w&])#\d{2,6}\b/g, "pull request"],
  [/\b(?:19|20)\d\d-[01]\d-[0-3]\d\b/g, "date"],
  [/(?<![\w.])[~≈]?\d+(?:[.,]\d+)?\s?(?:px|rem|em|vh|vw|ms|s|sec|seconds?|min|minutes?|h|hours?|days?|weeks?|%|×|kb|mb|gb|rows?|items?|chars?|characters?|lines?)(?![\w])/gi, "measured"],
];
export function unstableIn(text) {
  const out = [];
  for (const [re, kind] of UNSTABLE) for (const m of String(text ?? "").matchAll(re)) out.push(`${kind}: ${m[0].trim()}`);
  return [...new Set(out)];
}
// Why a written sentence goes to the checker, beyond the deterministic checks.
export function sentenceRisk(e) {
  const out = [];
  if (e.action === "rewrite") out.push({ kind: "rewritten", detail: e.why || "no reason given" });
  const sec = String(e.text).match(SECURITY);
  if (sec) out.push({ kind: "security", detail: sec[0] });
  const nums = [...numbersIn(e.text)];
  if (nums.length) out.push({ kind: "number", detail: nums.slice(0, 4).join(", ") });
  const unstable = unstableIn(e.text);
  if (unstable.length) out.push({ kind: "unstable", detail: unstable.slice(0, 4).join(", ") });
  return out;
}
