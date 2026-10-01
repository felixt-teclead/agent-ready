#!/usr/bin/env node
// Regression checks for comment-cleanup's mechanics. No agent is called: pure
// helpers are imported, and the driver runs with --dry on a fixture repo built
// under the temp dir.
//
//   node test/regression.mjs [<dir whose node_modules has typescript>]   (default: cwd)
//
// One line per check; exit 1 on any failure.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const SKILL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RUN = path.join(SKILL, "cc2-run.mjs");
let failed = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? `: ${detail}` : ""}`); if (!ok) failed++; };
const write = (p, text) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };

// ---------------------------------------------------------------- fixture
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "cc2-regression-"));
process.env.GIT_CEILING_DIRECTORIES = TMP; // the plain copy must not find a parent repo
const FIX = path.join(TMP, "repo");
let tsDir;
try { tsDir = path.dirname(createRequire(path.join(path.resolve(process.argv[2] ?? "."), "package.json")).resolve("typescript/package.json")); }
catch { console.log(`FAIL typescript not found from ${path.resolve(process.argv[2] ?? ".")}; pass a directory whose node_modules has it`); process.exit(1); }

write(path.join(FIX, "package.json"), "{}\n");
write(path.join(FIX, ".gitignore"), "node_modules\n");
fs.mkdirSync(path.join(FIX, "node_modules"), { recursive: true });
fs.symlinkSync(tsDir, path.join(FIX, "node_modules", "typescript"));
write(path.join(FIX, "docs", "guide.md"), `# Guide

## Setup

Run the thing.

## The "strict" mode

Strict text.

- **Retry
  policy.** Retries three times.
`);
write(path.join(FIX, "docs", "(guides)", "[v2]", "setup.md"), "# Setup v2\n\n## Install\n\nInstall it.\n");
// pointers in code outside any folder named src, in two languages
write(path.join(FIX, "lib", "tool.py"), `# See docs/guide.md §"Setup"\ndef tool():\n    pass\n`);
write(path.join(FIX, "app", "main.go"), `package main\n\n// See docs/guide.md §"Setup" for the steps.\nfunc main() {}\n`);
// 25 blocks: ten of 5 lines, then fifteen of 1 line
const big = [];
for (let i = 0; i < 25; i++) {
  const n = i < 10 ? 5 : 1;
  for (let k = 0; k < n; k++) big.push(`// Step ${i} explains line ${k} of why this helper exists.`);
  big.push(`export function step${i}() { return ${i}; }`, "");
}
write(path.join(FIX, "big.ts"), big.join("\n"));
write(path.join(FIX, "tests", "big.test.ts"), `import { step1 } from "../big";\ntest("step1", () => expect(step1()).toBe(1));\n`);
// a pointer and a test for the judge's lookups
write(path.join(FIX, "ptr.ts"), `// Setup must run first.\n// See docs/guide.md §"Setup"\nexport function setupThing() { return 1; }\n`);
write(path.join(FIX, "tests", "ptr.spec.ts"), `import { setupThing } from "../ptr";\nit("sets up", () => expect(setupThing()).toBe(1));\n`);
// an importer outside src/ and tests/
write(path.join(FIX, "scripts", "use.ts"), `import { step1 } from "../big";\nstep1();\n`);
// pins: a path alias from tsconfig (with comments), a test that only names the
// file in a comment, one that imports the file but asserts something else
write(path.join(FIX, "tsconfig.json"), `{\n  // aliases\n  "compilerOptions": { "baseUrl": ".", "paths": { "~lib/*": ["lib/ts/*"], }, },\n}\n`);
write(path.join(FIX, "lib", "ts", "money.ts"), `// Rounds half away from zero, so 0.5 becomes 1.
// Defensive: callers never pass NaN.
export function roundCents(x: number) { return Math.round(x); }
export function other() { return 1; }
`);
write(path.join(FIX, "tests", "money.test.ts"), `import { roundCents } from "~lib/money";\n// other() is covered in lib/ts/money.ts's own suite\nit("rounds half up", () => {\n  expect(roundCents(0.5)).toBe(1);\n});\n`);
write(path.join(FIX, "tests", "helpers.ts"), "export const x = 1;\n");
write(path.join(FIX, "tests", "names-only.test.ts"), `import { x } from "./helpers";\n// covers lib/ts/money.ts roundCents rounding\nit("x", () => expect(x).toBe(1));\n`);
write(path.join(FIX, "tests", "other.test.ts"), `import { other } from "../lib/ts/money";\n// roundCents(0.5) is 1\nit("other", () => expect(other()).toBe(1));\n`);
write(path.join(FIX, "plain.ts"), "// Retries back off on conflict, so a burst settles.\nexport function retry() { return true; }\n");
execFileSync("git", ["init", "-q"], { cwd: FIX });
execFileSync("git", ["add", "-A"], { cwd: FIX });
const PLAIN = path.join(TMP, "plain");
fs.cpSync(FIX, PLAIN, { recursive: true, filter: (s) => !s.includes(`${path.sep}.git`) });
write(path.join(TMP, "files.txt"), "big.ts\n");

// ---------------------------------------------------------------- pure helpers
process.chdir(FIX);
const R = await import(RUN);
const C = await import(path.join(SKILL, "cc2.mjs"));

// default cut: a findable fact scored C 2 in an older answer no longer overrides the cut
{
  const problems = [];
  const { rows } = R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "CUT", facts: [{ flag: "CONVENTION", C: 2, F: 1, fact: "Retries back off", source: "big.ts:40" }, { flag: "FINDABLE", C: 2, F: 2, fact: "Runs once per day", source: "big.ts:41" }] }] },
    [{ id: "A1", comment: "x", anchorLine: 3 }], problems);
  check("default cut: no C 2 override, nothing written", rows[0].verdict === "CUT" && rows[0].text.length === 0, JSON.stringify(rows[0]));
}

// sentences: the split the judge's ids refer to
{
  const K = await import(path.join(SKILL, "checks.mjs"));
  const ss = K.splitSentences("Parses the value, e.g. `1,5`. Returns null (never throws). \"Quoted\" starts here! lower case. stays @param x the input @returns y");
  check("split: abbreviation, bracket, quote, tag", JSON.stringify(ss) === JSON.stringify(["Parses the value, e.g. `1,5`.", "Returns null (never throws).", "\"Quoted\" starts here! lower case. stays", "@param x the input", "@returns y"]), JSON.stringify(ss));
  check("split: one sentence stays one", K.splitSentences("Retries three times").length === 1);
}

// tables, box-drawing lines and dividers are one unit each, never split into sentences
{
  const K = await import(path.join(SKILL, "checks.mjs"));
  write(path.join(FIX, "table.ts"), [
    "// Checks run most-severe first, so a partial and stale pull reads as",
    "// the more urgent one:",
    "//",
    "//   error            → \"Error\"   (destructive)",
    "//   status = partial → \"Partial\" (warning)",
    "//   otherwise        → \"OK\"",
    "//",
    "// Keep the labels distinct. Admins read them.",
    "export function health() { return 1; }",
    "",
    "// --- Legal (11) -------------------------------------------",
    "const legal = 1;",
    "",
    "/**",
    " * ─── Rendering ───",
    " * | kind | trusted |",
    " * | ---- | ------- |",
    " * | lesson | yes |",
    " * Comments are student input. Kept separate.",
    " */",
    "export const render = 1;",
    ""].join("\n"));
  const tb = JSON.parse(spawnSync("node", [path.join(SKILL, "cc2.mjs"), "blocks", "table.ts"], { cwd: FIX, encoding: "utf8" }).stdout);
  const u = tb.map((b) => K.blockSentences(b));
  check("units: an aligned table is one unit with its lines and indentation, prose around it split", u[0].length === 4 && u[0][1].split("\n").length === 3 && u[0][1].startsWith("  error ") && u[0][0].endsWith("the more urgent one:") && u[0][2] === "Keep the labels distinct." && u[0][3] === "Admins read them.", JSON.stringify(u[0]));
  check("units: a --- divider is one unit, never a sentence", u[1].length === 1 && K.isLayoutUnit(u[1][0]) && u[1][0].startsWith("--- Legal (11) ---"), JSON.stringify(u[1]));
  check("units: a box-drawing rule and a markdown table in JSDoc are units of their own", u[2][0] === "─── Rendering ───" && u[2][1].split("\n").length === 3 && u[2][1].startsWith("| kind |") && u[2][2] === "Comments are student input.", JSON.stringify(u[2]));
  check("units: prose with a union type or an arrow is no table", !K.isLayoutLine("Returns string | null | undefined when missing.") && !K.isLayoutLine("Maps a -> b, then b -> c."));
  // the judge sees each table as one numbered unit
  const tw = path.join(TMP, "work-table");
  write(path.join(tw, "files.txt"), "table.ts\n");
  spawnSync("node", [path.join(SKILL, "cc2.mjs"), "prepare", path.join(tw, "files.txt"), tw], { cwd: FIX });
  const tp = R.buildPack({ files: ["table.ts"], docs: new Map([["table.ts", []]]) }, tw);
  check("units: the judge prompt lists a table as one unit, keep or cut whole", /A1 S2 \(table or divider: keep or cut whole, never rewrite\):\n {4} {2}error /.test(tp) && /A2 S1 \(table or divider/.test(tp), tp.slice(tp.indexOf("## Sentences"), tp.indexOf("## Sentences") + 500));
  // keep writes the table verbatim; a rewrite of it gets its original lines back
  const keepAll = (b) => ({ id: b.id, verdict: "KEEP", pointer: "", facts: [], sentences: K.blockSentences(b).map((_, i) => ({ from: [`S${i + 1}`], action: i === 1 && b.id === "A1" ? "rewrite" : "keep", text: i === 1 && b.id === "A1" ? "error is Error, partial is Partial." : "", why_rewrite: "history", pitfall: "p", facts: [], tests: [] })) });
  const tr = R.toAnswers("table.ts", { blocks: tb.map(keepAll) }, tb, []);
  check("units: a rewrite of a table gets its original lines back", tr.rows[0].sentences[1].reverted === "table or divider" && tr.rows[0].text[1] === u[0][1], JSON.stringify(tr.rows[0].sentences[1]));
  write(path.join(tw, "answers", "table.ts.json"), JSON.stringify({ rows: tr.rows }));
  const ap = spawnSync("node", [path.join(SKILL, "cc2.mjs"), "apply", tw], { cwd: FIX, encoding: "utf8" });
  const out = fs.readFileSync(path.join(FIX, "table.ts"), "utf8");
  check("units: apply writes tables and dividers line for line, no full stop, no wrap", ap.status === 0 && out.includes('//   error            → "Error"   (destructive)\n//   status = partial → "Partial" (warning)\n//   otherwise        → "OK"\n') && out.includes("// --- Legal (11) -------------------------------------------\nconst legal") && out.includes(" * ─── Rendering ───\n * | kind | trusted |\n * | ---- | ------- |\n * | lesson | yes |\n") && !/-{3}\.$|OK"\.$/m.test(out), ap.stdout + out);
  const ol = R.toAnswers("table.ts", { blocks: [{ id: "A1", verdict: "KEEP", pointer: "", facts: [{ fact: "labels distinct", flag: "KEEP", source: "table.ts:9", C: 2, F: 0 }, { fact: "error reads Error, partial Partial, otherwise OK", flag: "KEEP", source: "table.ts:9", C: 2, F: 0 }], text: ['error            → "Error"   (destructive)', 'otherwise        → "OK"', "Keep the labels distinct."] }] }, tb.slice(0, 1), []);
  check("units: an old-style answer that echoes table rows keeps the whole table once", ol.rows[0].text.length === 2 && ol.rows[0].text[0] === u[0][1] && !ol.extraFindings.length, JSON.stringify(ol));
}

// report: STATUS first, then the KEPT / CUT / FINDINGS executable counters
{
  const blk = { id: "A1", comment: "Runs as the service role. It is fast. Added in T-9.", line: 1, endLine: 1, anchorLine: 2, anchor: "x();", scope: "body" };
  const blk2 = { id: "A2", comment: "Increments the counter.", line: 4, endLine: 4, anchorLine: 5, anchor: "n++;", scope: "body" };
  const d = (from, action, pitfall = "") => ({ from, action, text: "", why_rewrite: "", pitfall, facts: [], tests: [] });
  const { rows, extraFindings } = R.toAnswers("big.ts", { blocks: [
    { id: "A1", verdict: "KEEP", pointer: "", facts: [], sentences: [d(["S1"], "keep", "Removing the tenant check lets anyone read."), d(["S2", "S3"], "cut")] },
    { id: "A2", verdict: "CUT", pointer: "", facts: [], sentences: [d(["S1"], "cut")] }] }, [blk, blk2], []);
  const findings = [...extraFindings, { category: "missing-test", status: "open", line: 2, claim: "Runs as the service role.", why: "make it executable: a test that a user of another tenant gets 404", done: "-", if_wrong: "-" }, { category: "unsure", status: "acted", line: 2, claim: "x", why: "y", done: "-", if_wrong: "-" }];
  const n = R.counters(rows, [blk, blk2], findings);
  const oldRows = R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "KEEP", pointer: "", facts: [{ fact: "runs as the service role", flag: "KEEP", source: "big.ts:2", C: 2, F: 0 }], text: ["Runs as the service role."] }] }, [blk], []).rows;
  check("report counters: an old-style answer's unused originals count as cut", JSON.stringify(R.counters(oldRows, [blk], [])) === JSON.stringify({ kept: 1, cut: 2, executable: 0 }), JSON.stringify(R.counters(oldRows, [blk], [])));
  check("report counters: 1 kept, 3 cut, 1 executable finding", n.kept === 1 && n.cut === 3 && n.executable === 1, JSON.stringify(n));
  const rw = path.join(TMP, "work-report");
  fs.mkdirSync(rw, { recursive: true });
  const text = R.report("big.ts", rw, { status: "ok", before: 2, after: 1, facts: [], rows, findings, docfixes: [], problems: [], blocks: [blk, blk2], costs: [{ step: "judge", cost: 0.1 }] });
  const L = text.split("\n");
  check("report: STATUS first, then KEPT n (pitfalls), CUT n, FINDINGS executable n", L[0] === "STATUS ok" && L.includes("KEPT 1 (pitfalls)") && L.includes("CUT 3") && L.includes("FINDINGS executable 1") && fs.existsSync(path.join(rw, "report-big.md")) && !text.includes("HANDBACK_BLOCK"), text);
}

// judge decisions per original sentence: keep is verbatim, rewrite needs no match, gaps stay
{
  const blk = { id: "A1", comment: "Defensive fallback: the loader seeds every id, so a miss is not expected. Added in T-12 by Ann. The value is in cents.", line: 1, anchorLine: 2, scope: "body" };
  const problems = [];
  const facts = [{ fact: "fallback is defensive", flag: "KEEP", truth: "", source: "x.ts:9", protected: false, F: 0, C: 1 }, { fact: "added in T-12", flag: "HISTORY", truth: "", source: "", protected: false, F: 0, C: 0 }];
  const { rows } = R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "KEEP", facts, pointer: "", doc_sentence: "", after: "", sentences: [
    { from: ["S1"], action: "keep", text: "Fallback because the loader seeds ids.", why_rewrite: "", pitfall: "A miss would render an empty list.", facts: [1], tests: [] },
    { from: ["S2"], action: "cut", text: "", why_rewrite: "", pitfall: "", facts: [2], tests: [] }] }] }, [blk], problems);
  const r = rows[0];
  check("decisions: keep writes the original words, not the judge's", r.text[0] === "Defensive fallback: the loader seeds every id, so a miss is not expected.", JSON.stringify(r.text));
  check("decisions: an undecided sentence is cut (the default), with a PROBLEM", r.text.length === 1 && problems.some((p) => /S3 undecided; cut/.test(p)), JSON.stringify(r.text) + problems.join(" | "));
  check("decisions: a kept sentence carries its pitfall", r.sentences[0].pitfall === "A miss would render an empty list.", JSON.stringify(r.sentences[0]));
  check("decisions: the answer keeps its sentence record", r.sentences.length === 3 && r.sentences[1].action === "cut" && r.sentences[0].from[0] === "S1", JSON.stringify(r.sentences));
  const rw = R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "KEEP", facts, pointer: "", doc_sentence: "", after: "", sentences: [
    { from: ["S1", "S2"], action: "rewrite", text: "Defensive fallback: the loader seeds every id.", why_rewrite: "history", pitfall: "p", facts: [1], tests: [] },
    { from: ["S3"], action: "rewrite", text: "The value is in cents.", why_rewrite: "history", pitfall: "p", facts: [], tests: [] }] }] }, [blk], []).rows[0];
  check("decisions: a rewrite replaces all its sentences; one equal to the original is a keep", rw.text.join(" ") === "Defensive fallback: the loader seeds every id. The value is in cents." && rw.sentences[0].action === "rewrite" && rw.sentences[1].action === "keep", JSON.stringify(rw.sentences));
  // keep needs a pitfall: an empty one cuts the sentence, with a PROBLEM
  const np = [];
  const nop = R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "KEEP", pointer: "", facts,
    sentences: [{ from: ["S1"], action: "keep", text: "", why_rewrite: "", pitfall: "", facts: [1], tests: [] }, { from: ["S2", "S3"], action: "cut", text: "", why_rewrite: "", pitfall: "", facts: [], tests: [] }] }] }, [blk], np).rows[0];
  check("decisions: keep without a pitfall is cut; the block is CUT", nop.verdict === "CUT" && nop.text.length === 0 && np.some((p) => /S1 kept without a pitfall; cut/.test(p)), JSON.stringify(nop) + np.join(" | "));
  // an older answer with no pitfall field: only a silent failure (C 2) that is not findable keeps
  const legacy = (F, C) => R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "KEEP", pointer: "", facts: [{ ...facts[0], F, C }],
    sentences: [{ from: ["S1"], action: "keep", text: "", why_rewrite: "", facts: [1], tests: [] }, { from: ["S2", "S3"], action: "cut", text: "", why_rewrite: "", facts: [], tests: [] }] }] }, [blk], []).rows[0];
  check("decisions: older answer maps F/C: C 2 with F 0 keeps, F >= 1 or C < 2 cuts", legacy(0, 2).text.length === 1 && legacy(1, 2).verdict === "CUT" && legacy(0, 1).verdict === "CUT", JSON.stringify([legacy(0, 2).text, legacy(1, 2).verdict, legacy(0, 1).verdict]));
  // old-style answers align to the original sentences
  const cfacts = [...facts, { fact: "value is in cents", flag: "KEEP", truth: "", source: "x.ts:9", protected: false, F: 0, C: 2 }].map((f, i) => (i === 0 ? { ...f, C: 2 } : f));
  const old = R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "KEEP", facts: cfacts, pointer: "", text: ["The value is in cents.", "Fallback because the loader seeds every id, so a miss is not expected."], tests: [] }] }, [blk], []).rows[0];
  check("old-style text: an exact line is a keep, a paraphrase of its sentence (no rewrite reason) gets the original words", old.sentences[0].action === "keep" && old.sentences[0].from[0] === "S3" && old.sentences[1].action === "keep" && old.sentences[1].reverted === "rewrite reason" && old.sentences[1].from.join() === "S1", JSON.stringify(old.sentences));
}

// 2a-2e: deterministic checks of what the judge wrote
{
  const K = await import(path.join(SKILL, "checks.mjs"));
  check("2a: stray markers inside the text go (/** /**, */, * /), a glob stays", K.stripMarkers("/** /** Keyed by entity id. * /. */") === "Keyed by entity id." && K.stripMarkers("/** /** Keyed by entity id. */.") === "Keyed by entity id." && K.stripMarkers("Keyed by /** entity id.") === "Keyed by entity id." && K.stripMarkers("Globs src/**/*.ts stay.") === "Globs src/**/*.ts stay." && K.stripMarkers("See https://x.io/a now.") === "See https://x.io/a now.");
  check("2a: a garbled original loses its stray markers and empty pieces", JSON.stringify(K.blockSentences({ comment: "/** Keyed by entity id. * /." })) === JSON.stringify(["Keyed by entity id."]));
  {
    write(path.join(FIX, "garbled.ts"), "/** /** Keyed by entity id. * /. */\nexport const byId: Record<string, number> = {};\n");
    const gw = path.join(TMP, "work-garbled");
    write(path.join(gw, "files.txt"), "garbled.ts\n");
    spawnSync("node", [path.join(SKILL, "cc2.mjs"), "prepare", path.join(gw, "files.txt"), gw], { cwd: FIX });
    const gb = JSON.parse(fs.readFileSync(path.join(gw, "blocks", "garbled.ts.json"), "utf8"));
    const gr = R.toAnswers("garbled.ts", { blocks: [{ id: gb[0].id, verdict: "KEEP", pointer: "", facts: [], sentences: [{ from: ["S1"], action: "keep", text: "", why_rewrite: "", pitfall: "Keys by name would silently miss.", facts: [], tests: [] }] }] }, gb, []);
    write(path.join(gw, "answers", "garbled.ts.json"), JSON.stringify({ rows: gr.rows }));
    const ga = spawnSync("node", [path.join(SKILL, "cc2.mjs"), "apply", gw], { cwd: FIX, encoding: "utf8" });
    const gt = fs.readFileSync(path.join(FIX, "garbled.ts"), "utf8");
    check("2a: a garbled JSDoc is written back once, with no doubled marker", ga.status === 0 && gt.startsWith("/** Keyed by entity id. */\n") && !/\/\*\*\s*\/\*\*|\* \//.test(gt), ga.stdout + gt);
  }
  check("2a: markers stripped from written lines", K.stripMarkers("// // Pill hues.") === "Pill hues." && K.stripMarkers("{/* JSX note. */}") === "JSX note." && K.stripMarkers(" * @param a the id") === "@param a the id" && K.stripMarkers("*second* miss") === "*second* miss");
  const M = "lib/ts/money.ts";
  const mb = JSON.parse(spawnSync("node", [path.join(SKILL, "cc2.mjs"), "blocks", M], { cwd: FIX, encoding: "utf8" }).stdout);
  const blk = mb[0];
  const fact = (f, src = "lib/ts/money.ts:3") => ({ fact: f, flag: "KEEP", truth: "", source: src, protected: false, F: 0, C: 1 });
  const ans = (sentences, facts = [fact("rounds half away from zero"), fact("callers never pass NaN")]) => ({ blocks: [{ id: blk.id, verdict: "KEEP", facts, pointer: "", doc_sentence: "", after: "", sentences }] });
  const d = (from, action, text, tests = [], facts = [], why = "") => ({ from, action, text, why_rewrite: why, pitfall: ["keep", "rewrite"].includes(action) ? "Breaks silently." : "", facts, tests });
  // 2a through toAnswers
  let r = R.toAnswers(M, ans([d(["S1"], "rewrite", "// // Rounds half away from zero, so 0.5 is 1.", [], [1], "wrong"), d(["S2"], "keep", "")]), [blk], []).rows[0];
  check("2a: a judge line's own marker is gone", r.text[0] === "Rounds half away from zero, so 0.5 is 1.", JSON.stringify(r.text));
  // 2b tests: evidence for the verifier, never a "Pinned by" line
  r = R.toAnswers(M, ans([d(["S1"], "keep", "", ["tests/money.test.ts", "tests/names-only.test.ts"]), d(["S2"], "keep", "", ["tests/other.test.ts"])]), [blk], []);
  const t = r.rows[0].text;
  check("2b: no Pinned by line is written; the kept sentences only", t.length === 2 && t[0].startsWith("Rounds half") && t[1].startsWith("Defensive") && !t.join(" ").includes("Pinned by"), JSON.stringify(t));
  const kept = r.rows[0].sentences[0];
  check("2b: a test that imports (via tsconfig alias) and asserts is verifier evidence with its import and assertion lines", kept.risk.some((x) => x.kind === "tested") && kept.evidence.tests["tests/money.test.ts"].some((l) => /:1: import \{ roundCents \}/.test(l)) && kept.evidence.tests["tests/money.test.ts"].some((l) => /expect\(roundCents/.test(l)), JSON.stringify(kept));
  check("2b: a test naming the file only in a comment, or asserting something else, does not count (reason kept as evidence)", /imports neither/.test(kept.evidence.testsRejected?.["tests/names-only.test.ts"] ?? "") && /no assertion or call names/.test(r.rows[0].sentences[1].evidence.testsRejected?.["tests/other.test.ts"] ?? ""), JSON.stringify(r.rows[0].sentences));
  check("2b: a rejected test is no finding", !r.extraFindings.some((f) => /Pinned by|tests\//.test(f.claim)), JSON.stringify(r.extraFindings));
  const tm = R.testMentions(M, mb);
  check("2b: test lookups skip comment lines", tm.some((l) => l.startsWith("tests/money.test.ts:1:")) && !tm.some((l) => l.startsWith("tests/names-only.test.ts:2:")) && !tm.some((l) => l.startsWith("tests/other.test.ts:2:")), JSON.stringify(tm));
  // rule 4: tickets, dates and measured values in a kept sentence go to the checker
  const un = K.sentenceRisk({ action: "keep", text: "The badge needs 92px since AH-359 (2026-09-01), about 3×/day." }).find((x) => x.kind === "unstable");
  check("rule 4: a kept sentence with a ticket, date or measured value is risky (unstable)", un && /ticket: AH-359/.test(un.detail) && /date: 2026-09-01/.test(un.detail) && /measured: 92px/.test(un.detail), JSON.stringify(un));
  check("rule 4: a plain count is no measured value", !K.sentenceRisk({ action: "keep", text: "Exactly one of the 2 holders is set." }).some((x) => x.kind === "unstable"));
  // rewrite only to shorten or correct
  r = R.toAnswers(M, ans([d(["S1"], "rewrite", "Rounds half away from zero, so a value of 0.5 always becomes 1 here.", [], [1], "wrong"), d(["S2"], "rewrite", "Callers never pass NaN.", [], [2], "unclear")]), [blk], []).rows[0];
  check("rewrite: longer than the original, or with no allowed reason, gets the original words back", r.sentences[0].reverted === "expanded" && r.sentences[1].reverted === "rewrite reason" && r.text[0] === "Rounds half away from zero, so 0.5 becomes 1." && r.text[1] === "Defensive: callers never pass NaN.", JSON.stringify(r.sentences));
  r = R.toAnswers(M, ans([d(["S1"], "rewrite", "Rundet halb von null weg, also wird 0,5 zu 1 und nie anders gerundet.", [], [1], "untranslated"), d(["S2"], "cut")]), [blk], []).rows[0];
  check("rewrite: a translation may be longer", r.sentences[0].action === "rewrite" && !r.sentences[0].reverted, JSON.stringify(r.sentences[0]));
  // 2c qualifiers
  r = R.toAnswers(M, ans([d(["S1"], "keep", ""), d(["S2"], "rewrite", "Fallback because callers pass numbers.", [], [2], "wrong")]), [blk], []).rows[0];
  const q = r.sentences[1].risk.find((x) => x.kind === "qualifier");
  check("2c: a rewrite that drops defensive/never is risky with the lost words", q && /lost (?=.*\bdefensive\b)(?=.*\bnever\b)/.test(q.detail), JSON.stringify(r.sentences[1]));
  r = R.toAnswers(M, ans([d(["S1"], "rewrite", "Rounds half away from zero.", [], [1], "history"), d(["S2"], "keep", "")]), [blk], []).rows[0];
  check("2c: a lost number or example is a qualifier hit", /lost 0\.5, 1/.test(r.sentences[0].risk.find((x) => x.kind === "qualifier")?.detail ?? ""), JSON.stringify(r.sentences[0].risk));
  // 2d doc claims
  const ok = R.checkDocClaim('Setup is documented in docs/guide.md §"Setup": run the thing first.', M);
  const none = R.checkDocClaim('Setup is documented in docs/guide.md §"Teardown".', M);
  const loose = R.checkDocClaim("Rounding is the documented exception to the token rule.", M);
  check("2d: a doc claim whose section names its terms passes", ok?.ok === true, JSON.stringify(ok));
  check("2d: a doc claim naming a missing section says so", none && !none.ok && /no such section: docs\/guide\.md §Teardown/.test(none.evidence), JSON.stringify(none));
  check("2d: a doc claim naming no section is risky", loose && !loose.ok && loose.why === "names no doc section", JSON.stringify(loose));
  check("2d: no doc words, no doc claim", R.checkDocClaim("Rounds half away from zero.", M) === null);
  // 2e sources
  const cf = [];
  r = R.toAnswers(M, ans([d(["S1"], "rewrite", "Rounds half up.", [], [1], "wrong"), d(["S2"], "keep", "", [], [2])], [fact("rounds half away from zero", "comment"), fact("callers never pass NaN", "")]), [blk], cf);
  const row = r.rows[0];
  check("2e: an unsourced fact is never rewritten: original words back, KEEP?, risky", row.verdict === "KEEP?" && row.text[0] === "Rounds half away from zero, so 0.5 becomes 1." && row.sentences[0].reverted === "unsourced" && row.sentences.every((x) => x.risk.some((k) => k.kind === "unsourced")), JSON.stringify(row));
  check("2e: each unsourced sentence is an unsure finding", r.extraFindings.filter((f) => f.category === "unsure" && f.key).length === 2);
  check("2e: the block's own lines are no source", K.unsourced(`${M}:1-2`, M, blk) && !K.unsourced(`${M}:3`, M, blk) && K.unsourced("per comment", M, blk) && !K.unsourced("code", M, blk));
}

// DUPLICATE is a cut, C 2 or not, wherever the source is: nothing is written in its place
{
  const problems = [];
  const facts = (src) => [{ flag: "DUPLICATE", C: 2, F: 0, source: src, fact: "Same fact" }];
  const { rows } = R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "CUT", facts: facts("big.ts:12-14") }, { id: "A2", verdict: "CUT", facts: facts("app/main.go:3") }] },
    [{ id: "A1", comment: "x", anchorLine: 3 }, { id: "A2", comment: "y", anchorLine: 9 }], problems);
  check("DUPLICATE (C 2) adds no text and no reference", rows.every((r) => r.verdict === "CUT" && r.text.length === 0), JSON.stringify(rows.map((r) => r.text)));
}

// no Pinned by line, whatever the judge's tests, old-style answers included
{
  const T = "tests/big.test.ts";
  const lines = [12, 38, 59, 64, 170];
  const says = ["Legal is barred here.", "Checks access first.", "Unknown ids get 404.", "Admin reads bypass row security.", "Unknown ids get 404."];
  const blocks = lines.map((line, i) => ({ id: `A${i + 1}`, comment: says[i], line, anchorLine: line + 2 }));
  const { rows } = R.toAnswers("big.ts", { blocks: blocks.map((b, i) => ({ id: b.id, verdict: "KEEP", text: [says[i]], pointer: "", facts: [{ fact: says[i], flag: "KEEP", source: "big.ts:1", C: 2, F: 0 }], tests: [T] })) }, blocks, []);
  check("no Pinned by line is written for any block", rows.every((r, i) => JSON.stringify(r.text) === JSON.stringify([says[i]])), JSON.stringify(rows.map((r) => r.text)));
  const oldPin = R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "KEEP", pointer: "", facts: [{ fact: says[0], flag: "KEEP", source: "big.ts:1", C: 2, F: 0 }], text: [says[0], `Pinned by ${T}.`] }] }, blocks.slice(0, 1), []).rows[0];
  check("an old-style Pinned by line becomes evidence, not text", JSON.stringify(oldPin.text) === JSON.stringify([says[0]]), JSON.stringify(oldPin.text));
}

// a kept comment keeps its form; only a contract added to an interface makes JSDoc
{
  const one = ["Node runtime: the writer needs Buffer."];
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  check("form: a // comment stays //", eq(C.commentLines("a.ts", "", one, {}), ["// Node runtime: the writer needs Buffer."]));
  check("form: one-sentence JSDoc stays one line", eq(C.commentLines("a.ts", "", one, { docStyle: true }), ["/** Node runtime: the writer needs Buffer. */"]));
  check("form: a /* */ block stays a block", eq(C.commentLines("a.ts", "  ", one, { block: true }), ["  /* Node runtime: the writer needs Buffer. */"]));
  check("form: multi-line JSDoc keeps its frame", C.commentLines("a.ts", "", ["One.", "Two."], { docStyle: true }).join("\n") === "/**\n * One.\n * Two.\n */");
  check("form: an added contract makes JSDoc", C.commentLines("a.ts", "", one, { contract: true })[0].startsWith("/** "));
  // no additions: an added sentence (new-style `add`, or an old-style line with no original) is never written
  const addBlk = { id: "A1", comment: "Retries back off.", line: 1, anchorLine: 2, scope: "interface" };
  const keepFact = { fact: "Retries back off", flag: "KEEP", truth: "", source: "big.ts:1", C: 2, F: 0 };
  const na = R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "KEEP", pointer: "", facts: [keepFact, { fact: "missing: failure", flag: "KEEP", truth: "Throws when missing.", source: "big.ts:1" }],
    sentences: [{ from: ["S1"], action: "keep", text: "", why_rewrite: "", pitfall: "p", facts: [1], tests: [] }, { from: [], action: "add", text: "Throws when missing.", why_rewrite: "missing", pitfall: "p", facts: [2], tests: [] }] }] }, [addBlk], []);
  check("no additions: an added sentence is not written, and becomes an open missing-doc finding", eq(na.rows[0].text, ["Retries back off."]) && !na.rows[0].contract && na.extraFindings.some((f) => f.category === "missing-doc" && f.status === "open" && f.claim === "Throws when missing." && f.done === "Nothing written."), JSON.stringify(na));
  const nb = R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "KEEP", pointer: "", facts: [keepFact], text: ["Retries back off.", "Callers must retry twice."] }] }, [addBlk], []);
  check("no additions: an old-style line with no original is not written", eq(nb.rows[0].text, ["Retries back off."]) && nb.extraFindings.some((f) => f.category === "missing-doc"), JSON.stringify(nb));
  const judgeSchema = JSON.parse(fs.readFileSync(path.join(SKILL, "schemas", "judge.json"), "utf8"));
  const bs = judgeSchema.properties.files.items.properties.blocks.items.properties;
  check("no additions: the judge schema has no add action, no missing reason, no doc sentence", !bs.sentences.items.properties.action.enum.includes("add") && !bs.sentences.items.properties.why_rewrite.enum.includes("missing") && !bs.doc_sentence && !bs.after);
  // through apply: `//` above an export stays `//`
  write(path.join(FIX, "rt.ts"), `// Node runtime: the writer needs Buffer.\nexport const runtime = "nodejs";\n`);
  const work = path.join(TMP, "work-apply");
  write(path.join(work, "files.txt"), "rt.ts\n");
  const CC2 = path.join(SKILL, "cc2.mjs");
  spawnSync("node", [CC2, "prepare", path.join(work, "files.txt"), work], { cwd: FIX });
  write(path.join(work, "answers", "rt.ts.json"), JSON.stringify({ rows: [{ id: "A1", verdict: "KEEP", text: ["Node runtime: the writer needs Buffer."], route: "COMMENT", source: "" }] }));
  const ap = spawnSync("node", [CC2, "apply", work], { cwd: FIX, encoding: "utf8" });
  const out = fs.readFileSync(path.join(FIX, "rt.ts"), "utf8");
  check("form: apply keeps a one-line // above an export", ap.status === 0 && out.startsWith("// Node runtime: the writer needs Buffer.\nexport const"), ap.stdout + out);
}

// verifier: risky sentences only, with evidence; answers applied by the script
{
  const work = path.join(TMP, "work-verify");
  write(path.join(work, "files.txt"), "big.ts\n");
  spawnSync("node", [path.join(SKILL, "cc2.mjs"), "prepare", path.join(work, "files.txt"), work], { cwd: FIX });
  const blocks = JSON.parse(fs.readFileSync(path.join(work, "blocks", "big.ts.json"), "utf8"));
  const [b1, b2, b3, b4, b5] = blocks;
  write(path.join(work, "placed", "big.ts.json"), JSON.stringify(Object.fromEntries([b1, b2, b3, b4].map((b) => [b.id, { start: b.line, end: b.endLine }]))));
  const src = "big.ts:200";
  const fact = (f, C = 1, source = src) => ({ fact: f, flag: "KEEP", truth: "", source, protected: false, F: 0, C });
  const d = (from, action, text = "", facts = [], why = "", tests = []) => ({ from, action, text, why_rewrite: why, pitfall: ["keep", "rewrite"].includes(action) ? "Breaks silently." : "", facts, tests });
  const judged = { blocks: [
    { id: b1.id, verdict: "KEEP", facts: [fact("step 0")], pointer: "", doc_sentence: "", after: "", sentences: [d(["S1", "S2", "S3", "S4", "S5"], "keep", "", [1])] },
    { id: b2.id, verdict: "KEEP", facts: [fact("step 1")], pointer: "", doc_sentence: "", after: "", sentences: [d(["S1"], "rewrite", "Step 1 exists only for the admin role.", [1], "wrong", ["tests/big.test.ts"]), d(["S2", "S3", "S4", "S5"], "cut")] },
    { id: b3.id, verdict: "KEEP", facts: [fact("step 2", 1, "comment")], pointer: "", doc_sentence: "", after: "", sentences: [d(["S1", "S2", "S3", "S4", "S5"], "keep", "", [1])] },
    { id: b4.id, verdict: "KEEP", facts: [fact("step 3")], pointer: "", doc_sentence: "", after: "", sentences: [d(["S1"], "rewrite", "Step 3 explains why this helper exists.", [1], "history"), d(["S2", "S3", "S4", "S5"], "cut")] },
    { id: b5.id, verdict: "CUT", facts: [{ ...fact("step 4 order", 2), flag: "HISTORY" }], pointer: "", doc_sentence: "", after: "", sentences: [d(["S1", "S2", "S3", "S4", "S5"], "cut", "", [1])] },
  ] };
  const problems = [];
  const { rows, extraFindings } = R.toAnswers("big.ts", judged, blocks.slice(0, 5), problems);
  const answers = new Map([["big.ts", { rows }]]);
  const factsOf = new Map([["big.ts", new Map(judged.blocks.map((b) => [b.id, b.facts]))]]);
  const vp = R.verifyPack({ files: ["big.ts"] }, work, answers, factsOf);
  const keys = [...(vp?.items.keys() ?? [])].map((k) => k.split("\u0000")[1]);
  check("verify: every kept sentence is an item (plain keep, rewrite, unsourced keep), and a removed protected block; no pin items", keys.includes(`${b1.id}.1`) && keys.includes(`${b2.id}.1`) && !keys.some((x) => / pin /.test(x)) && keys.includes(`${b3.id}.1`) && keys.includes(`${b4.id}.1`) && keys.includes(`${b5.id} removed`), JSON.stringify(keys));
  const t = vp?.text ?? "";
  check("verify: an item gives the original, the new sentence, the pitfall and the script's notes", t.includes(`Original: "${b2.comment.split(". ")[0]}.`) && t.includes('Now: "Step 1 exists only for the admin role."') && t.includes("Pitfall (the writer's): Breaks silently.") && /Script notes: (?=.*rewritten \(wrong\))(?=.*qualifier \([^)]*added only)(?=.*security \(admin\))/.test(t), t.slice(t.indexOf(`### ${b2.id}.1`), t.indexOf(`### ${b2.id}.1`) + 600));
  check("verify: a sentence item carries its test's import and assertion lines", /Test tests\/big\.test\.ts \(imports the file; if it fails when the pitfall is triggered, the break is not silent\)/.test(t) && t.includes("tests/big.test.ts:1: import { step1 }") && t.includes("tests/big.test.ts:2: test(\"step1\""), t.slice(t.indexOf("Test tests"), t.indexOf("Test tests") + 400));
  check("verify: the code window is numbered and bounded", /\n +1 \| \/\/ Step 0/.test(t) && /⋮ lines \d+-\d+ not shown/.test(t));
  check("verify: the writer's source is shown per sentence", t.includes("(source: comment)"));
  // answers
  const findingsOf = new Map([["big.ts", [...extraFindings]]]);
  const k = (key) => key;
  const changed = R.applyVerify(vp, { files: [{ path: "big.ts", items: [
    { key: k(`${b1.id}.1`), status: "NO-PITFALL", correction: "", evidence: "tests/big.test.ts:2", note: "a test catches it" },
    { key: k(`${b2.id}.1`), status: "WRONG", correction: "restore original", evidence: "big.ts:9", note: "only is not in the code" },
    { key: k(`${b3.id}.1`), status: "OK", original_ok: true, correction: "", evidence: "big.ts:15", note: "" },
    { key: k(`${b5.id} removed`), status: "RESTORE", original_ok: true, correction: "", evidence: "", note: "order matters" },
  ] }] }, findingsOf);
  const row = (id) => rows.find((r) => r.id === id);
  check("apply verify: WRONG cuts the sentence (no restore), with an open wrong-info finding", row(b2.id).verdict === "CUT" && row(b2.id).text.length === 0 && findingsOf.get("big.ts").some((f) => f.category === "wrong-info" && f.status === "open" && f.done === "Sentence cut."), JSON.stringify(row(b2.id)));
  check("apply verify: NO-PITFALL cuts the sentence; a block left empty is CUT", row(b1.id).verdict === "CUT" && row(b1.id).text.length === 0 && row(b1.id).sentences[0].cutBy === "NO-PITFALL", JSON.stringify(row(b1.id)));
  check("apply verify: OK on the comment-only sentence lifts KEEP? and its note", row(b3.id).verdict === "KEEP" && !findingsOf.get("big.ts").some((f) => f.key?.startsWith(`${b3.id}.`)), row(b3.id).verdict);
  check("apply verify: no answer counts as UNSURE: original words, KEEP?", row(b4.id).verdict === "KEEP?" && row(b4.id).text[0] === "Step 3 explains line 0 of why this helper exists.", JSON.stringify(row(b4.id)));
  check("apply verify: RESTORE brings back the removed block's sentences word for word", row(b5.id).verdict === "KEEP" && row(b5.id).text.join(" ") === b5.comment, JSON.stringify(row(b5.id).text));
  check("apply verify: the file is marked changed", changed.has("big.ts"));
  // WRONG on a kept sentence whose original is wrong: cut, open finding with the correction
  const r2 = R.toAnswers("big.ts", { blocks: [{ id: b3.id, verdict: "KEEP", facts: [fact("step 2", 1, "comment")], pointer: "", doc_sentence: "", after: "", sentences: [d(["S1"], "keep", "", [1]), d(["S2", "S3", "S4", "S5"], "cut")] }] }, [b3], []).rows;
  const vp2 = R.verifyPack({ files: ["big.ts"] }, work, new Map([["big.ts", { rows: r2 }]]), new Map());
  const f2 = new Map([["big.ts", []]]);
  R.applyVerify(vp2, { files: [{ path: "big.ts", items: [{ key: `${b3.id}.1`, status: "WRONG", correction: "Step 2 is dead code.", evidence: "big.ts:15", note: "never called" }] }] }, f2);
  check("apply verify: WRONG kept sentence is cut with the correction in an open finding, never written", r2[0].verdict === "CUT" && !r2[0].text.join(" ").includes("dead code") && f2.get("big.ts").some((f) => f.status === "open" && /Step 2 is dead code/.test(f.if_wrong)), JSON.stringify(r2[0]) + JSON.stringify(f2.get("big.ts")));
  const r3 = R.toAnswers("big.ts", { blocks: [{ id: b3.id, verdict: "KEEP", facts: [fact("step 2", 1, "big.ts:9")], pointer: "", sentences: [d(["S1"], "keep", "", [1]), d(["S2", "S3", "S4", "S5"], "cut")] }] }, [b3], []).rows;
  const vp3 = R.verifyPack({ files: ["big.ts"] }, work, new Map([["big.ts", { rows: r3 }]]), new Map());
  R.applyVerify(vp3, { files: [{ path: "big.ts", items: [{ key: `${b3.id}.1`, status: "ELSEWHERE", correction: "", evidence: "docs/guide.md:3", note: "the guide states it" }] }] }, new Map([["big.ts", []]]));
  check("apply verify: ELSEWHERE cuts the sentence", r3[0].verdict === "CUT" && r3[0].sentences[0].cutBy === "ELSEWHERE", JSON.stringify(r3[0]));
  // nothing kept, no verifier call
  const pw = path.join(TMP, "work-plain-verify");
  write(path.join(pw, "files.txt"), "plain.ts\n");
  spawnSync("node", [path.join(SKILL, "cc2.mjs"), "prepare", path.join(pw, "files.txt"), pw], { cwd: FIX });
  const pb = JSON.parse(fs.readFileSync(path.join(pw, "blocks", "plain.ts.json"), "utf8"));
  const plain = R.toAnswers("plain.ts", { blocks: [{ id: pb[0].id, verdict: "CUT", facts: [{ ...fact("backs off", 1, "plain.ts:2"), flag: "NO-PITFALL" }], pointer: "", sentences: [d(["S1"], "cut", "", [1])] }] }, pb, []).rows;
  check("verify is skipped when nothing is kept", R.verifyPack({ files: ["plain.ts"] }, pw, new Map([["plain.ts", { rows: plain }]]), new Map()) === null, JSON.stringify(plain[0].sentences));
  const plainKept = R.toAnswers("plain.ts", { blocks: [{ id: pb[0].id, verdict: "KEEP", facts: [fact("backs off", 1, "plain.ts:2")], pointer: "", sentences: [d(["S1"], "keep", "", [1])] }] }, pb, []).rows;
  check("verify: a plain kept sentence (sourced, no number or security word) is still checked", R.verifyPack({ files: ["plain.ts"] }, pw, new Map([["plain.ts", { rows: plainKept }]]), new Map())?.items.size === 1);
  const args = R.claudeArgs({ system: "s", schema: {}, model: "m", maxTurns: R.VTURNS });
  check("verifier gets --max-turns 15 by default", args.join(" ").includes("--max-turns 15"), args.join(" "));
  const note = R.noVerifyFinding({ subtype: "error_max_turns", turns: 15, code: 0 });
  check("no verifier answer: one open unsure note", note.category === "unsure" && note.status === "open" && note.why.includes("error_max_turns"), JSON.stringify(note));
  const prompts = ["judge.md", "verify.md"].map((f) => fs.readFileSync(path.join(SKILL, "steps", f), "utf8")).join("\n") + R.lookups("big.ts", blocks).text;
  check("no prompt says not to look up or re-verify", !/do not (re-?verify|repeat)|already done/i.test(prompts), (prompts.match(/.{0,40}(do not (re-?verify|repeat)|already done).{0,40}/i) ?? [""])[0]);
}

// judge lookups: pointer sections, test lines, capped with a note
{
  const work = path.join(TMP, "work-look");
  write(path.join(work, "files.txt"), "ptr.ts\nbig.ts\n");
  spawnSync("node", [path.join(SKILL, "cc2.mjs"), "prepare", path.join(work, "files.txt"), work, "docs/guide.md"], { cwd: FIX });
  const ptrBlocks = JSON.parse(fs.readFileSync(path.join(work, "blocks", "ptr.ts.json"), "utf8"));
  const look = R.lookups("ptr.ts", ptrBlocks);
  check("lookups hold the section a pointer names", look.text.includes('docs/guide.md:3-6 "Setup"') && look.text.includes("Run the thing."), look.text.slice(0, 300));
  check("lookups hold test lines naming the file or its exports", look.text.includes("tests/ptr.spec.ts:1: import { setupThing }") && look.text.includes("tests/ptr.spec.ts:2:"), look.text);
  const bigBlocks = JSON.parse(fs.readFileSync(path.join(work, "blocks", "big.ts.json"), "utf8"));
  const tm = R.testMentions("big.ts", bigBlocks);
  check("test lines found by path and by export name", tm.some((l) => l.startsWith("tests/big.test.ts:1:")) && tm.some((l) => l.startsWith("tests/big.test.ts:2:")), JSON.stringify(tm));
  const small = R.lookups("ptr.ts", ptrBlocks, 100);
  check("lookups are capped and say what was cut", small.text.length < 450 && !small.text.includes("Run the thing.") && /Truncated at 100 characters: part or all of the pointer section, importer usage, test lines\./.test(small.text), small.text);
  const pack = R.buildPack({ files: ["ptr.ts"], docs: new Map([["ptr.ts", ["docs/guide.md"]]]) }, work);
  check("judge prompt shows a pointer's section once", pack.split("Run the thing.").length === 2, String(pack.split("Run the thing.").length - 1));
  const pack2 = R.buildPack({ files: ["big.ts"], docs: new Map([["big.ts", []]]) }, work);
  check("judge prompt lists the sentences of a multi-sentence block by id", /\nA1 S1: Step 0 explains line 0 of why this helper exists\.\nA1 S2: Step 0 explains line 1/.test(pack2) && !/A11 S1:/.test(pack2), pack2.slice(pack2.indexOf("## Sentences"), pack2.indexOf("## Sentences") + 200));
}

// split passes see a code window with the file's own line numbers
{
  const src = ['"use server";', "import {", "  a,", '} from "./a";', 'import b from "./b";', "", ...Array.from({ length: 200 }, (_, i) => (i === 100 ? "export const far = 1;" : `const x${i} = ${i};`))];
  const view = src.map((l, i) => `${String(i + 1).padStart(3)} ${(i === 150 ? "A1" : "").padEnd(4)}| ${l}`).join("\n") + "\n";
  const w = R.windowView(view, [{ id: "A1", line: 151, anchorLine: 152 }]).split("\n");
  const has = (n) => w.some((l) => l.startsWith(`${String(n).padStart(3)} `));
  check("window: import block, export lines and the block's surroundings", has(1) && has(4) && has(5) && has(107) && has(121) && has(151) && has(192) && !has(8) && !has(120) && !has(193), w.filter((l) => l.startsWith("⋮")).join(" / "));
  check("window: gaps are named with their line range", w.includes("⋮ lines 6-106 not shown") && w.at(-1) === "⋮ lines 193-206 not shown", w.filter((l) => l.startsWith("⋮")).join(" / "));
}

// CODEREF and POINTER take (group) and [param] folders
{
  const m = "src/app/(app)/x/[id]/route.ts:38-42".match(R.CODEREF);
  check("CODEREF matches a route path with (group) and [param]", m?.[1] === "src/app/(app)/x/[id]/route.ts", m?.[1]);
  const p = R.parsePointer('See docs/(guides)/[v2]/setup.md §"Install".');
  check("POINTER parses a doc path with (group) and [param]", p?.doc === "docs/(guides)/[v2]/setup.md" && p.anchor === "Install", JSON.stringify(p));
  check("POINTER with brackets resolves its section", Boolean(p && R.resolveAnchor(p.doc, p.anchor)));
  const s = R.parsePointer("docs/(guides)/[v2]/setup.md#install");
  check("POINTER slug form with brackets resolves", Boolean(s && R.resolveAnchor(s.doc, s.anchor)), JSON.stringify(s));
}

// pointers: wrapped bold lead-in, trailing full stop, quotes inside the anchor
{
  const res = (ptr) => { const p = R.parsePointer(ptr); return p && R.resolveAnchor(p.doc, p.anchor); };
  check("pointer to a bold lead-in wrapped over two lines resolves", res('docs/guide.md §"Retry policy"')?.kind === "lead-in");
  check("pointer with a trailing full stop resolves", Boolean(res('See docs/guide.md §"Setup".')));
  check("pointer with quotes inside the anchor resolves", res('docs/guide.md §"The "strict" mode"')?.title === 'The "strict" mode');
  const problems = [];
  const { rows } = R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "KEEP", text: [], pointer: 'See docs/guide.md §"Retry policy".', pointer_hard: "only the guide names the retry count", pointer_critical: "a second retry loop would double the calls", facts: [] }] }, [{ id: "A1", comment: "x", anchorLine: 3 }], problems);
  check("judge pointer to a wrapped lead-in is kept", rows[0].route === "DOC" && !problems.length, problems.join(" | "));
  // a pointer only to a hard-to-find, critical place: both reasons or no pointer
  const pp = [];
  const np = R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "KEEP", text: [], pointer: 'See docs/guide.md §"Setup".', pointer_hard: "", pointer_critical: "setup order matters", facts: [] }] }, [{ id: "A1", comment: "x", anchorLine: 3 }], pp);
  check("pointer: without a hard-to-find reason it is dropped and the block cut", np.rows[0].route === "COMMENT" && np.rows[0].verdict === "CUT" && pp.some((p) => /no hard-to-find and critical reason; dropped/.test(p)), JSON.stringify(np.rows[0]) + pp.join(" | "));
  const rp = R.toAnswers("big.ts", { blocks: [{ id: "A1", verdict: "KEEP", text: ["See app/main.go."], pointer: "", facts: [] }] }, [{ id: "A1", comment: "x", anchorLine: 3 }], []);
  check("pointer: an old-style reference line with no reasons is dropped", rp.rows[0].text.length === 0, JSON.stringify(rp.rows[0]));
  // an original pointer sentence that does not resolve is cut, even when kept, with a dead-ref finding
  write(path.join(FIX, "dead.ts"), `// Setup must run first.\n// See docs/guide.md §"Nowhere".\nexport function dead() { return 1; }\n`);
  const db = JSON.parse(spawnSync("node", [path.join(SKILL, "cc2.mjs"), "blocks", "dead.ts"], { cwd: FIX, encoding: "utf8" }).stdout);
  const dk = (from) => ({ from, action: "keep", text: "", why_rewrite: "", pitfall: "Setup out of order corrupts state.", facts: [], tests: [] });
  const dr = R.toAnswers("dead.ts", { blocks: [{ id: db[0].id, verdict: "KEEP", pointer: "", pointer_hard: "", pointer_critical: "", facts: [], sentences: [dk(["S1"]), dk(["S2"])] }] }, db, []);
  check("pointer: a kept original pointer that does not resolve is cut, with a dead-ref finding", JSON.stringify(dr.rows[0].text) === JSON.stringify(["Setup must run first."]) && dr.extraFindings.some((f) => f.category === "dead-ref" && f.done === "Sentence cut." && /Nowhere/.test(f.why)), JSON.stringify(dr));
}

// cc2.mjs: same path rule in its pointer scan, its pointer-line check and its tags
{
  const found = [...'See docs/(guides)/[v2]/setup.md §"Install" and (docs/guide.md).'.matchAll(C.POINTER)].map((m) => m[1]);
  check("cc2 pointer scan takes brackets, not surrounding parens", JSON.stringify(found) === JSON.stringify(["docs/(guides)/[v2]/setup.md", "docs/guide.md"]), JSON.stringify(found));
  const md = [...'[docs/guide.md](docs/guide.md)'.matchAll(C.POINTER)].map((m) => m[1]);
  check("cc2 pointer scan reads a markdown link as its two paths", md.every((d) => d === "docs/guide.md") && md.length === 2, JSON.stringify(md));
  const problems = [];
  const lines = C.blockText([{ id: "A1", verdict: "KEEP", text: ["Why."], route: "DOC", source: 'docs/(guides)/[v2]/setup.md §"Install"' }], problems);
  check("cc2 apply writes a bracketed doc pointer", lines.includes('See docs/(guides)/[v2]/setup.md §"Install"') && !problems.length, JSON.stringify(lines) + problems.join(" | "));
  check("cc2 pointer-line check agrees with the driver", C.POINTER_LINE.test('docs/(guides)/[v2]/setup.md §"Install"') && C.POINTER_LINE.test("docs/guide.md#setup") && !C.POINTER_LINE.test("src/x.ts"));
  check("cc2 tags skip a dated, ticket-like doc name", C.tagsOf("See docs/adr/2024-01-02-ADR-12.md for why.").length === 0, JSON.stringify(C.tagsOf("See docs/adr/2024-01-02-ADR-12.md for why.")));
  const q = C.pointersIn('See docs/guide.md §"The "strict" mode" for the rule.', new Map());
  check("cc2 pointer scan: quotes inside the anchor resolve", q.length === 1 && q[0].ok && q[0].anchor === 'The "strict" mode', JSON.stringify(q));
  const q2 = C.pointersIn('See docs/guide.md §"Setup" and the "strict" flag.', new Map());
  check("cc2 pointer scan: a later quoted word is not taken into the anchor", q2[0]?.ok && q2[0].anchor === "Setup", JSON.stringify(q2));
  write(path.join(FIX, "q.ts"), `// Strict mode rejects blanks.\n// See docs/guide.md §"The "strict" mode" for the rule.\nconst q = 1;\n`);
  const qb = spawnSync("node", [path.join(SKILL, "cc2.mjs"), "blocks", "q.ts"], { cwd: FIX, encoding: "utf8" });
  const qp = JSON.parse(qb.stdout || "[]")[0]?.pointers?.[0];
  check("cc2 blocks: a pointer with quotes in its anchor resolves", qp?.ok && qp.anchor === 'The "strict" mode', JSON.stringify(qp));
  check("cc2 tags still see a date in the text", C.tagsOf("Decided on 2024-01-02.").some((t) => t.startsWith("date")));
}

// pointer forms come from every tracked code file; outside git, from none
{
  const conv = R.repoConventions();
  check("pointer scan reads tracked .py and .go files outside src/", /Pointer form used in the code \(3 of 3 pointers\)/.test(conv), conv.split("\n").find((l) => /pointer/i.test(l)));
  process.chdir(PLAIN);
  let files = null;
  try { files = R.trackedCode(); } catch (e) { files = e.message; }
  check("pointer scan outside a git repo finds nothing, no throw", files === null, JSON.stringify(files));
  check("import graph outside a git repo falls back to src/ and tests/", C.trackedSources() === null);
  process.chdir(FIX);
  check("file-name counts come from tracked files outside src/", R.stemCount.get("tool") === 1 && R.stemCount.get("main") === 1, JSON.stringify([...R.stemCount]));
  const imp = (C.importGraph().get("big.ts") ?? []).map((x) => x.importer);
  check("import graph sees importers outside src/ and tests/", imp.includes(path.join("scripts", "use.ts")), JSON.stringify(imp));
}

// judge parts: at most --chunk blocks, whole and in order, balanced by lines
{
  const items = [9, 9, 9, 1, 1, 1, 1, 1, 1, 1];
  const parts = R.balancedParts(items.map((w, i) => ({ i, w })), (x) => x.w, 7);
  check("balancedParts keeps the part count, cap and order", parts.length === 2 && parts.every((p) => p.length <= 7) && parts.flat().every((x, k) => x.i === k), JSON.stringify(parts));
  check("balancedParts lowers the heaviest part (31 by block count)", Math.max(...parts.map((p) => p.reduce((n, x) => n + x.w, 0))) === 27);
  check("balancedParts of nothing is nothing", R.balancedParts([], () => 1, 5).length === 0);
}

check("--jobs defaults to 4", R.JOBS === 4, String(R.JOBS));

// ---------------------------------------------------------------- dry runs
// relative --files from a cwd other than the repo: the driver changes directory
const dry = (repo, work, extra = []) => spawnSync("node", [RUN, "--repo", repo, "--work", work, "--files", "files.txt", "--dry", ...extra], { cwd: TMP, encoding: "utf8" });
{
  const work = path.join(TMP, "work");
  const r = dry(FIX, work, ["--chunk", "10"]);
  const results = fs.existsSync(path.join(work, "results.jsonl")) ? fs.readFileSync(path.join(work, "results.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  check("dry run with a relative --files after the chdir", r.status === 0 && results[0]?.file === "big.ts" && results[0]?.status === "dry", (r.stderr || r.stdout).slice(-300));
  check("dry run: results.jsonl lines keep file, status, promptChars", results.every((x) => x.file && x.status && typeof x.promptChars === "number"), JSON.stringify(results[0]));
  check("dry run estimates the verifier's load (sentences risky if kept)", results[0]?.sentences === 65 && results[0]?.riskyIfKept === 65, JSON.stringify(results[0]));
  check("dry run logs the jobs default", /1 group\(s\), 4 at a time/.test(r.stdout), r.stdout.split("\n")[0]);
  const split = results[0]?.parts ?? [];
  const blocks = JSON.parse(fs.readFileSync(path.join(work, "big", "blocks", "big.ts.json"), "utf8"));
  const old = [];
  for (let i = 0; i < blocks.length; i += 10) old.push(blocks.slice(i, i + 10));
  if (old.length > 1 && old.at(-1).length < 10 / 3) old.at(-2).push(...old.pop());
  const oldLines = old.map((p) => p.reduce((n, b) => n + b.endLine - b.line + 1, 0));
  check("dry run: parts by lines beat parts by block count",
    split.length === old.length && split.every((p) => p.blocks <= 10) && split.reduce((n, p) => n + p.blocks, 0) === blocks.length && Math.max(...split.map((p) => p.lines)) < Math.max(...oldLines),
    `old ${oldLines.join("/")} lines, new ${split.map((p) => `${p.blocks}b/${p.lines}l`).join(", ")}`);
  check("dry run writes one prompt per part", split.every((_, k) => fs.existsSync(path.join(work, "big", `prompt-judge${k}.md`))));
  const last = fs.readFileSync(path.join(work, "big", `prompt-judge${split.length - 1}.md`), "utf8");
  const firstLine = fs.readFileSync(path.join(work, "big", "view", "big.ts.txt"), "utf8").split("\n")[0];
  check("dry run: a split pass gets a window, not the whole file", !last.includes(firstLine) && /⋮ lines 1-\d+ not shown/.test(last) && last.includes("sed -n 'a,bp' big.ts"), firstLine);
  const prompt = fs.readFileSync(path.join(work, "big", "prompt-judge.md"), "utf8");
  check("dry run: the unsplit prompt keeps the whole file", prompt.includes(firstLine) && !prompt.includes("not shown"));
  check("dry run prompt shows the repo's pointer form", prompt.includes('See docs/guide.md §"Setup"'));
}
{
  const work = path.join(TMP, "work-plain");
  const r = dry(PLAIN, work);
  const prompt = path.join(work, "big", "prompt-judge.md");
  check("dry run on a repo without git", r.status === 0 && fs.existsSync(prompt) && fs.readFileSync(prompt, "utf8").includes("No pointers to docs exist in the code yet"), (r.stderr || r.stdout).slice(-300));
}

// replay: saved answers through the script with no agent, from a work folder and from fixtures
{
  const REPLAY = path.join(SKILL, "test", "replay.mjs");
  const M = "lib/ts/money.ts";
  const blocks = JSON.parse(spawnSync("node", [path.join(SKILL, "cc2.mjs"), "blocks", M], { cwd: FIX, encoding: "utf8" }).stdout);
  const oldStyle = { id: blocks[0].id, verdict: "KEEP", pointer: "", doc_sentence: "", after: "",
    facts: [{ fact: "rounds half away from zero", flag: "KEEP", truth: "true", source: "comment", protected: false, F: 0, C: 2 }, { fact: "callers never pass NaN", flag: "KEEP", truth: "", source: "lib/ts/money.ts:3", protected: false, F: 0, C: 2 }],
    text: ["// Rounds half up.", "Callers pass numbers."], tests: ["tests/names-only.test.ts"] };
  const g = path.join(TMP, "work-replay", "lib-ts-money");
  write(path.join(g, "judge.json"), JSON.stringify({ files: [{ path: M, blocks: [oldStyle], findings: [], docfixes: [] }] }));
  write(path.join(g, "blocks", M + ".json"), JSON.stringify(blocks));
  const r = spawnSync("node", [REPLAY, FIX, path.dirname(g)], { encoding: "utf8" });
  check("replay of a saved work folder: reverted, risky and tests that do not count printed", r.status === 0 && /reverted: rewrite reason\) RISKY unsourced/.test(r.stdout) && /test does not count: tests\/names-only\.test\.ts: /.test(r.stdout) && /1 file\(s\): 2 sentences written, 1 risky, 1 tests not counted/.test(r.stdout), (r.stdout + r.stderr).slice(-900));
  const fx = path.join(TMP, "cases.json");
  write(fx, JSON.stringify({ cases: [
    { case: "old", cause: "paraphrase drops a qualifier", file: M, block: blocks[0].id, answer: { ...oldStyle, tests: [] }, wrong: "Callers pass numbers" },
    { case: "new", cause: "pin by name only", file: M, block: blocks[0].id, answer: { ...oldStyle, text: undefined, tests: undefined, sentences: [{ from: ["S1", "S2"], action: "keep", text: "", why_rewrite: "", facts: [2], tests: ["tests/names-only.test.ts"] }] }, pin: "tests/names-only.test.ts" },
    { case: "miss", cause: "a block the file does not have", file: "plain.ts", block: "A9", answer: { id: "A1", verdict: "KEEP", pointer: "", doc_sentence: "", after: "", facts: [{ fact: "backs off", flag: "KEEP", truth: "", source: "plain.ts:2", protected: false, F: 0, C: 2 }], text: ["Retries back off on conflict, so a burst settles."], tests: [] }, wrong: "Retries back off" }] }));
  // fixtures name their commit: a working tree that differs is replayed from that commit
  {
    const HR = path.join(TMP, "headrepo");
    write(path.join(HR, "package.json"), "{}\n");
    write(path.join(HR, ".gitignore"), "node_modules\n");
    fs.mkdirSync(path.join(HR, "node_modules"), { recursive: true });
    fs.symlinkSync(tsDir, path.join(HR, "node_modules", "typescript"));
    write(path.join(HR, "m.ts"), "// Keep this.\nconst a = 1;\n// Rounds half away from zero, so 0.5 becomes 1.\nexport function r(x: number) { return Math.round(x) + a; }\n");
    const g = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: HR, encoding: "utf8" });
    g("init", "-q"); g("add", "-A"); g("commit", "-q", "-m", "one");
    const first = g("rev-parse", "HEAD").trim();
    write(path.join(HR, "m.ts"), "const a = 1;\nexport function r(x: number) { return Math.round(x) + a; }\n");
    g("commit", "-q", "-am", "two");
    const hx = path.join(TMP, "head-cases.json");
    const hcase = { case: "h", cause: "block gone on HEAD", file: "m.ts", block: "A2", answer: { id: "A2", verdict: "KEEP", pointer: "", facts: [{ fact: "rounds half away", flag: "KEEP", truth: "", source: "m.ts:4", protected: false, F: 0, C: 2 }], text: ["Rounds half up."], tests: [] }, wrong: "Rounds half up" };
    write(hx, JSON.stringify({ commit: first, cases: [hcase] }));
    const copies = () => fs.readdirSync(os.tmpdir()).filter((d) => d.startsWith("cc2-replay-")).length;
    const before = copies();
    const h = spawnSync("node", [REPLAY, HR, "--fixtures", hx], { encoding: "utf8" });
    check("replay fixtures: a HEAD without the block replays the fixture's commit", h.status === 0 && /1 fixture file\(s\) differ from [0-9a-f]+ .*replaying on a copy of the tree/.test(h.stdout) && /ok   case h /.test(h.stdout) && g("status", "--short") === "", h.stdout.slice(-600) + h.stderr);
    write(hx, JSON.stringify({ cases: [hcase] }));
    const h2 = spawnSync("node", [REPLAY, HR, "--fixtures", hx], { encoding: "utf8" });
    check("replay fixtures: without a commit, the working tree is used (and the block is missing)", h2.status === 1 && /FAIL case h: no block A2 in m\.ts/.test(h2.stdout), h2.stdout.slice(-300));
    check("replay fixtures: the copy is removed afterwards", copies() === before, String(copies()));
  }
  const f = spawnSync("node", [REPLAY, FIX, "--fixtures", fx], { encoding: "utf8" });
  check("replay fixtures: caught cases pass, an uncaught one fails the run", f.status === 1 && /ok   case old .*wrong sentence gone \(reverted to the original words: rewrite reason\)/.test(f.stdout) && /ok   case new .*no pin written; the test does not count/.test(f.stdout) && /FAIL case miss: no block A9 in plain\.ts/.test(f.stdout) && /ok   case old .*\[/.test(f.stdout) && /1 case\(s\) not caught/.test(f.stdout), f.stdout.slice(-900) + f.stderr);
}

if (!failed) fs.rmSync(TMP, { recursive: true, force: true });
console.log(failed ? `${failed} check(s) failed; fixture kept in ${TMP}` : "all checks passed");
process.exit(failed ? 1 : 0);
