---
name: comment-cleanup
description: Optimize documentation by improving comments.
disable-model-invocation: true
---

**Goal:** A comment stays only when the code cannot say it, nothing else says
it, and without it someone would break the code silently. Everything else is
cut. Fewer pointers, no additions. The five rules and the reasons for a cut:
[`steps/judge.md`](steps/judge.md).

## Process

- **The script does the run.** `cc2-run.mjs` prepares, judges, applies,
  verifies and finishes every file; its agents only read and answer JSON. You
  pick the files, start it, apply the doc fixes, check, report.
- **You never open a brief, the source files or the prompts.** Script output,
  the report files and the docs you edit are enough.
- **Block on the run.** It runs detached; you wait on its log in one command
  that returns when it ends. A turn that only says "waiting" ends a headless
  session, and the run with it.

Do not commit; git is the undo. `<work>` =
`${TMPDIR:-/tmp}/comment-cleanup/<repo>/<run>/` (absolute), `<run>` = first file's basename plus
the time. `<skill>` = this directory.

## Steps

### 1. Files

File set = what the conversation names; if you need to infer the list: print and
stop for confirmation. Paths relative to the repository root, one per line,
into `<work>/files.txt`. The working tree of those files must be clean
(`git status --short -- <files>`); a file with changes → ask.

### 2. Run

From the repository root:

```bash
setsid nohup node <skill>/cc2-run.mjs --repo . --work <work> --files <work>/files.txt --jobs 10 \
  > <work>/run.log 2>&1 < /dev/null &
```

Then wait, with the Bash tool's longest timeout, and repeat the same command
until it prints the `done:` line:

```bash
timeout 580 bash -c 'until grep -q " done: " <work>/run.log; do sleep 20; done'; tail -n 3 <work>/run.log
```
Files run in parallel.
Each line of `<work>/results.jsonl` is one file: `status`, comment lines
before and after, cost. `status` other than `ok` → that file is back to its
original; say so in the report.

### 3. Doc fixes

Per file, `<work>/<group>/report-<file>.md`: each `DOCFIX_BLOCK` → replace
`old:` with `new:` in that doc (a doc line the code contradicts). The run adds
no doc sentences: a reason worth writing down is a `missing-doc` FINDING for a
human.

### 4. Check

`git diff --stat` shows only the files of the set and the docs you edited.
Then the repository's typecheck and lint, by the names `package.json` (or the
build file) gives them, on the changed files. A failure the run caused →
restore that file from `git diff` and report it. Tests only on request.

### 5. Report

Per file: comment lines before → after, the `KEPT`, `CUT` and `FINDINGS
executable` counts, `KEEP?` rows with `file:line` and their words, `FINDING`
rows, `PROBLEM` rows, cost and time. Then the doc fixes applied and the total
cost.

Ask whether to delete `<work>`.
