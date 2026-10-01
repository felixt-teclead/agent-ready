#!/usr/bin/env node
// Replays the script's steps after the judge on saved answers, with no agent:
// toAnswers (sentence decisions; old-style text answers aligned to the original
// sentences), the deterministic checks 2a-2e, risk marking, and the verifier's
// item list. Prints per block the risky sentences and the tests named as evidence.
//
//   node test/replay.mjs <repo> <work>                 a saved run: <work>[/<group>]/judge.json + blocks/
//   node test/replay.mjs <repo> --fixtures [<file>]    traced cases (default test/fixtures/traced-cases.json):
//                                                     each wrong sentence must be gone or a verifier item, and no
//                                                     "Pinned by" line written; exit 1 otherwise
//
// <repo> is read only: the files as the judge saw them (for a saved run, check
// out the commit the run started from) with typescript in node_modules. A
// fixture file may name its `commit`: when a fixture file in the working tree
// differs from that commit, the cases run on a copy of the tree at that commit
// (git archive into the temp dir, node_modules linked), whatever is checked out.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SKILL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [repoArg, mode, extra] = process.argv.slice(2);
if (!repoArg || !mode) { console.error("usage: replay.mjs <repo> <work> | <repo> --fixtures [<file>]"); process.exit(2); }
const WORK = mode === "--fixtures" ? null : path.resolve(mode);
const REPO = path.resolve(repoArg);
const fx = WORK ? null : JSON.parse(fs.readFileSync(extra ? path.resolve(SKILL, extra) : path.join(SKILL, "test", "fixtures", "traced-cases.json"), "utf8"));
let snapshot = null;
if (fx?.commit) {
  const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "pipe"] });
  try { git("cat-file", "-e", `${fx.commit}^{commit}`); }
  catch { console.error(`the fixtures need commit ${fx.commit}, which ${REPO} does not have`); process.exit(2); }
  const differ = [...new Set(fx.cases.map((c) => c.file))].filter((f) => {
    let at;
    try { at = git("show", `${fx.commit}:./${f}`); } catch { return true; }
    try { return fs.readFileSync(path.join(REPO, f), "utf8") !== at; } catch { return true; }
  });
  if (differ.length) {
    snapshot = fs.mkdtempSync(path.join(os.tmpdir(), "cc2-replay-"));
    execFileSync("bash", ["-c", 'git -C "$1" archive "$2" | tar -x -C "$3"', "-", REPO, fx.commit, snapshot]);
    if (fs.existsSync(path.join(REPO, "node_modules"))) fs.symlinkSync(path.join(REPO, "node_modules"), path.join(snapshot, "node_modules"));
    // tracked files decide pointer forms and file-name counts, as on a checkout
    execFileSync("git", ["init", "-q"], { cwd: snapshot });
    execFileSync("git", ["add", "-A"], { cwd: snapshot });
    console.log(`${differ.length} fixture file(s) differ from ${fx.commit} in ${REPO}; replaying on a copy of the tree at ${fx.commit}`);
    process.on("exit", () => fs.rmSync(snapshot, { recursive: true, force: true }));
  }
}
process.chdir(snapshot ?? REPO);
const R = await import(path.join(SKILL, "cc2-run.mjs"));

const blocksFor = (file) => JSON.parse(execFileSync("node", [path.join(SKILL, "cc2.mjs"), "blocks", file], { encoding: "utf8", maxBuffer: 1 << 26 }));
const DETERMINISTIC = new Set(["qualifier", "doc", "unsourced"]);
const kinds = (s) => [...new Set((s.risk ?? []).map((r) => r.kind))];
const clip = (t, n = 110) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

// One file's answer through the script: rows, tests that did not count, the verifier's items.
function replay(file, fo, blocks) {
  const problems = [];
  const { rows } = R.toAnswers(file, fo, blocks, problems);
  const factsOf = new Map([[file, new Map((fo?.blocks ?? []).map((b) => [b.id, b.facts ?? []]))]]);
  const vp = R.verifyPack({ files: [file] }, null, new Map([[file, { rows }]]), factsOf, { usePlaced: false, blocksOf: new Map([[file, blocks]]) });
  const rejected = rows.flatMap((r) => (r.sentences ?? []).flatMap((s) => Object.entries(s.evidence?.testsRejected ?? {}).map(([t, why]) => ({ id: r.id, test: t, why }))));
  return { rows, rejected, problems, vp };
}
function print(file, { rows, rejected, problems, vp }) {
  console.log(`\n${file}`);
  for (const row of rows) {
    console.log(`  ${row.id} ${row.verdict}${row.source ? ` (pointer ${row.source}${row.pointerRisk ? ", new: risky" : ""})` : ""}`);
    for (const s of row.sentences ?? []) {
      if (s.action === "cut") { console.log(`    ${s.key} cut ${s.from.join("+")}`); continue; }
      const k = kinds(s);
      console.log(`    ${s.key} ${s.action}${s.from.length ? ` ${s.from.join("+")}` : ""}${s.reverted ? ` (reverted: ${s.reverted})` : ""} ${k.length ? `RISKY ${(s.risk ?? []).map((r) => `${r.kind}${r.detail ? `: ${clip(r.detail, 60)}` : ""}`).join("; ")}` : "ok"} | ${clip(s.text)}`);
      for (const t of Object.keys(s.evidence?.tests ?? {})) console.log(`      test evidence: ${t}`);
    }
    for (const d of rejected.filter((x) => x.id === row.id)) console.log(`    test does not count: ${d.test}: ${d.why}`);
  }
  for (const p of problems) console.log(`  PROBLEM ${p}`);
  const written = rows.flatMap((r) => (r.sentences ?? []).filter((s) => s.action !== "cut" && s.action !== "ref" && s.text));
  const risky = written.filter((s) => kinds(s).length).length;
  console.log(`  sentences written ${written.length}, risky ${risky}, tests not counted ${rejected.length}, verifier items ${vp?.items.size ?? 0}, verifier prompt ${vp?.text.length ?? 0} chars`);
  return { written: written.length, risky, rejected: rejected.length, items: vp?.items.size ?? 0, chars: vp?.text.length ?? 0 };
}

if (WORK) {
  // a run folder holds group folders; a group folder holds judge.json and blocks/
  const groups = fs.existsSync(path.join(WORK, "judge.json")) ? [WORK] : fs.readdirSync(WORK).map((d) => path.join(WORK, d)).filter((d) => fs.existsSync(path.join(d, "judge.json")));
  if (!groups.length) { console.error(`no judge.json under ${WORK}`); process.exit(2); }
  const total = { written: 0, risky: 0, rejected: 0, items: 0, chars: 0, files: 0 };
  for (const g of groups) {
    const judge = JSON.parse(fs.readFileSync(path.join(g, "judge.json"), "utf8"));
    for (const fo of judge.files ?? []) {
      const bf = path.join(g, "blocks", fo.path + ".json");
      const blocks = fs.existsSync(bf) ? JSON.parse(fs.readFileSync(bf, "utf8")) : blocksFor(fo.path);
      const t = print(fo.path, replay(fo.path, fo, blocks));
      for (const k of Object.keys(t)) total[k] += t[k];
      total.files++;
    }
  }
  console.log(`\n${total.files} file(s): ${total.written} sentences written, ${total.risky} risky, ${total.rejected} tests not counted, ${total.items} verifier items, ${total.chars} verifier prompt chars`);
} else {
  let failed = 0;
  const summary = [];
  for (const c of fx.cases) {
    const blocks = blocksFor(c.file).filter((b) => b.id === c.block);
    if (!blocks.length) { console.log(`FAIL case ${c.case}: no block ${c.block} in ${c.file}`); failed++; continue; }
    const r = replay(c.file, { path: c.file, blocks: [c.answer] }, blocks);
    print(c.file, r);
    const row = r.rows[0];
    const out = [];
    let ok = true, det = false;
    if (row.text.some((l) => /^\s*(\/\/|\/\*|\*)/.test(l))) { ok = false; out.push("a written line keeps a comment marker"); }
    if (c.wrong) {
      const s = row.sentences.find((x) => x.action !== "cut" && x.text.includes(c.wrong));
      if (!s) {
        const gone = !row.text.some((l) => l.includes(c.wrong));
        const how = row.sentences.find((x) => x.nopitfall) ?? row.sentences.find((x) => x.reverted || x.action === "cut");
        if (gone) { det = true; out.push(`wrong sentence gone (${how?.nopitfall ? "cut: no pitfall" : how?.reverted ? `reverted to the original words: ${how.reverted}` : "cut"})`); } else { ok = false; out.push("wrong sentence still written, unmarked"); }
        // the original words that came back are themselves checked when they carry the claim
        const back = row.sentences.find((x) => x.reverted && x.action !== "cut");
        if (back) out.push(`original words kept (pitfall "${clip(back.pitfall ?? "", 40)}"), verifier item${kinds(back).length ? ` (notes: ${kinds(back).join(", ")})` : ""}`);
      } else if (r.vp?.items.has(`${c.file}\u0000${s.key}`)) {
        // every kept sentence goes to the verifier, with the script's notes as evidence
        const k = kinds(s);
        if (k.some((x) => DETERMINISTIC.has(x))) det = true;
        out.push(`wrong sentence kept, verifier item${k.length ? ` (notes: ${k.join(", ")})` : ""}`);
      } else { ok = false; out.push("wrong sentence written and NOT checked"); }
    }
    if (c.pin) {
      // no pin is ever written; the test is evidence for the verifier on a kept sentence
      const s = row.sentences.find((x) => x.action !== "cut" && (x.evidence?.tests?.[c.pin] || x.evidence?.testsRejected?.[c.pin]));
      if (row.text.some((l) => /Pinned by/.test(l) || l.includes(c.pin))) { ok = false; out.push("pin written"); }
      else if (!s) { det = true; out.push("no pin written (its sentence is cut)"); }
      else if (s.evidence.tests?.[c.pin]) out.push(`no pin written; the test is verifier evidence (${s.evidence.tests[c.pin].length} import/assertion lines) for "${clip(s.text, 50)}"`);
      else { det = true; out.push(`no pin written; the test does not count: ${s.evidence.testsRejected[c.pin]}`); }
    }
    if (!ok) failed++;
    summary.push(`${ok ? "ok  " : "FAIL"} case ${c.case} (${c.cause}): ${out.join("; ")}${ok ? (det ? " [deterministic check]" : " [verifier with evidence]") : ""}`);
  }
  console.log("\n" + summary.join("\n"));
  console.log(failed ? `${failed} case(s) not caught` : `all ${fx.cases.length} cases caught`);
  process.exit(failed ? 1 : 0);
}
