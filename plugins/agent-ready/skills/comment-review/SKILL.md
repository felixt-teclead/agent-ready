---
name: comment-review
description: Review the comments a branch adds and stamp HEAD. Use before git push or gh pr create, or when the comment-review hook blocks one.
---

**Goal: every comment on the branch earns its place, and none that mattered is
lost.** Blind writers rewrite the comments from the code alone; you judge
what they dropped. Rules: [`RULES.md`](RULES.md). Writer
brief: [`subagent.md`](subagent.md).

You are the parent and the only writer into the repository. Blind writers
run on Opus, one per file, in parallel. `<work>` is a scratch directory outside the
repository (`mktemp -d`); nothing in it is committed. `<skill>` is this
directory.

## 1. Scope

```bash
default=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || echo origin/main)
base=$(git merge-base HEAD "$default")
git diff --name-only --diff-filter=AM "$base"...HEAD
```

On the default branch itself, use `@{upstream}` as `base`.

Keep source files. Drop docs, config, lockfiles, generated and vendored files.

If `.agents/refactor.md` sets mode `continuous` and neither it nor
`.agents/refactor.local` says `paused:`, drop every file listed in
`.agents/refactor-paths.txt`. Its stacked cleanup PR gives it the full comment
pass. A file created on this branch is never on that list, so it stays.

One path per line into `<work>/files.txt`. Empty list → go to step 7.

## 2. Strip

Per file, the added line ranges from the hunk headers:

```bash
git diff -U0 "$base"...HEAD -- <path> | grep '^@@'
```

into `<work>/lines/<path>.txt`. Copy the file to `<work>/stripped/<path>` and
remove every comment that sits on an added line: line comments, block
comments, doc comments, and docstrings where the language uses them. Keep tool
directives (lint, type checker, formatter, coverage, licence) and tracked
markers (`TODO:`, `FIXME(`).

Record each removed comment, with its line and anchor code, in
`<work>/original/<path>.md`. It is what keeps the writers blind: it stays
out of every brief.

Check the copy: `diff <path> <work>/stripped/<path>` shows deletions only, and
every deleted character is comment text.

## 3. Brief and dispatch

Per file, write a brief a blind writer can work from. Give it:

- what the change does and why, in behaviour terms
- the constraints you know that the code does not show: a gateway quirk, a
  requirement, a caller outside the repository
- the docs that own shared rules, by path
- `path`, `work`, `repo`, `skill`

Build the brief from the code and the change. A removed comment in it,
quoted or paraphrased, hands the writer the answer, and step 4 then measures
nothing.

Dispatch one writer per file in one turn: the text of `subagent.md`, then the
brief. Wait for every `<work>/proposed/<path>.md`.

## 4. Judge and write

Per file, set `original/` against `proposed/`, anchor by anchor.

- **Proposed passes `RULES.md`** → write it.
- **Proposed fails a rule** → drop it or fix its wording yourself.
- **An original fact the writer missed** → restore it if it passes
  `RULES.md`, in the original words, reworded only to meet the rules. List it
  under "Restored" in the report. Its loss means the code cannot carry it, so
  it is exactly what a comment is for.
- **`RENAME`** → apply it if it passes the no-op test: the name and every
  reference to it, nothing else.

Every other finding goes to the report.

Done when every anchor in `original/` and `proposed/` has a verdict.

## 5. Call sites

List every export in the diff whose body changed, minus pure renames and
moves. Per export:

```bash
git grep -n '<export>'
```

Read the comments within a few lines of each call site outside the diff. A
comment the new behaviour makes wrong is fixed in place. Anything wider is a
refactor: report it.

## 6. Gates

1. `git diff` against `HEAD` changes comment lines, plus lines that differ
   only by an applied `RENAME`. Any other code line is your mistake: revert
   it.
2. Typecheck and lint, by the names the project manifest gives them.
3. Re-read each written line against the code. A named symbol exists and is
   used as stated. A stated number or direction holds. A claim you cannot
   check, delete.

Changes → commit them as `docs: review comments`.

## 7. Stamp

```bash
git rev-parse HEAD > "$(git rev-parse --git-dir)/comment-review-ok"
```

Only after steps 1 to 6. Any later commit clears the stamp, so review again
after it.

## Report

A `## Comment review` section for the pull request body: files reviewed,
comments written, restored comments with `file:line` and their words, then
the findings as a to-do list. An open pull request → `gh pr edit --body`.
No pull request yet → carry it into `gh pr create`.
