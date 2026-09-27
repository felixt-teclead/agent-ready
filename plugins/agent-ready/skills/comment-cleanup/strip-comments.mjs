#!/usr/bin/env node
// Strip comments from .ts/.tsx/.js/.mjs/.css files through the TypeScript
// parser (comment trivia ranges), not a regex. Keeps tool directives, licence
// headers and TODO/FIXME/HACK/XXX. Removes the `{}` a `{/* … */}` leaves behind.
// Refuses to write a file whose parse would gain errors.
//
// Usage: node strip-comments.mjs <file-list>          (one path per line, relative to cwd)
//        node strip-comments.mjs --check <file-list>  (report `//` lines the parser
//        does not see as a comment: inside a template literal, or JSX child text)
//        node strip-comments.mjs --inventory <file-list> <outdir>  (write one anchor
//        table per file; changes nothing on disk)
//        node strip-comments.mjs --apply <answers-dir>  (insert each answer row's
//        text above its anchor; prints a worklist of what it would not place)
//        node strip-comments.mjs --prepare <file-list> <work> [doc|folder ...]  (step 1
//        in one call, refuses a non-empty <work>: pre/ and stripped/ copies,
//        anchors/, exports/, headings.txt with section line ranges,
//        doc-refs.txt, ambiguous.txt)
//        node strip-comments.mjs --finish <file-list> <work>  (step 7: code
//        identity diff HEAD vs working copy with comments removed, marker
//        counts, and a check that no CUT anchor still carries a comment; exit 1
//        on any difference)
// Needs `typescript` resolvable from cwd (the repo's node_modules).

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ts = createRequire(path.join(process.cwd(), "package.json"))("typescript");

const KEEP_DIRECTIVE =
  /^(eslint|@ts-|ts-|prettier|c8\b|v8\b|istanbul|@jsx|@license|@preserve|#region|#endregion|@vitest|webpack|@__PURE__|<reference)/i;
// A marker is kept wherever it sits in the line, not only at its start: the
// tracked form is `TODO(TICKET)` or `TODO:`, and prose that merely says "todo"
// carries neither.
const KEEP_MARKER = /\b(TODO|FIXME|HACK|XXX)\s*[(:]/;
const KEEP = { test: (s) => KEEP_DIRECTIVE.test(s) || KEEP_MARKER.test(s) };

const body = (text, r) =>
  text.slice(r.pos, r.end).replace(/^\/\/+/, "").replace(/^\/\*+/, "").replace(/\*\/$/, "").trim();

const kindOf = (f) =>
  f.endsWith(".tsx") ? ts.ScriptKind.TSX : f.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS;

function commentRanges(text, file) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kindOf(file));
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
  // A KEEP marker holds for the whole `//` block it opens, not just its first
  // line: the scanner reports one range per line, so testing each in isolation
  // keeps `// TODO(X): the reason` and strips the sentence it started.
  const kept = new Set();
  for (const r of all) {
    let p = lineStart(text, r.pos);
    while (p > 0) {
      const prev = text.slice(lineStart(text, p - 1), p - 1).trim();
      if (!prev.startsWith("//")) break;
      if (KEEP.test(prev.replace(/^\/\/+/, "").trim())) { kept.add(r.pos); break; }
      p = lineStart(text, p - 1);
    }
  }
  return all.filter((r) => !kept.has(r.pos));
}

const lineStart = (t, p) => {
  let i = p;
  while (i > 0 && t[i - 1] !== "\n") i--;
  return i;
};
const lineEnd = (t, p) => {
  let i = p;
  while (i < t.length && t[i] !== "\n") i++;
  return i;
};
const blank = (s) => /^[ \t]*$/.test(s);

// Delete a range; take the whole line when the comment owns it, else the
// comment plus the whitespace in front of it.
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

function dropEmptyJsxExpressions(text, file) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kindOf(file));
  const del = [];
  const walk = (n) => {
    if (ts.isJsxExpression(n) && !n.expression) del.push([n.getStart(sf), n.getEnd()]);
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

const tidy = (t) => t.replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n");

// A `//` that sits inside JSX child text or a string/template literal is not a
// comment: it is text the runtime keeps. Both trap a comment inserted above the
// wrong line, and both survive typecheck.
function fakeComments(file) {
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kindOf(file));
  const spans = [];
  const walk = (n) => {
    // The literal chunks only, not the whole TemplateExpression: a comment
    // inside a `${ … }` substitution is code, and is a real comment.
    if (ts.isJsxText(n) || ts.isStringLiteralLike(n) || ts.isTemplateLiteralToken(n))
      spans.push([n.getStart(sf), n.getEnd()]);
    for (const c of n.getChildren(sf)) walk(c);
  };
  walk(sf);
  const hits = [];
  let off = 0;
  for (const [i, line] of text.split("\n").entries()) {
    const m = line.match(/^([ \t]*)\/\//);
    const at = off + (m?.[1].length ?? 0);
    if (m && spans.some(([s, e]) => at >= s && at < e)) hits.push([i + 1, line.trim()]);
    off += line.length + 1;
  }
  return hits;
}

// The anchor is the code a comment describes, as text. Line numbers move on the
// first insertion; code text survives the whole run, so every later step finds
// its spot by matching this string.
function inventory(file) {
  const text = fs.readFileSync(file, "utf8");
  const ranges = file.endsWith(".css") ? [] : commentRanges(text, file);
  const inComment = (p) => ranges.some((r) => p >= r.pos && p < r.end);
  const rows = [];
  for (const r of ranges) {
    const ls = lineStart(text, r.pos);
    const before = text.slice(ls, r.pos);
    let anchor = "";
    if (!blank(before)) {
      anchor = before.trim();
    } else {
      let i = r.end;
      while (i < text.length) {
        const s2 = lineStart(text, i), e2 = lineEnd(text, i);
        const line = text.slice(s2, e2);
        if (!blank(line) && !inComment(s2 + (line.length - line.trimStart().length))) {
          anchor = line.trim();
          break;
        }
        i = e2 + 1;
      }
    }
    const comment = body(text, r).replace(/\s*\n\s*\*?\s*/g, " ").trim();
    const last = rows[rows.length - 1];
    if (last && last.anchor === anchor) last.comment += " " + comment;
    else rows.push({ anchor, comment });
  }
  return rows.filter((r) => r.anchor && r.comment);
}

// --- apply -----------------------------------------------------------------
// Insertion is a string match, never a line number: the first insertion moves
// every line below it, and re-resolving an anchor after each edit is how a row
// lands on the wrong statement. Resolve every anchor first, then insert upward.
// A script also cannot paraphrase, which is the point: the answerer's text
// reaches the file byte for byte.

const unesc = (c) => c.replace(/\\\|/g, "|").trim();

function readTable(file) {
  const rows = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map(unesc);
    if (cells.length < 5) continue;
    if (/^-+$/.test(cells[0]) || cells[0].toLowerCase() === "anchor") continue;
    const [anchor, verdict, text, source, route, after] = cells;
    // Anchors arrive fenced when a rewriter copies them from a probe table.
    // Unfence once here, so the export test and the pre-copy lookup see the
    // same text the file holds.
    rows.push({ anchor: anchor.replace(/^`+|`+$/g, "").trim(), verdict: verdict.toUpperCase(), text, source, route: (route || "").toUpperCase(), after: after || "" });
  }
  return rows;
}

const WRITE_BACK = new Set(["LOAD-BEARING", "UNWRITTEN", "KEEP", "KEEP?"]); // CUT, BUG and REDESIGN never return

function resolveAnchor(lines, anchor) {
  const find = (a) => {
    let hits = lines.map((l, i) => (l.trim() === a ? i : -1)).filter((i) => i >= 0);
    if (hits.length === 0) hits = lines.map((l, i) => (l.includes(a) ? i : -1)).filter((i) => i >= 0);
    return hits;
  };
  const hits = find(anchor);
  if (hits.length) return hits;
  // The probe tables fence every anchor, so a rewriter copying one back brings
  // the backticks with it. Retry unfenced: the inventory writes anchors bare, and
  // without this the whole table silently misses and the file loses every comment.
  const bare = anchor.replace(/^`+|`+$/g, "").trim();
  return bare && bare !== anchor ? find(bare) : hits;
}

// Compare comments by their text, not their syntax: a JSX row goes in as `//`
// and comes back as `{/* … */}`, so a syntax match misses its own last run.
const commentBody = (l) => {
  const t = l.trim();
  const m =
    t.match(/^\{\/\*([\s\S]*)\*\/\}$/) || t.match(/^\/\*+([\s\S]*?)\*\/$/) ||
    t.match(/^\/\/(.*)$/) || t.match(/^\/\*+(.*)$/) || t.match(/^\*\/$/) || t.match(/^\*(.*)$/);
  return m ? (m[1] ?? "").trim() : null;
};

// A text cell carries its line breaks as `<br>`, since a markdown table cell is
// one physical line. Exports get a `/** */` block so editors show the contract
// on hover; everything else gets one `//` per line. Nothing is joined or
// wrapped: the rewriter's line breaks are the ones that land.
const textLines = (text) => text.split(/\s*<br\s*\/?>\s*|\n/).map((l) => l.trim()).filter(Boolean);

// Wrap at a fixed width so a 300-character reason does not land as one line a
// human has to scroll. Words are never split or reordered, so the text still
// reaches the file verbatim; only the breaks are the script's.
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

// A `See …` pointer is one line whatever its length: the convention is one
// line, quote closed, and a wrapped pointer is two half-pointers.
const isPointer = (l) => /^See\s/.test(l);

function commentFor(file, indent, text, anchor, docStyle) {
  const isExport = /^export\b/.test(anchor.trim());
  const prefix = indent.length + 3;
  const ls = textLines(text).flatMap((l) => (isPointer(l) ? [l] : wrap(l, Math.max(40, WRAP - prefix))));
  if (file.endsWith(".css")) return [`${indent}/* ${ls.join(" ").replace(/\*\//g, "* /")} */`];
  if (docStyle && !isExport && ls.length === 1) return [`${indent}/** ${ls[0].replace(/\*\//g, "* /")} */`];
  if (isExport || docStyle) return [`${indent}/**`, ...ls.map((l) => `${indent} * ${l.replace(/\*\//g, "* /")}`), `${indent} */`];
  return ls.map((l) => `${indent}// ${l}`);
}

// A type member or field that carried a `/** */` in the original keeps the
// form: editors show a `/** */` on hover and ignore a `//`. The original is
// the `pre/` copy `--prepare` wrote beside the answers directory.
function docStyleAnchors(preFile) {
  const out = new Set();
  if (!fs.existsSync(preFile)) return out;
  const lines = fs.readFileSync(preFile, "utf8").split("\n");
  for (let i = 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || commentBody(lines[i]) !== null) continue;
    const above = commentAbove(lines, i);
    if (above.length && /^\/\*\*/.test(above[0].trim())) out.add(t);
  }
  return out;
}

// The comment lines directly above `at`, innermost first stopped at the first
// non-comment line, so a block written on the last run is recognised whole.
function commentAbove(lines, at) {
  const out = [];
  for (let i = at - 1; i >= 0 && commentBody(lines[i]) !== null; i--) out.unshift(lines[i]);
  return out;
}
const bodies = (ls) => ls.map(commentBody).filter((b) => b);

// A source cell is often fenced whole (`<doc> §"<anchor>"`); the fence goes, the
// backticks inside the heading stay — the pointer quotes the heading exactly.
const pointerFor = (source) => `See ${source.trim().replace(/^`+|`+$/g, "").replace(/\\`/g, "`")}`;

// Two rows on one anchor (a COMMENT and a DOC pointer, or a split fact) are
// one comment: the text first, the pointer last, one block.
function mergeRows(rows) {
  const byAnchor = new Map();
  const out = [];
  for (const r of rows) {
    if (!WRITE_BACK.has(r.verdict) || !r.anchor) { out.push(r); continue; }
    const prev = byAnchor.get(r.anchor);
    if (!prev) { byAnchor.set(r.anchor, r); out.push(r); continue; }
    const body = (x) => (x.route === "DOC" ? (x.source.trim() ? pointerFor(x.source) : "") : x.text);
    const parts = [prev, r].sort((a, b) => (a.route === "DOC") - (b.route === "DOC")).map(body).filter(Boolean);
    if (r.route === "DOC" && r.text.trim()) prev.docSentence = r;
    prev.merged = parts.join("<br>");
    if (prev.verdict !== "KEEP?" && r.verdict === "KEEP?") prev.verdict = "KEEP?";
  }
  return out;
}

function applyFile(file, rows, skipped, worklist, docStyle) {
  const before = fs.readFileSync(file, "utf8");
  const lines = before.split("\n");
  const inserts = [];
  const seenSource = new Map();
  for (const r of mergeRows(rows)) {
    if (r.verdict === "BUG") { worklist.push(`BUG   ${file}  ${r.anchor}  — ${r.text}`); continue; }
    if (!WRITE_BACK.has(r.verdict)) continue;
    const isDoc = r.route === "DOC";
    // A DOC row's text is the doc sentence, never comment body: the reason
    // exists once, in the doc, and the code carries only the pointer. Writing
    // the gist here too is how the two copies drift apart.
    if (isDoc && !r.source.trim()) { skipped.push([file, r.anchor, "DOC row without source"]); continue; }
    // The convention is one line, anchor quoted, quote closed. A pointer that
    // names a chapter instead of a paragraph sends the reader to scan, which is
    // the failure the pointer exists to prevent.
    if (isDoc && !/^\S+\s+§"[^"]+"$/.test(pointerFor(r.source).replace(/^See /, ""))) {
      skipped.push([file, r.anchor, `DOC source is not '<doc> §"<anchor>"': ${r.source.trim()}`]); continue;
    }
    if (isDoc) {
      const key = pointerFor(r.source);
      if (seenSource.has(key)) { skipped.push([file, r.anchor, `source already used by ${seenSource.get(key)}`]); continue; }
      seenSource.set(key, r.anchor);
    }
    const body = r.merged ?? (isDoc ? pointerFor(r.source) : r.text);
    for (const d of [isDoc ? r : null, r.docSentence].filter(Boolean)) {
      if (d.text.trim()) worklist.push(`DOC   ${d.source}\n      after:    ${d.after || "(end of section — no paragraph named)"}\n      sentence: ${d.text}`);
    }
    if (!body.trim()) { skipped.push([file, r.anchor, "empty text"]); continue; }
    const hits = resolveAnchor(lines, r.anchor);
    if (hits.length === 0) { skipped.push([file, r.anchor, "anchor not found"]); continue; }
    if (hits.length > 1) { skipped.push([file, r.anchor, `anchor occurs ${hits.length} times`]); continue; }
    const at = hits[0];
    const indent = lines[at].match(/^[ \t]*/)[0];
    // Looked up by the resolved line, not the row's anchor: a row may name the
    // line by a substring.
    const block = commentFor(file, indent, body, r.anchor, docStyle.has(lines[at].trim()));
    // Re-running a run must change nothing: without this the second pass stacks
    // a second copy of every comment above its anchor. Compared as a whole
    // block, since a multi-line contract is one comment.
    const have = bodies(commentAbove(lines, at)), want = bodies(block);
    if (have.length >= want.length && want.every((b, i) => have[have.length - want.length + i] === b)) continue;
    inserts.push([at, block, r]);
  }
  if (!inserts.length) return 0;

  let out = lines.slice();
  for (const [at, block] of [...inserts].sort((a, b) => b[0] - a[0])) out.splice(at, 0, ...block);
  let text = out.join("\n");

  // A `//` that lands in JSX child text or a template literal is content, not a
  // comment, and it survives typecheck. Retry JSX as `{/* … */}`; drop the row
  // when even that stays invisible to the parser.
  if (!file.endsWith(".css")) {
    for (let round = 0; round < 2; round++) {
      // The extension stays last: kindOf reads it, and a .ts file parsed as JS
      // recovers type annotations as JSX, which swallows whole line ranges into
      // a bogus JsxText span and drops every comment inside them.
      const tmp = file.replace(/(\.[^./]+)$/, ".__apply$1");
      fs.writeFileSync(tmp, text);
      const hits = fakeComments(tmp);
      fs.unlinkSync(tmp);
      if (!hits.length) break;
      const bad = new Set(hits.map(([n]) => n));
      const arr = text.split("\n");
      for (const n of bad) {
        const line = arr[n - 1];
        const m = line.match(/^([ \t]*)\/\/ (.*)$/);
        if (!m) continue;
        if (file.endsWith(".tsx") && round === 0) arr[n - 1] = `${m[1]}{/* ${m[2].replace(/\*\//g, "* /")} */}`;
        else { arr[n - 1] = null; skipped.push([file, m[2].slice(0, 40), "no comment syntax works at this spot"]); }
      }
      text = arr.filter((l) => l !== null).join("\n");
    }
  }

  if (!file.endsWith(".css")) {
    const errs = (t) => ts.createSourceFile(file, t, ts.ScriptTarget.Latest, true, kindOf(file)).parseDiagnostics.length;
    if (errs(text) > errs(before)) {
      skipped.push([file, "*", "parse would break; file left untouched"]);
      return 0;
    }
  }
  fs.writeFileSync(file, text);
  return inserts.length;
}


// --- prepare -----------------------------------------------------------------
// One call replaces the shell scaffolding of step 1. Every artefact a later
// dispatch needs is a file under <work>, so no dispatch greps or copies on its
// own, and the orchestrator's turn count stays flat per file.

const relDoc = (d) => path.relative(process.cwd(), path.resolve(d));

// `doc:start-end  heading` per heading, the end being the line before the next
// heading of equal or higher rank. A rewriter fetches one section as
// `sed -n 'start,endp' doc` and the doc as a whole stays out of every context.
function headingRanges(doc) {
  const lines = fs.readFileSync(doc, "utf8").split("\n");
  const hs = [];
  let fence = false;
  lines.forEach((l, i) => {
    if (/^```/.test(l)) fence = !fence;
    if (fence) return;
    const m = l.match(/^(#{1,4}) (.*)$/);
    if (m) hs.push({ level: m[1].length, title: m[2].trim(), start: i + 1 });
  });
  return hs.map((h, i) => {
    const next = hs.slice(i + 1).find((n) => n.level <= h.level);
    const end = next ? next.start - 1 : lines.length;
    return `${relDoc(doc)}:${h.start}-${end}  ${"#".repeat(h.level)} ${h.title}`;
  });
}

// Exported top-level declarations, signature only: a function up to its body,
// anything else up to twelve lines. Once bare, once with the comment that
// stands above it in the file, for the interface probe's two passes.
function exportsOf(file) {
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kindOf(file));
  const out = [];
  for (const st of sf.statements) {
    const mods = ts.canHaveModifiers(st) ? ts.getModifiers(st) ?? [] : [];
    const isExport = mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) || ts.isExportAssignment(st) || ts.isExportDeclaration(st);
    if (!isExport || ts.isExportDeclaration(st)) continue;
    const start = st.getStart(sf);
    let end = st.getEnd();
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.body) end = st.body.getStart(sf);
    let sig = text.slice(start, end).trimEnd();
    const sigLines = sig.split("\n");
    if (sigLines.length > 12) sig = sigLines.slice(0, 12).join("\n") + "\n  …";
    // Only the block that touches the declaration: a file banner above a blank
    // line is not this export's contract.
    const all = (ts.getLeadingCommentRanges(text, st.pos) ?? []).filter((r) => !KEEP.test(body(text, r)));
    const run = [];
    let edge = start;
    for (let i = all.length - 1; i >= 0; i--) {
      if (/\n\s*\n/.test(text.slice(all[i].end, edge))) break;
      run.unshift(all[i]); edge = all[i].pos;
    }
    const doc = run.map((r) => text.slice(r.pos, r.end)).join("\n");
    const name = st.name?.getText(sf) ?? (ts.isVariableStatement(st) ? st.declarationList.declarations.map((d) => d.name.getText(sf)).join(", ") : sigLines[0].slice(0, 60));
    out.push({ name, sig, doc });
  }
  return out;
}

if (process.argv[2] === "--prepare") {
  const [listFile3, work, ...docs] = process.argv.slice(3);
  if (!listFile3 || !work) { console.error("usage: strip-comments.mjs --prepare <file-list> <work> [doc|folder ...]"); process.exit(2); }
  // Two runs must never share a work directory: the second `--prepare` wipes
  // the first's tables mid-flight, and a run that skips `--prepare` reads the
  // other's answers and reports them as its own. `<work>` keyed by repo
  // basename collides across worktrees of one repository, so stamp the
  // absolute cwd and refuse a directory another run stamped.
  const stamp = path.join(work, ".run");
  const me = process.cwd();
  if (fs.existsSync(stamp) && fs.readFileSync(stamp, "utf8").trim() !== me) {
    console.error(`refusing: ${work} belongs to a run in ${fs.readFileSync(stamp, "utf8").trim()}`);
    process.exit(4);
  }
  if (fs.existsSync(work) && !fs.existsSync(stamp) && fs.readdirSync(work).some((e) => e !== "files.txt")) {
    console.error(`refusing: ${work} is not empty; pick a fresh <run> directory`);
    process.exit(4);
  }
  fs.mkdirSync(work, { recursive: true });
  fs.writeFileSync(stamp, me + "\n");
  const files3 = fs.readFileSync(listFile3, "utf8").split("\n").filter(Boolean).filter((f) => fs.existsSync(f));
  const put = (rel, content) => { const o = path.join(work, rel); fs.mkdirSync(path.dirname(o), { recursive: true }); fs.writeFileSync(o, content); };
  const esc = (t) => t.replace(/\|/g, "\\|");
  let anchors = 0, exportsN = 0;
  const ambiguous = [], refused = [];
  for (const f of files3) {
    const text = fs.readFileSync(f, "utf8");
    put(path.join("pre", f), text);
    let stripped;
    if (f.endsWith(".css")) stripped = stripCss(text);
    else {
      stripped = cutRanges(text, commentRanges(text, f));
      if (f.endsWith(".tsx")) stripped = dropEmptyJsxExpressions(stripped, f);
      const errs = (t) => ts.createSourceFile(f, t, ts.ScriptTarget.Latest, true, kindOf(f)).parseDiagnostics.length;
      if (errs(stripped) > errs(text)) { refused.push(f); stripped = text; }
    }
    put(path.join("stripped", f), tidy(stripped));
    const rows = inventory(f);
    anchors += rows.length;
    put(path.join("anchors", f + ".md"), "| anchor | comment |\n| --- | --- |\n" + rows.map((r) => `| ${esc(r.anchor)} | ${esc(r.comment)} |`).join("\n") + "\n");
    // An anchor `--apply` will refuse: the same code text on two lines. Found
    // now, so the rewriter widens it before `--apply` runs, not after it fails.
    const lines = text.split("\n").map((l) => l.trim());
    for (const r of rows) if (lines.filter((l) => l === r.anchor).length > 1) ambiguous.push(`${f}\t${r.anchor}`);
    if (!f.endsWith(".css")) {
      const ex = exportsOf(f);
      exportsN += ex.length;
      if (ex.length) put(path.join("exports", f + ".md"),
        ex.map((e) => `## ${e.name}\n\n### bare\n\n\`\`\`ts\n${e.sig}\n\`\`\`\n` + (e.doc ? `\n### commented\n\n\`\`\`ts\n${e.doc}\n${e.sig}\n\`\`\`\n` : "")).join("\n"));
    }
  }
  put("files.txt", files3.join("\n") + "\n");
  put("stripped-files.txt", files3.map((f) => path.join(work, "stripped", f)).join("\n") + "\n");
  put("ambiguous.txt", ambiguous.join("\n") + (ambiguous.length ? "\n" : ""));
  // A folder of docs (`docs/adr/`) stands for the markdown files in it.
  const docFiles = docs.filter((d) => fs.existsSync(d)).flatMap((d) =>
    fs.statSync(d).isDirectory()
      ? fs.readdirSync(d).filter((e) => e.endsWith(".md")).sort().map((e) => path.join(d, e))
      : [d]);
  const heads = docFiles.flatMap(headingRanges);
  put("headings.txt", heads.join("\n") + (heads.length ? "\n" : ""));
  // Every doc line that names a file of the set: a comment the doc points at is
  // owned by the doc, and its reason belongs there.
  const refs = [];
  for (const d of docFiles) {
    fs.readFileSync(d, "utf8").split("\n").forEach((l, i) => {
      for (const f of files3) if (l.includes(path.basename(f))) refs.push(`${relDoc(d)}:${i + 1}\t${f}\t${l.trim().slice(0, 160)}`);
    });
  }
  put("doc-refs.txt", refs.join("\n") + (refs.length ? "\n" : ""));
  console.log(`${files3.length} file(s), ${anchors} anchor(s), ${exportsN} export(s), ${heads.length} heading(s), ${refs.length} doc reference(s), ${ambiguous.length} ambiguous anchor(s)`);
  if (ambiguous.length) console.log("AMBIGUOUS (widen before step 5):\n" + ambiguous.join("\n"));
  if (refused.length) console.log("STRIP REFUSED (parse would break; stripped copy equals original):\n" + refused.join("\n"));
  process.exit(anchors ? 0 : 3);
}

// --- finish ------------------------------------------------------------------
// Step 7 as one command. Both sides are stripped, then every remaining comment
// line (a marker the strip keeps) is dropped, so the diff is code against code.
// Markers are counted separately: a marker absent from both sides diffs clean.

import { execFileSync } from "node:child_process";

const stripText = (f, text) => {
  let out;
  if (f.endsWith(".css")) out = stripCss(text);
  else {
    out = cutRanges(text, commentRanges(text, f));
    if (f.endsWith(".tsx")) out = dropEmptyJsxExpressions(out, f);
  }
  return tidy(out).split("\n").filter((l) => commentBody(l) === null).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
};
const markers = (text) => (text.match(/\b(TODO|FIXME|HACK|XXX)\b/g) ?? []).length;

// A `CUT` anchor that still carries a comment means the answers table never
// reached the file: someone edited by hand and the strip never ran. No other
// step looks for this, because verify and recite only read what was written.
function survivingCuts(work, file) {
  const table = path.join(work, "answers", file + ".md");
  if (!fs.existsSync(table)) return [];
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const out = [];
  for (const r of readTable(table)) {
    if (r.verdict !== "CUT") continue;
    const hits = resolveAnchor(lines, r.anchor);
    if (hits.length !== 1) continue;
    if (commentAbove(lines, hits[0]).length) out.push(r.anchor);
  }
  return out;
}

if (process.argv[2] === "--finish") {
  const [listFile4, work] = process.argv.slice(3);
  if (!listFile4 || !work) { console.error("usage: strip-comments.mjs --finish <file-list> <work>"); process.exit(2); }
  let bad = 0;
  for (const f of fs.readFileSync(listFile4, "utf8").split("\n").filter(Boolean)) {
    // Before the HEAD lookup: a file the branch adds has no HEAD side, and its
    // CUT rows still have to hold.
    for (const a of survivingCuts(work, f)) { bad++; console.log(`CUT ANCHOR STILL COMMENTED ${f}: ${a}`); }
    let head;
    try { head = execFileSync("git", ["show", `HEAD:./${f}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
    catch { console.log(`${f}: not in HEAD, skipped`); continue; }
    const cur = fs.readFileSync(f, "utf8");
    const a = stripText(f, head), b = stripText(f, cur);
    if (a !== b) {
      bad++;
      const ha = path.join(work, "check/head", f), hb = path.join(work, "check/cur", f);
      fs.mkdirSync(path.dirname(ha), { recursive: true }); fs.mkdirSync(path.dirname(hb), { recursive: true });
      fs.writeFileSync(ha, a + "\n"); fs.writeFileSync(hb, b + "\n");
      let diff = "";
      try { execFileSync("diff", ["-u", ha, hb], { encoding: "utf8" }); } catch (e) { diff = e.stdout; }
      console.log(`CODE CHANGED ${f}\n${diff.split("\n").slice(2, 40).join("\n")}`);
    }
    const ma = markers(head), mb = markers(cur);
    if (mb < ma) { bad++; console.log(`MARKER LOST ${f}: HEAD ${ma}, now ${mb}`); }
  }
  console.log(bad ? `${bad} problem(s)` : "code identical, markers intact");
  process.exit(bad ? 1 : 0);
}

if (process.argv[2] === "--apply") {
  const dir = process.argv[3];
  if (!dir) { console.error("usage: strip-comments.mjs --apply <answers-dir>"); process.exit(2); }
  const tables = [];
  const walkDir = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walkDir(full);
      else if (e.name.endsWith(".md")) tables.push(full);
    }
  };
  walkDir(dir);
  const skipped = [], worklist = [];
  let total = 0, files = 0;
  for (const t of tables) {
    const target = path.relative(dir, t).replace(/\.md$/, "");
    if (!fs.existsSync(target)) { skipped.push([target, "*", "target file missing"]); continue; }
    const n = applyFile(target, readTable(t), skipped, worklist, docStyleAnchors(path.join(dir, "..", "pre", target)));
    if (n) { total += n; files++; }
  }
  console.log(`inserted ${total} line(s) into ${files} file(s)`);
  if (worklist.length) console.log("\nWORKLIST (place by hand):\n" + worklist.join("\n"));
  if (skipped.length) {
    console.log("\nSKIPPED:\n" + skipped.map(([f, a, why]) => `${f}: ${why} — ${a}`).join("\n"));
    process.exit(1);
  }
  process.exit(0);
}

if (process.argv[2] === "--inventory") {
  const listFile2 = process.argv[3], outDir = process.argv[4];
  if (!listFile2 || !outDir) { console.error("usage: strip-comments.mjs --inventory <file-list> <outdir>"); process.exit(2); }
  let total = 0;
  for (const f of fs.readFileSync(listFile2, "utf8").split("\n").filter(Boolean)) {
    if (!fs.existsSync(f)) continue;
    const rows = inventory(f);
    const out = path.join(outDir, f + ".md");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const esc = (t) => t.replace(/\|/g, "\\|");
    fs.writeFileSync(out, "| anchor | comment |\n| --- | --- |\n" +
      rows.map((r) => `| ${esc(r.anchor)} | ${esc(r.comment)} |`).join("\n") + "\n");
    total += rows.length;
  }
  console.log(`${total} anchor(s) written to ${outDir}`);
  process.exit(0);
}

const check = process.argv[2] === "--check";
const listFile = process.argv[check ? 3 : 2];
if (!listFile) { console.error("usage: strip-comments.mjs [--check] <file-list>"); process.exit(2); }
const files = fs.readFileSync(listFile, "utf8").split("\n").filter(Boolean);

if (check) {
  let n = 0;
  for (const f of files) {
    if (!fs.existsSync(f) || f.endsWith(".css")) continue;
    for (const [line, text] of fakeComments(f)) { console.log(`${f}:${line}: ${text}`); n++; }
  }
  console.log(`${n} non-comment \`//\` line(s) in ${files.length} files`);
  process.exit(n ? 1 : 0);
}

let changed = 0;
const refused = [];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const before = fs.readFileSync(f, "utf8");
  let after;
  if (f.endsWith(".css")) after = stripCss(before);
  else {
    after = cutRanges(before, commentRanges(before, f));
    if (f.endsWith(".tsx")) after = dropEmptyJsxExpressions(after, f);
  }
  after = tidy(after);
  if (after === before) continue;
  if (!f.endsWith(".css")) {
    const errs = (t) => ts.createSourceFile(f, t, ts.ScriptTarget.Latest, true, kindOf(f)).parseDiagnostics.length;
    if (errs(after) > errs(before)) { refused.push(f); continue; }
  }
  fs.writeFileSync(f, after);
  changed++;
}
console.log(`stripped ${changed} of ${files.length} files`);
if (refused.length) { console.log("REFUSED (parse would break):\n" + refused.join("\n")); process.exit(1); }
