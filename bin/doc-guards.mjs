#!/usr/bin/env node
// doc-guards — documentation guards for agent-steered repos.
//
// Ships one real assertion (#4, rule 7): every cited doc path resolves, with a
// vacuity floor so a broken scanner cannot pass as a clean repo. A second guard
// (index) wakes up only once docs/architecture/ exists.
//
// Zero runtime dependencies, single file, Node 22+. It is deliberately
// independent of the repo's test runner: a Python or Go repo gets the guard
// without adopting vitest.
//
// Exit codes: 0 pass · 1 violation · 2 could not run (vacuity floor, bad
// config, missing root) · 3 internal error.

import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";

const DEFAULTS = {
  root: ".",
  scan: {
    extensions: ["md", "yml", "yaml", "ts", "tsx", "js", "mjs", "mts", "py", "go", "sql"],
    exempt: [],
  },
  citations: {
    enabled: true,
    minCitations: 10,
    targetExtensions: ["md"],
    rootDocs: ["CLAUDE.md", "AGENTS.md", "CONTEXT.md", "CONTEXT-MAP.md", "README.md"],
    // A bare directory citation is off by default. Measured over verum: 252 of
    // 381 failures were directories, and almost all were prose fragments —
    // `lib/`, `notes/`, `${p}/` — not claims about a path. Opt in per repo.
    directories: false,
    // Extra prefixes to try when a citation is not repo-relative. verum writes
    // `shared-extraction/SKILL.md` for a skill under .claude/skills/.
    resolveRoots: [],
    allowMissing: [],
  },
  index: {
    enabled: true,
    file: "docs/ARCHITECTURE.md",
    domainDir: "docs/architecture",
  },
};

// ---------------------------------------------------------------- config

function loadConfig(root, explicit) {
  const path = explicit ?? join(root, "doc-guards.config.json");
  if (!existsSync(path)) {
    if (explicit) fail(2, `config not found: ${path}`);
    return merge(DEFAULTS, {});
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(2, `config is not valid JSON: ${path} — ${e.message}`);
  }
  return merge(DEFAULTS, raw);
}

function merge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) ? merge(base[k] ?? {}, v) : v;
  }
  return out;
}

// Every exemption is an object carrying a reason. A bare string is rejected —
// that is how "state your reason" survives the move out of a Map<key, reason>
// into JSON: the shape keeps enforcing it, no reviewer discipline needed.
function validateLedger(entries, where) {
  if (!Array.isArray(entries)) fail(2, `${where} must be an array`);
  entries.forEach((e, i) => {
    if (typeof e !== "object" || e === null || Array.isArray(e))
      fail(2, `${where}[${i}] must be an object with a reason, not ${JSON.stringify(e)}`);
    if (typeof e.reason !== "string" || e.reason.trim() === "")
      fail(2, `${where}[${i}] needs a non-empty "reason"`);
  });
}

// ---------------------------------------------------------------- globs

function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") {
          i++;
          re += "(?:.*/)?";
        } else re += ".*";
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

// ---------------------------------------------------------------- file list

// git ls-files, not a directory walk: gitignored trees and nested worktrees
// never enter the scan set.
function listFiles(root) {
  try {
    const out = execFileSync("git", ["-C", root, "ls-files", "-z"], { encoding: "utf8" });
    return out.split("\0").filter(Boolean);
  } catch {
    const acc = [];
    (function walk(dir) {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === ".git" || e.name === "node_modules") continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else acc.push(relative(root, p).split(sep).join("/"));
      }
    })(root);
    return acc;
  }
}

// ---------------------------------------------------------------- citations

// Fenced code blocks hold examples, not claims: a tree diagram naming
// 0001-event-sourced-orders.md cites nothing. Blank the fences but keep the
// line count, so reported line numbers stay true.
function blankFences(text) {
  const lines = text.split("\n");
  let fence = null;
  return lines
    .map((line) => {
      const m = line.match(/^\s*(```+|~~~+)/);
      if (fence) {
        const closed = m && m[1][0] === fence[0] && m[1].length >= fence.length;
        if (closed) fence = null;
        return "";
      }
      if (m) {
        fence = m[1];
        return "";
      }
      return line;
    })
    .join("\n");
}

// A citation is a path in backticks or a markdown link target. A filename-shaped
// token in running prose is not one — that distinction is what keeps the first
// run from drowning in false positives, which costs more credibility than the
// bug the guard catches.
function citationsIn(text, cfg) {
  const targetExt = new RegExp(`\\.(?:${cfg.targetExtensions.join("|")})$`, "i");
  const roots = new Set(cfg.rootDocs);
  const found = [];
  blankFences(text)
    .split("\n")
    .forEach((line, i) => {
      const raw = [];
      // Take the link target and remove the whole link, so a backticked label —
      // `[`architecture/x.md`](../architecture/x.md)` — is not read a second time
      // as a citation relative to the wrong base.
      const rest = line.replace(/\[[^\]]*\]\(([^)\s]+)\)/g, (_, target) => {
        raw.push(target);
        return " ";
      });
      for (const m of rest.matchAll(/`([^`\n]+)`/g)) raw.push(m[1]);
      for (let cand of raw) {
        cand = cand.replace(/[.,;:]+$/, "").replace(/#.*$/, "").trim();
        if (!cand || /^(https?:|mailto:|#|\/)/.test(cand)) continue;
        if (/\s/.test(cand)) continue;
        // A placeholder or a glob is a shape, not a path: `src/<context>/docs/adr/`
        // and `docs/architecture/*.md` name a family of files, and demanding they
        // resolve would make the guard's first run mostly noise.
        if (/[<>*?\\]/.test(cand)) continue;
        const isDir = cand.endsWith("/");
        if (isDir && !cfg.directories) continue;
        if (!isDir && !targetExt.test(cand)) continue;
        if (!cand.includes("/") && !roots.has(cand)) continue;
        found.push({ path: cand, line: i + 1 });
      }
    });
  return found;
}

function guardCitations(root, cfg, files) {
  validateLedger(cfg.allowMissing, "citations.allowMissing");
  const allowed = new Map(cfg.allowMissing.map((e) => [e.path, e.reason]));
  const violations = [];
  let checked = 0;

  for (const file of files) {
    const text = readFileSync(join(root, file), "utf8");
    for (const { path, line } of citationsIn(text, cfg)) {
      checked++;
      if (allowed.has(path)) continue;
      const target = path.replace(/^\.\//, "");
      const fromRoot = resolve(root, target);
      const fromFile = resolve(root, dirname(file), path);
      const candidates = [fromRoot, fromFile, ...cfg.resolveRoots.map((r) => resolve(root, r, target))];
      if (candidates.some(existsSync)) continue;
      violations.push({ file, line, message: `cited path does not resolve: ${path}` });
    }
  }
  return { checked, violations, floor: cfg.minCitations };
}

// ---------------------------------------------------------------- index

// Flat first: docs/ARCHITECTURE.md ships as one file and the index/domain split
// is adopted at the first split (#4, rule 4). So this guard has no subject until
// docs/architecture/ exists, and skipping is the correct answer, not a failure.
function guardIndex(root, cfg) {
  const indexPath = join(root, cfg.file);
  const dirPath = join(root, cfg.domainDir);
  if (!existsSync(dirPath) || !statSync(dirPath).isDirectory())
    return { skipped: `${cfg.domainDir} does not exist — architecture is still flat` };
  if (!existsSync(indexPath))
    return { violations: [{ file: cfg.file, line: 1, message: `${cfg.domainDir} exists but ${cfg.file} does not` }] };

  const text = readFileSync(indexPath, "utf8");
  const base = cfg.domainDir.split("/").pop();
  const linked = new Set(
    [...text.matchAll(new RegExp(`\\]\\((?:\\./)?(?:${base}|${cfg.domainDir})/([\\w.-]+\\.md)\\)`, "g"))].map((m) => m[1]),
  );
  const onDisk = new Set(readdirSync(dirPath).filter((n) => n.endsWith(".md")));
  const violations = [];
  for (const n of onDisk) if (!linked.has(n)) violations.push({ file: cfg.file, line: 1, message: `${cfg.domainDir}/${n} is not listed in the index` });
  for (const n of linked) if (!onDisk.has(n)) violations.push({ file: cfg.file, line: 1, message: `index lists ${cfg.domainDir}/${n}, which does not exist` });
  return { violations, checked: onDisk.size };
}

// ---------------------------------------------------------------- report

// process.exit() truncates a buffered stdout write on a pipe, so nothing here
// exits the process: it throws, and the bottom of the file sets process.exitCode
// and lets the stream drain.
class Bail extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function fail(code, message) {
  throw new Bail(code, message);
}

function report(results, format) {
  const violations = results.flatMap((r) => (r.violations ?? []).map((v) => ({ guard: r.guard, ...v })));
  if (format === "json") {
    process.stdout.write(JSON.stringify({ results, violations }, null, 2) + "\n");
    return;
  }
  if (format === "github") {
    for (const v of violations) process.stdout.write(`::error file=${v.file},line=${v.line}::[${v.guard}] ${v.message}\n`);
  }
  for (const r of results) {
    if (r.skipped) {
      process.stdout.write(`- ${r.guard}: skipped — ${r.skipped}\n`);
      continue;
    }
    const n = (r.violations ?? []).length;
    process.stdout.write(`- ${r.guard}: ${n === 0 ? "pass" : `${n} violation${n === 1 ? "" : "s"}`} (${r.checked} checked)\n`);
    for (const v of r.violations ?? []) process.stdout.write(`    ${v.file}:${v.line} — ${v.message}\n`);
  }
}

// ---------------------------------------------------------------- main

function main(argv) {
  const args = { format: "text", only: null, config: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "check") continue;
    else if (a === "--format") args.format = argv[++i];
    else if (a === "--only") args.only = argv[++i].split(",");
    else if (a === "--config") args.config = argv[++i];
    else if (a === "--root") args.root = argv[++i];
    else if (a === "--help" || a === "-h") {
      process.stdout.write("usage: doc-guards [check] [--root <dir>] [--config <path>] [--only citations,index] [--format text|json|github]\n");
      return 0;
    } else fail(2, `unknown argument: ${a}`);
  }

  const root = resolve(args.root ?? ".");
  if (!existsSync(root)) fail(2, `root does not exist: ${root}`);
  const cfg = loadConfig(root, args.config);
  const enabled = (name, on) => (args.only ? args.only.includes(name) : on);

  validateLedger(cfg.scan.exempt, "scan.exempt");
  const exempt = cfg.scan.exempt.map((e) => ({ re: globToRegExp(e.glob), reason: e.reason }));
  const extRe = new RegExp(`\\.(?:${cfg.scan.extensions.join("|")})$`, "i");
  const files = listFiles(root).filter((f) => extRe.test(f) && !exempt.some((e) => e.re.test(f)));

  const results = [];
  if (enabled("citations", cfg.citations.enabled)) {
    const r = guardCitations(root, cfg.citations, files);
    results.push({ guard: "citations", ...r });
  }
  if (enabled("index", cfg.index.enabled)) {
    const r = guardIndex(root, cfg.index);
    results.push({ guard: "index", checked: 0, ...r });
  }

  report(results, args.format);

  // The vacuity floor is a separate outcome from a violation on purpose:
  // "found nothing to check" must never read as "everything is fine".
  for (const r of results) {
    if (r.floor !== undefined && r.checked < r.floor) {
      process.stderr.write(`doc-guards: ${r.guard} checked ${r.checked} items, below the floor of ${r.floor} — the scanner is probably broken\n`);
      return 2;
    }
  }
  return results.some((r) => (r.violations ?? []).length > 0) ? 1 : 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (e) {
  const { code, message } = e instanceof Bail ? e : { code: 3, message: `internal error: ${e.stack ?? e.message}` };
  process.stderr.write(`doc-guards: ${message}\n`);
  process.exitCode = code;
}
