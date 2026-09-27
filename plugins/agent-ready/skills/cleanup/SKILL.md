---
name: cleanup
description: Run a refactor phase — start one from a scan report, ship cleanup PRs in continuous or fast mode, pause it, end it.
---

**Goal: an existing codebase reaches its routing table one PR at a time, and
every file gets one full comment pass.** The scan says what is wrong
(`scan-codebase-for-agents`); this skill fixes it in steps a human can review.

A `cleanup` PR changes no behaviour. It may move statements into or out of
steering files; the merge hook then sends it to a human.

A PR that moves a statement fixes its pointers. Before the commit, search
the repo for the old spot, its file path and heading anchor, and point each
hit at the new home. A hit in a steering file makes the PR a steering diff.
A pointer is what the scan's "Dead pointers" class checks
([scan §4](../scan-codebase-for-agents/SKILL.md#4-one-next-step)).

## Files

`.agents/refactor.md`, the phase file, one `key: value` per line:

```
mode: continuous | fast
goal: <the gap the scan called a phase, one line>
parent: #<issue>     (fast only)
paused: <reason>     (only while paused)
```

No phase file means mode `none`: `comment-review` covers each PR alone.

`.agents/refactor.local`: same format, gitignored, holds `paused:` for one
person. `.agents/refactor-paths.txt`: every path to clean, one per line,
written once in §1. `.agents/refactor-done/<branch>.txt`: one per cleanup PR,
the files it covered, one per line; `/` in the branch name becomes `-`.
**Files left** = the path list minus every done file.

Agents and humans write these files without a human merge. `comment-review`
greps `mode:` and `paused:`, so keep both keys at the start of a line.

## 0. Before any run

`.agents/refactor.local`, then `.agents/refactor.md`: either says `paused:` →
stop and say why. Paused means do not clean and do not undo earlier cleanup.

## 1. Start a phase

Input: a scan report whose next step is a phase. Ask the human for the mode:

- **continuous**: feature work goes on; each task cleans the files it touched.
- **fast**: cleanup only, until the phase ends.

Path list: `git ls-files` into `.agents/refactor-paths.txt`. Show the human
the top-level folders with file counts; they strike vendored and generated
paths. Write it once; no later step edits it. Files created later are never
added; `comment-review` covers them.

Fast mode: open the parent issue, title `Refactor: <goal>`, body the scan's
three numbers and its class list. Its number goes in `parent:`.

Commit the phase file and path list in one PR labelled `cleanup`
(`gh label create cleanup` if missing).

## 2. Continuous: one cleanup PR per task

After the task's logic PR is open, in the same session:

1. Branch from the logic branch.
2. Files = the logic PR's changed files that are files left. Empty → done.
3. Comment pass (§4) over them.
4. Add the done file (Files) with the files that got the pass.
5. Open the PR against the logic branch, label `cleanup`, body starts with
   `Follows #<logic PR>.`

The logic PR's `comment-review` skips these files.

## 3. Fast: one child issue per step

1. Re-run the scan. Take its next step, in its class order: setup regressed,
   failing always-loaded lines, misplaced statements. Scan green → comment
   pass over the next files left, up to the cap (§4).
2. Open the step as a sub-issue of `parent:`, label `cleanup`.
3. One branch, one PR, `Closes #<step>`. A step on a steering path: say
   "steering diff, a human merges" in the body.
4. Add the done file (Files) with the files the comment pass covered, in
   the same PR.

Next step only after this PR merges.

## 4. Comment pass

`cleanup_comments` = `${user_config.cleanup_comments}`, cap =
`${user_config.cleanup_comments_max_files}`. Still in `${…}` form (no
plugin) → `CLAUDE_PLUGIN_OPTION_CLEANUP_COMMENTS` and
`CLAUDE_PLUGIN_OPTION_CLEANUP_COMMENTS_MAX_FILES` from the environment;
unset → on, cap 10.

`false` → skip the pass; the files still go into the done file. Past the cap,
the rest stay out of it and go into the PR body under "Not cleaned: over
the cap".

Per file, in this order:

1. **Strip.** Remove every comment. Keep tool directives (lint, type checker,
   formatter, coverage, licence) and tracked markers (`TODO:`, `FIXME(`). A
   line that held only a comment becomes an empty line. `git show HEAD:<path>`
   keeps the originals.
2. **Write.** Run `agent-ready:orchestrate-comment-write` over the stripped
   set.
3. **Merge back.** `git diff HEAD -- <path>`: each original comment whose fact
   no written comment carries goes back at its anchor, in its own words.
   Additive only: never delete a written comment here.
4. **Prune.** Run `agent-ready:comment-cleanup` over the set. Its script
   parses `.ts`, `.tsx`, `.js`, `.mjs` and `.css` only; other files skip this
   step and go into the PR body as "not pruned".

Gate: `git diff HEAD` changes comment lines only. Commit as
`docs: comment pass`.

## 5. Pause and resume

Team: add `paused: <reason>` to the phase file, commit, PR. One person: write
the same line to `.agents/refactor.local`; confirm it is gitignored. Resume:
delete the line.

## 6. End

- **fast**: scan green and no files left → delete the phase file, the path
  list and `.agents/refactor-done/` in one `cleanup` PR, close the parent
  issue.
- **continuous**: switch `mode:` to `fast` and set `parent:` (§1), then run §3
  over what is left.
