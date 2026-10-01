#!/usr/bin/env node
// Mechanics of comment-cleanup v2. Every step that needs no judgement runs here,
// so an agent only judges and never shuttles files, tables or commands.
//
//   cc2.mjs prepare <file-list> <work> [doc ...]
//       Per file: pre/ copy, blocks/<path>.json (one comment block per anchor,
//       numbered A1…, with scope, export, importer and pointer facts), view/<path>.txt
//       (the file with line numbers and block ids). Exit 3 when no file has comments.
//   cc2.mjs apply <work> [<path> ...]
//       Writes each file from pre/ + answers/<path>.json: every judged comment out,
//       every kept block in, above its anchor. Records placed/<path>.json.
//   cc2.mjs finish <file-list> <work>
//       Code identical to HEAD once comments are stripped, markers intact, no CUT
//       block still commented. Exit 1 on any difference.
//
// cwd = the repository root: `typescript` loads from its node_modules.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isLayoutLine } from "./checks.mjs";

const ts = createRequire(path.join(process.cwd(), "package.json"))("typescript");

// ---------------------------------------------------------------- comments
// Same keep rules as strip-comments.mjs, plus the placeholder `apply` inserts.
const KEEP_DIRECTIVE =
  /^(eslint|@ts-|ts-|prettier|c8\b|v8\b|istanbul|@jsx|@license|@preserve|#region|#endregion|@vitest|webpack|@__PURE__|<reference)/i;
const KEEP_MARKER = /\b(TODO|FIXME|HACK|XXX)\s*[(:]/;
const HOLDER = /@@cc2:(A\d+)@@/;
const KEEP = { test: (s) => KEEP_DIRECTIVE.test(s) || KEEP_MARKER.test(s) || HOLDER.test(s) };

const body = (text, r) =>
  text.slice(r.pos, r.end).replace(/^\/\/+/, "").replace(/^\/\*+/, "").replace(/\*\/$/, "").trim();
const kindOf = (f) =>
  f.endsWith(".tsx") ? ts.ScriptKind.TSX : f.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS;
const parse = (f, text) => ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, kindOf(f));
const lineStart = (t, p) => { let i = p; while (i > 0 && t[i - 1] !== "\n") i--; return i; };
const lineEnd = (t, p) => { let i = p; while (i < t.length && t[i] !== "\n") i++; return i; };
const blank = (s) => /^[ \t]*$/.test(s);
// The lines of one comment range, marker removed, inner indentation kept (a
// table or a divider must survive as written); a blank line stays "".
const rawLines = (text, r) => {
  const t = text.slice(r.pos, r.end);
  if (t.startsWith("//")) return [t.replace(/^\/\/+ ?/, "").replace(/\s+$/, "")];
  return t.replace(/^\/\*+ ?/, "").replace(/\*\/$/, "").split("\n")
    .map((l) => (/^\s*\*/.test(l) ? l.replace(/^\s*\*+ ?/, "") : l.trimStart()).replace(/\s+$/, ""));
};
const tidy = (t) => t.replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n");
const errorsOf = (f, t) => parse(f, t).parseDiagnostics.length;

function commentRanges(text, file, sf = parse(file, text)) {
  const seen = new Map();
  const add = (ranges) => {
    for (const r of ranges ?? []) {
      if (seen.has(r.pos)) continue;
      if (r.pos === 0 && text.startsWith("#!")) continue;
      if (KEEP.test(body(text, r))) continue;
      seen.set(r.pos, r);
    }
  };
  const walk = (n) => {
    add(ts.getLeadingCommentRanges(text, n.pos));
    add(ts.getTrailingCommentRanges(text, n.end));
    for (const c of n.getChildren(sf)) walk(c);
  };
  walk(sf);
  const all = [...seen.values()].sort((a, b) => a.pos - b.pos);
  // A marker holds for the whole `//` run it opens (see strip-comments.mjs). Only
  // a range that opens its own line continues a run: a trailing comment does not,
  // and a placeholder opens none.
  const opensRun = (s) => KEEP_DIRECTIVE.test(s) || KEEP_MARKER.test(s);
  const kept = new Set();
  for (const r of all) {
    let p = lineStart(text, r.pos);
    if (!blank(text.slice(p, r.pos)) || !text.startsWith("//", r.pos)) continue;
    while (p > 0) {
      const prev = text.slice(lineStart(text, p - 1), p - 1).trim();
      if (!prev.startsWith("//")) break;
      if (opensRun(prev.replace(/^\/\/+/, "").trim())) { kept.add(r.pos); break; }
      p = lineStart(text, p - 1);
    }
  }
  return all.filter((r) => !kept.has(r.pos));
}

function cutRanges(text, ranges) {
  const cuts = ranges.map((r) => {
    let s = r.pos, e = r.end;
    const ls = lineStart(text, s), le = lineEnd(text, e);
    if (blank(text.slice(ls, s)) && blank(text.slice(e, le))) return [ls, le < text.length ? le + 1 : le];
    while (s > 0 && /[ \t]/.test(text[s - 1])) s--;
    if (blank(text.slice(e, le))) e = le;
    return [s, e];
  });
  let out = text;
  for (let i = cuts.length - 1; i >= 0; i--) out = out.slice(0, cuts[i][0]) + out.slice(cuts[i][1]);
  return out;
}

// `{}` left where a `{/* … */}` was. A container that still holds a comment (a
// marker, a placeholder) stays: v1 dropped those too, and lost the marker.
function dropEmptyJsxExpressions(text, file) {
  const sf = parse(file, text);
  const del = [];
  const walk = (n) => {
    if (ts.isJsxExpression(n) && !n.expression && /^\{\s*\}$/.test(n.getText(sf))) del.push([n.getStart(sf), n.getEnd()]);
    n.forEachChild(walk);
  };
  sf.forEachChild(walk);
  let out = text;
  for (let i = del.length - 1; i >= 0; i--) {
    let [s, e] = del[i];
    const ls = lineStart(out, s), le = lineEnd(out, e);
    if (blank(out.slice(ls, s)) && blank(out.slice(e, le))) [s, e] = [ls, le < out.length ? le + 1 : le];
    out = out.slice(0, s) + out.slice(e);
  }
  return out;
}

function stripCss(text) {
  let out = "", i = 0, q = null;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      out += c;
      if (c === "\\") { out += text[i + 1] ?? ""; i += 2; continue; }
      if (c === q) q = null;
      i++; continue;
    }
    if (c === '"' || c === "'") { q = c; out += c; i++; continue; }
    if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      if (KEEP.test(text.slice(i + 2, stop - 2).trim())) { out += text.slice(i, stop); i = stop; continue; }
      const ls = lineStart(text, i), le = lineEnd(text, stop);
      if (blank(text.slice(ls, i)) && blank(text.slice(stop, le))) {
        out = out.slice(0, out.length - (i - ls));
        i = le < text.length ? le + 1 : le;
      } else {
        if (blank(text.slice(stop, le))) out = out.replace(/[ \t]+$/, "");
        i = stop;
      }
      continue;
    }
    out += c; i++;
  }
  return out;
}

function strip(file, text) {
  if (file.endsWith(".css")) return tidy(stripCss(text));
  let out = cutRanges(text, commentRanges(text, file));
  if (file.endsWith(".tsx")) out = dropEmptyJsxExpressions(out, file);
  return tidy(out);
}

// `//` inside JSX child text or a string/template literal is text the runtime
// keeps, not a comment.
function fakeCommentLines(file, text) {
  const sf = parse(file, text);
  const spans = [];
  const walk = (n) => {
    if (ts.isJsxText(n) || ts.isStringLiteralLike(n) || ts.isTemplateLiteralToken(n)) spans.push([n.getStart(sf), n.getEnd()]);
    for (const c of n.getChildren(sf)) walk(c);
  };
  walk(sf);
  const hits = [];
  let off = 0;
  for (const [i, line] of text.split("\n").entries()) {
    const m = line.match(/^([ \t]*)\/\//);
    const at = off + (m?.[1].length ?? 0);
    if (m && spans.some(([s, e]) => at >= s && at < e)) hits.push(i);
    off += line.length + 1;
  }
  return hits;
}

// ---------------------------------------------------------------- import graph
// Who imports which export: an export no other file imports has no reader at a
// call site, whatever its keyword says.
const SRC_EXT = [".ts", ".tsx", ".js", ".mjs"];
function resolveSpec(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join("src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.join(path.dirname(from), spec);
  else return null;
  for (const c of [base, ...SRC_EXT.map((e) => base + e), ...SRC_EXT.map((e) => path.join(base, "index" + e))])
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return path.normalize(c);
  return null;
}
function listSources(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listSources(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(e.name) && !e.name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}
// Tracked sources, capped as in the driver; null outside git.
function trackedSources(max = 5000) {
  let out;
  try { out = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 }); }
  catch { return null; }
  return out.split("\0").filter((f) => /\.(ts|tsx|mjs|js)$/.test(f) && !f.endsWith(".d.ts") && !/(^|\/)(node_modules\/|\.)/.test(f)).slice(0, max);
}
let graphCache = null;
function importGraph() {
  if (graphCache) return graphCache;
  const g = new Map(); // target -> [{importer, names: Map(exported -> local), star}]
  const files = trackedSources() ?? ["src", "tests"].filter((d) => fs.existsSync(d)).flatMap((d) => listSources(d));
  let bytes = 0;
  for (const f of files) {
    if (bytes > 32 << 20) break;
    let text;
    try { text = fs.readFileSync(f, "utf8"); } catch { continue; }
    if (text.length > 1 << 20) continue; // generated or vendored
    bytes += text.length;
    if (!/\b(import|export)\b/.test(text)) continue;
    const sf = parse(f, text);
    for (const st of sf.statements) {
      const spec = (ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)
        ? st.moduleSpecifier.text : null;
      if (!spec) continue;
      const target = resolveSpec(f, spec);
      if (!target) continue;
      const names = new Map();
      let star = false;
      if (ts.isImportDeclaration(st) && st.importClause) {
        const ic = st.importClause;
        if (ic.name) names.set("default", ic.name.text);
        const nb = ic.namedBindings;
        if (nb && ts.isNamespaceImport(nb)) star = true;
        if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) names.set((el.propertyName ?? el.name).text, el.name.text);
      }
      if (ts.isExportDeclaration(st)) {
        if (!st.exportClause) star = true;
        else if (ts.isNamedExports(st.exportClause)) for (const el of st.exportClause.elements) names.set((el.propertyName ?? el.name).text, el.name.text);
      }
      if (!g.has(target)) g.set(target, []);
      g.get(target).push({ importer: f, names, star });
    }
  }
  graphCache = g;
  return g;
}

// importers of one exported name, and whether every use is a form action
function importersOf(file, name) {
  const out = [];
  let formOnly = true;
  for (const imp of importGraph().get(path.normalize(file)) ?? []) {
    if (!imp.star && !imp.names.has(name)) continue;
    out.push(imp.importer);
    const local = imp.names.get(name) ?? name;
    const text = fs.readFileSync(imp.importer, "utf8");
    const esc = local.replace(/[$]/g, "\\$");
    const uses = [...text.matchAll(new RegExp(`\\b${esc}\\b`, "g"))].length;
    const form = [...text.matchAll(new RegExp(`(?:action|formAction)=\\{${esc}\\}|use(?:Action|Form)State\\(\\s*${esc}\\b`, "g"))].length;
    // one use is the import itself
    if (uses - 1 > form) formOnly = false;
  }
  return { importers: out, formOnly: out.length > 0 && formOnly };
}

// ---------------------------------------------------------------- blocks
// No framework lists: an export that no file imports is private, whoever calls it
// (a router, a framework, a test runner). Its reader has the body.

const TAGS = [
  [/\b[A-Z][A-Z0-9]{1,9}-\d{1,6}\b/g, "ticket"],
  [/\b(?:PR|MR)\s*#?\d+|(?<![\w&])#\d{2,6}\b/g, "pull request"],
  [/\b(?:19|20)\d\d-[01]\d-[0-3]\d\b/g, "date"],
  [/\b(?:review|agreed with|confirmed by|decided|meeting|minuted|the call\b|per ticket|since v?\d)/gi, "provenance"],
  [/\b(?:used to|previously|formerly|originally|no longer|was changed|we (?:chose|switched|moved|added|removed))\b/gi, "history"],
]
function tagsOf(comment) {
  const out = [];
  comment = comment.replace(POINTER, " "); // a date or ticket-like name in a doc path is no tag
  for (const [re, kind] of TAGS) for (const m of comment.matchAll(re)) out.push(`${kind}: ${m[0]}`);
  return [...new Set(out)];
}

// A path segment may be or hold a (group) or [param] folder; brackets must close,
// so a path in parentheses or a markdown link does not take them in. Same in cc2-run.mjs.
const SEG = String.raw`(?:[\w.@-]|\([\w.@-]*\)|\[[\w.@-]*\])+`;
const DOC_PATH = String.raw`(?:${SEG}\/)*${SEG}\.mdx?`;
const POINTER = new RegExp(String.raw`\`?(${DOC_PATH})\`?(?:\s*§\s*"([^"]+)"|#([\w-]+))?`, "g");
// a pointer line as apply writes it: <doc>, <doc> §"<anchor>" or <doc>#<slug>
const POINTER_LINE = new RegExp(String.raw`^${DOC_PATH}(?:\s*§\s*".+"|#[\w-]+)?$`);

function exportInfo(st) {
  const mods = ts.canHaveModifiers(st) ? ts.getModifiers(st) ?? [] : [];
  const exported = mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) || ts.isExportAssignment(st);
  const isDefault = mods.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) || ts.isExportAssignment(st);
  let names = [];
  if (st.name && ts.isIdentifier(st.name)) names = [st.name.text];
  else if (ts.isVariableStatement(st)) names = st.declarationList.declarations.map((d) => d.name.getText());
  return { exported, isDefault, names };
}
const fnOf = (n) => {
  if (ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) return n;
  if (ts.isVariableStatement(n)) {
    const init = n.declarationList.declarations[0]?.initializer;
    if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) return init;
    // forwardRef(function X…), memo(() => …)
    if (init && ts.isCallExpression(init)) return init.arguments.find((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a)) ?? null;
  }
  if (ts.isExportAssignment(n) && n.expression && (ts.isArrowFunction(n.expression) || ts.isFunctionExpression(n.expression))) return n.expression;
  return null;
};
const returnsJsx = (fn) => {
  let hit = false;
  const walk = (n) => { if (hit) return; if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) { hit = true; return; } n.forEachChild(walk); };
  if (fn?.body) walk(fn.body);
  return hit;
};

function scopeOf(file, sf, text, anchorPos) {
  // the outermost node that starts on the anchor's line
  const line = sf.getLineAndCharacterOfPosition(anchorPos).line;
  let best = null;
  const walk = (n) => {
    if (n.kind !== ts.SyntaxKind.SourceFile && sf.getLineAndCharacterOfPosition(n.getStart(sf)).line === line) {
      if (!best) best = n;
      return;
    }
    if (n.getStart(sf) <= anchorPos && anchorPos < n.getEnd()) n.forEachChild(walk);
  };
  sf.forEachChild(walk);
  const out = { scope: "body", node: best ? ts.SyntaxKind[best.kind] : null };
  if (!best) return out;
  const top = best.parent === sf;
  const fn = fnOf(best);
  if (fn?.body) {
    const a = sf.getLineAndCharacterOfPosition(fn.body.getStart(sf)).line, b = sf.getLineAndCharacterOfPosition(fn.body.getEnd()).line;
    out.bodyLines = b - a + 1;
  }
  const name = best.name && ts.isIdentifier(best.name) ? best.name.text
    : ts.isVariableStatement(best) ? best.declarationList.declarations[0]?.name.getText(sf) : null;
  if (fn && name && /^[A-Z]/.test(name) && file.endsWith(".tsx") && returnsJsx(fn)) out.component = name;
  if (!top) return out;
  const ex = exportInfo(best);
  const base = path.basename(file).replace(/\.[^.]+$/, "");
  if (ex.exported) {
    out.exported = ex.isDefault ? "default" : ex.names.join(", ");
    let importers = [];
    for (const n of ex.isDefault ? ["default"] : ex.names) importers.push(...importersOf(file, n).importers);
    importers = [...new Set(importers)];
    out.importers = importers.length;
    if (importers.length) out.importedBy = importers.slice(0, 3);
    if (!importers.length) { out.scope = "private"; out.why = "exported, but no file imports it (the framework or tooling calls it)"; }
    else out.scope = "interface";
  } else if (fn) out.scope = "private";
  return out;
}

function blocksOf(file, text, allDocs) {
  if (file.endsWith(".css")) return [];
  const sf = parse(file, text);
  const ranges = commentRanges(text, file, sf);
  const containers = [];
  const walk = (n) => { if (ts.isJsxExpression(n) && !n.expression) containers.push([n.getStart(sf), n.getEnd()]); n.forEachChild(walk); };
  sf.forEachChild(walk);
  const inComment = (p) => ranges.some((r) => p >= r.pos && p < r.end) || containers.some(([s, e]) => p >= s && p < e);
  const lineNo = (p) => sf.getLineAndCharacterOfPosition(p).line;
  const lines = text.split("\n");
  const blocks = [];
  for (const r of ranges) {
    const box = containers.find(([s, e]) => r.pos >= s && r.end <= e);
    const start = box ? box[0] : r.pos, end = box ? box[1] : r.end;
    const ls = lineStart(text, start);
    let anchorPos = -1, kind;
    if (!blank(text.slice(ls, start))) { anchorPos = ls + (text.slice(ls).length - text.slice(ls).trimStart().length); kind = "trailing"; }
    else {
      // code after the comment on its own line (`/* x */ foo()`) is the anchor
      const rest = text.slice(end, lineEnd(text, end));
      if (!blank(rest.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/g, "")) && !inComment(end + rest.search(/\S/))) anchorPos = end + rest.search(/\S/);
      else {
        let i = lineEnd(text, end) + 1;
        while (i < text.length) {
          const e2 = lineEnd(text, i);
          const l = text.slice(i, e2);
          const at = i + (l.length - l.trimStart().length);
          if (!blank(l) && !inComment(at)) { anchorPos = at; break; }
          i = e2 + 1;
        }
      }
      kind = box ? "jsx" : text.startsWith("/**", r.pos) ? "jsdoc" : text.startsWith("/*", r.pos) ? "block" : "line";
    }
    const comment = body(text, r).split("\n").map((l) => l.replace(/^\s*\*+\s?/, "").trim()).filter(Boolean).join(" ");
    if (anchorPos < 0 || !comment) continue;
    const anchorLine = lineNo(anchorPos) + 1;
    const last = blocks[blocks.length - 1];
    if (last && last.anchorLine === anchorLine) {
      last.comment += " " + comment; last.lines.push(...rawLines(text, r)); last.endLine = lineNo(end) + 1; last.ranges.push([r.pos, r.end]);
      if (kind === "jsx") last.kind = "jsx";
      continue;
    }
    blocks.push({ line: lineNo(start) + 1, endLine: lineNo(end) + 1, anchorLine, anchor: kind === "trailing" ? text.slice(ls, r.pos).trim() : lines[anchorLine - 1].trim(),
      kind, docStyle: text.startsWith("/**", r.pos), comment, lines: rawLines(text, r), ranges: [[r.pos, r.end]], anchorPos });
  }
  blocks.forEach((b, i) => {
    b.id = `A${i + 1}`;
    Object.assign(b, scopeOf(file, sf, text, b.anchorPos));
    const tags = tagsOf(b.comment);
    if (tags.length) b.tags = tags;
    const ptrs = pointersIn(b.comment, allDocs);
    if (ptrs.length) b.pointers = ptrs;
    delete b.anchorPos;
  });
  return blocks;
}

// ---------------------------------------------------------------- docs
// Sections by heading, plus the bold lead-ins a pointer may quote.
function docIndex(doc) {
  const lines = fs.readFileSync(doc, "utf8").split("\n");
  const hs = [];
  let fence = false;
  lines.forEach((l, i) => {
    if (/^```/.test(l)) fence = !fence;
    if (fence) return;
    const m = l.match(/^(#{1,6}) (.*)$/);
    if (m) hs.push({ level: m[1].length, title: m[2].trim(), start: i + 1, kind: "heading" });
  });
  const out = hs.map((h, i) => {
    const next = hs.slice(i + 1).find((n) => n.level <= h.level);
    return { ...h, end: next ? next.start - 1 : lines.length };
  });
  // bold lead-ins: `**…**` opening a paragraph or a bullet
  lines.forEach((l, i) => {
    const joined = [l, ...lines.slice(i + 1, i + 5)].join("\n").split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, " ");
    const m = /^\s*(?:[-*]\s+|\d+\.\s+)?\*\*/.test(l) && joined.match(/^\s*(?:[-*]\s+|\d+\.\s+)?\*\*(.+?)\*\*/);
    if (!m) return;
    let end = i + 1;
    while (end < lines.length && lines[end].trim() && !/^\s*(?:[-*]\s+|\d+\.\s+)?\*\*/.test(lines[end]) && !/^#/.test(lines[end])) end++;
    out.push({ level: 9, title: m[1].trim(), start: i + 1, end, kind: "lead-in" });
  });
  return { doc, lines, sections: out };
}
const norm = (s) => s.replace(/[`*_]/g, "").replace(/\s+/g, " ").trim().replace(/[.:;!?]+$/, "").toLowerCase();
// An anchor may hold quotes (§"The "strict" mode"): each later quote is a
// candidate end, the first that names a section exactly wins, as in the driver.
function pointersIn(comment, allDocs) {
  return [...comment.matchAll(POINTER)].map((m) => {
    const [, doc, anchor, slug] = m;
    if (anchor === undefined) return resolvePointer(doc, slug ?? "", allDocs);
    const exact = resolvePointer(doc, anchor, allDocs, false);
    if (exact.ok || exact.why === "doc missing") return exact;
    const rest = comment.slice(m.index + m[0].length, m.index + m[0].length + 200);
    for (let j = rest.indexOf('"'); j >= 0; j = rest.indexOf('"', j + 1)) {
      const r = resolvePointer(doc, `${anchor}"${rest.slice(0, j)}`, allDocs, false);
      if (r.ok) return r;
    }
    return resolvePointer(doc, anchor, allDocs);
  });
}
function resolvePointer(doc, anchor, allDocs, prefix = true) {
  const d = allDocs.get(doc) ?? (fs.existsSync(doc) ? docIndex(doc) : null);
  if (!d) return { doc, anchor, ok: false, why: "doc missing" };
  allDocs.set(doc, d);
  if (!anchor) return { doc, anchor, ok: true, kind: "doc" };
  const slug = (t) => norm(t).replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
  const hit = d.sections.find((s) => norm(s.title) === norm(anchor)) ?? d.sections.find((s) => slug(s.title) === anchor.toLowerCase()) ?? (prefix ? d.sections.find((s) => norm(s.title).startsWith(norm(anchor))) : null);
  return hit ? { doc, anchor, ok: true, kind: hit.kind, range: `${hit.start}-${hit.end}` } : { doc, anchor, ok: false, why: "no heading or bold lead-in with that text" };
}

// ---------------------------------------------------------------- view
function view(text, blocks) {
  const at = new Map(blocks.map((b) => [b.line, b.id]));
  const w = String(text.split("\n").length).length;
  return text.split("\n").map((l, i) => `${String(i + 1).padStart(w)} ${(at.get(i + 1) ?? "").padEnd(4)}| ${l}`).join("\n") + "\n";
}

// ---------------------------------------------------------------- apply
const WRAP = 80;
function wrap(line, width) {
  const out = []; let cur = "";
  for (const w of line.split(/\s+/)) {
    if (cur && cur.length + 1 + w.length > width) { out.push(cur); cur = w; }
    else cur = cur ? cur + " " + w : w;
  }
  if (cur) out.push(cur);
  return out;
}
const isPointer = (l) => /^See\s/.test(l);
// Sentence case and a closing full stop: v1 left lowercase fragments.
// A table or divider line is written as it is: no sentence case, no full stop,
// no wrap. blockText marks it with VERBATIM; commentLines drops the mark.
const VERBATIM = "\u0001";
function sentence(l) {
  if (l.startsWith(VERBATIM)) return l;
  let s = l.trim();
  if (!s || isPointer(s)) return s;
  if (/^[a-z]/.test(s) && !/^[a-z]+[A-Z(.[_]|^[a-z]+\(|^[a-z_]+\./.test(s.split(/\s/)[0])) s = s[0].toUpperCase() + s.slice(1);
  if (!/[.!?:;)`"'\]]$/.test(s)) s += ".";
  return s;
}
const pointerFor = (source) => `See ${source.trim().replace(/^`+|`+$/g, "").replace(/\\`/g, "`")}`;

// A kept comment keeps its form: `//` stays `//`, `/* */` stays a block, JSDoc
// stays JSDoc. Only a contract the judge added to an interface turns it into
// JSDoc. A single line stays one line.
function commentLines(file, indent, lines, { docStyle, block, contract, jsx }) {
  const prefix = indent.length + (jsx ? 7 : 3);
  const ls = lines.flatMap((l) => (l.startsWith(VERBATIM) ? [l.slice(1)] : isPointer(l) ? [l] : wrap(l, Math.max(40, WRAP - prefix))));
  const safe = (l) => l.replace(/\*\//g, "* /");
  if (file.endsWith(".css")) return [`${indent}/* ${safe(ls.join(" "))} */`];
  // One `{/* … */}` per block, continuation lines under the text, as the repo
  // writes them: v1 wrapped each line in its own container.
  if (jsx) return ls.map((l, i) => (i === 0 ? `${indent}{/* ` : `${indent}    `) + safe(l) + (i === ls.length - 1 ? " */}" : ""));
  if (docStyle || contract || block) {
    const open = docStyle || contract ? "/**" : "/*";
    if (ls.length === 1) return [`${indent}${open} ${safe(ls[0])} */`];
    return [`${indent}${open}`, ...ls.map((l) => `${indent} * ${safe(l)}`), `${indent} */`];
  }
  return ls.map((l) => `${indent}// ${l}`);
}

// answers/<path>.json: { rows: [{ id, verdict, text: [lines], route, source, … }] }
// A DOC row keeps its one-line reason (`text`, may be empty) and adds the pointer.
function blockText(rows, problems) {
  const texts = [], pointers = [];
  for (const r of rows) {
    // a table unit is one text entry of several lines, a divider one layout
    // line: their lines are written as they are, indentation included
    const lines = (Array.isArray(r.text) ? r.text.flatMap((t) => (String(t).includes("\n") || isLayoutLine(t) ? String(t).split("\n").map((l) => VERBATIM + l.replace(/\s+$/, "")) : [String(t)])) : String(r.text ?? "").split(/\s*<br\s*\/?>\s*|\n/))
      .map((l) => (l.startsWith(VERBATIM) ? l : l.trim())).filter((l) => l.replace(VERBATIM, "").trim());
    texts.push(...lines.filter((l) => !isPointer(l)));
    const srcs = lines.filter((l) => isPointer(l)).map((l) => l.replace(/^See\s+/, "").replace(/\.$/, ""));
    if ((r.route ?? "COMMENT").toUpperCase() === "DOC") srcs.push((r.source ?? "").trim().replace(/^See\s+/, ""));
    for (const src of srcs) {
      if (!POINTER_LINE.test(src.replace(/^`+|`+$/g, ""))) {
        // Not a doc pointer (a test or code path): it stays as a plain reference line.
        if (/^\S+\.(ts|tsx|js|jsx|mjs|cjs|py|go|rb|java|kt|rs|sql|sh)\b/.test(src)) { texts.push(`See ${src.replace(/\s*§.*$/, "")}.`); continue; }
        problems.push(`${r.id}: pointer is not <doc> §"<anchor>": ${src || "(empty)"}`); continue;
      }
      pointers.push(pointerFor(src));
    }
  }
  return [...texts.map(sentence), ...[...new Set(pointers)]];
}

function applyFile(file, work, problems) {
  const pre = fs.readFileSync(path.join(work, "pre", file), "utf8");
  const blocks = JSON.parse(fs.readFileSync(path.join(work, "blocks", file + ".json"), "utf8"));
  const ansFile = path.join(work, "answers", file + ".json");
  const answers = fs.existsSync(ansFile) ? JSON.parse(fs.readFileSync(ansFile, "utf8")).rows ?? [] : [];
  const byId = new Map();
  for (const r of answers) {
    if (!["KEEP", "KEEP?"].includes(String(r.verdict).toUpperCase())) continue;
    if (!byId.has(r.id)) byId.set(r.id, []);
    byId.get(r.id).push(r);
  }
  // 1. a placeholder above every anchor that keeps text
  const lines = pre.split("\n");
  const want = new Map();
  for (const b of blocks) {
    const rows = byId.get(b.id);
    if (!rows) continue;
    let text = blockText(rows, problems);
    // A kept block never disappears: with nothing usable left, its original words go back.
    if (!text.length) { problems.push(`${b.id}: kept with no usable text; original words kept`); text.push(b.comment); }
    want.set(b.id, { b, text, contract: rows.some((r) => r.contract) });
  }
  const order = [...want.values()].sort((x, y) => y.b.anchorLine - x.b.anchorLine);
  for (const { b } of order) {
    const at = b.anchorLine - 1;
    const indent = lines[at].match(/^[ \t]*/)[0];
    lines.splice(at, 0, `${indent}// @@cc2:${b.id}@@`);
  }
  let text = lines.join("\n");
  // 2. a placeholder that lands in JSX text becomes `{/* */}`; one that stays text is dropped
  if (!file.endsWith(".css")) {
    for (let round = 0; round < 2; round++) {
      const bad = fakeCommentLines(file, text);
      if (!bad.length) break;
      const arr = text.split("\n");
      for (const i of bad) {
        const m = arr[i].match(/^([ \t]*)\/\/ (@@cc2:A\d+@@)$/);
        if (!m) continue;
        if (round === 0 && file.endsWith(".tsx")) arr[i] = `${m[1]}{/* ${m[2]} */}`;
        else { problems.push(`${m[2].match(HOLDER)[1]}: no comment syntax works above its anchor`); arr[i] = null; }
      }
      text = arr.filter((l) => l !== null).join("\n");
    }
  }
  // 3. strip every judged comment; placeholders survive (KEEP)
  text = strip(file, text);
  // 4. expand placeholders
  const out = [];
  const placed = {};
  for (const l of text.split("\n")) {
    const m = l.match(/^([ \t]*)(\{\/\* |\/\/ )@@cc2:(A\d+)@@( \*\/\})?$/);
    if (!m || !want.has(m[3])) { out.push(l); continue; }
    const { b, text: t, contract } = want.get(m[3]);
    const block = commentLines(file, m[1], t, { docStyle: b.docStyle && b.kind !== "jsx", block: b.kind === "block", contract, jsx: m[2].startsWith("{") });
    placed[m[3]] = { start: out.length + 1, end: out.length + block.length };
    out.push(...block);
  }
  const final = out.join("\n");
  if (!file.endsWith(".css") && errorsOf(file, final) > errorsOf(file, pre)) {
    problems.push(`${file}: parse would break; file left as the original`);
    return { written: false };
  }
  fs.writeFileSync(file, final);
  fs.mkdirSync(path.dirname(path.join(work, "placed", file)), { recursive: true });
  fs.writeFileSync(path.join(work, "placed", file + ".json"), JSON.stringify(placed, null, 1) + "\n");
  return { written: true, blocks: Object.keys(placed).length };
}

// ---------------------------------------------------------------- finish
const markers = (text) => (text.match(/\b(TODO|FIXME|HACK|XXX)\b/g) ?? []).length;
const codeOnly = (f, text) =>
  strip(f, text).split("\n").map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && !/^(\/\/|\/\*|\*|\{\/\*)/.test(l)).join("\n");

// ---------------------------------------------------------------- CLI
const readList = (f) => fs.readFileSync(f, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const put = (work, rel, content) => { const o = path.join(work, rel); fs.mkdirSync(path.dirname(o), { recursive: true }); fs.writeFileSync(o, content); };
// Imported (the tests), it only defines its helpers.
const MAIN = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })();
const [cmd, ...args] = MAIN ? process.argv.slice(2) : [];

if (cmd === "prepare") {
  const [list, work, ...docs] = args;
  if (!list || !work) { console.error("usage: cc2.mjs prepare <file-list> <work> [doc ...]"); process.exit(2); }
  const allDocs = new Map();
  for (const d of docs.filter((d) => fs.existsSync(d))) allDocs.set(d, docIndex(d));
  let total = 0;
  const summary = [];
  for (const f of readList(list).filter((f) => fs.existsSync(f))) {
    const text = fs.readFileSync(f, "utf8");
    const blocks = blocksOf(f, text, allDocs);
    put(work, path.join("pre", f), text);
    put(work, path.join("blocks", f + ".json"), JSON.stringify(blocks, null, 1) + "\n");
    put(work, path.join("view", f + ".txt"), view(text, blocks));
    total += blocks.length;
    summary.push(`${f}\t${blocks.length}\t${blocks.reduce((n, b) => n + b.endLine - b.line + 1, 0)}`);
  }
  put(work, "docs.json", JSON.stringify([...allDocs.values()].map((d) => ({ doc: d.doc, sections: d.sections })), null, 0) + "\n");
  put(work, "prepare.tsv", "file\tblocks\tcomment_lines\n" + summary.join("\n") + "\n");
  console.log(summary.join("\n"));
  process.exit(total ? 0 : 3);
}

if (cmd === "apply") {
  const [work, ...only] = args;
  const files = only.length ? only : readList(path.join(work, "files.txt"));
  const problems = [];
  let n = 0;
  for (const f of files) { const r = applyFile(f, work, problems); if (r.written) n++; }
  console.log(`applied ${n} of ${files.length} file(s)`);
  if (problems.length) { console.log("PROBLEMS:\n" + problems.join("\n")); process.exit(1); }
  process.exit(0);
}

if (cmd === "finish") {
  const [list, work] = args;
  let bad = 0;
  for (const f of readList(list)) {
    let head;
    try { head = execFileSync("git", ["show", `HEAD:./${f}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 }); }
    catch { console.log(`${f}: not in HEAD, skipped`); continue; }
    const cur = fs.readFileSync(f, "utf8");
    if (codeOnly(f, head) !== codeOnly(f, cur)) {
      bad++;
      const a = codeOnly(f, head).split("\n"), b = codeOnly(f, cur).split("\n");
      const i = a.findIndex((l, k) => l !== b[k]);
      console.log(`CODE CHANGED ${f} near stripped line ${i + 1}:\n- ${a[i]}\n+ ${b[i]}`);
    }
    if (markers(cur) < markers(head)) { bad++; console.log(`MARKER LOST ${f}: HEAD ${markers(head)}, now ${markers(cur)}`); }
    const ans = path.join(work, "answers", f + ".json");
    if (fs.existsSync(ans)) {
      const placed = fs.existsSync(path.join(work, "placed", f + ".json")) ? JSON.parse(fs.readFileSync(path.join(work, "placed", f + ".json"), "utf8")) : {};
      for (const r of JSON.parse(fs.readFileSync(ans, "utf8")).rows ?? [])
        if (String(r.verdict).toUpperCase() === "CUT" && placed[r.id]) { bad++; console.log(`CUT BLOCK STILL COMMENTED ${f}: ${r.id}`); }
    }
  }
  console.log(bad ? `${bad} problem(s)` : "code identical, markers intact");
  process.exit(bad ? 1 : 0);
}

if (cmd === "strip") {
  // strip <file-list>: v1's plain mode, for the harness
  for (const f of readList(args[0])) fs.writeFileSync(f, strip(f, fs.readFileSync(f, "utf8")));
  process.exit(0);
}

if (cmd === "blocks") {
  // blocks <file>: print the blocks as JSON (debugging and the harness)
  const f = args[0];
  fs.writeSync(1, JSON.stringify(blocksOf(f, fs.readFileSync(f, "utf8"), new Map()), null, 1) + "\n");
  process.exit(0);
}

if (MAIN) { console.error("usage: cc2.mjs prepare|apply|finish|strip|blocks …"); process.exit(2); }

export { blockText, commentLines, tagsOf, pointersIn, resolvePointer, docIndex, importGraph, trackedSources, POINTER, POINTER_LINE };
