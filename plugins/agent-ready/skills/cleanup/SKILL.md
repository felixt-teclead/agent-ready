---
name: cleanup
description: Fix what a scan found. Use to run the scan's next step as one pull request, or to run a refactor phase — start one from a scan report, ship cleanup PRs in continuous or fast mode, pause it, end it.
---

**Goal: an existing codebase reaches its routing table one PR at a time, and
every file gets one full comment pass.**

A `cleanup` PR changes no behaviour. It may move statements into or out of
steering files.

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
person. `.agents/refactor-paths.txt`: every path still to clean, one per
line.

Agents and humans edit all three without a human merge. `comment-review`
greps `mode:` and `paused:`, so keep both keys at the start of a line.

## 0. Before any run

`.agents/refactor.local`, then `.agents/refactor.md`: either says `paused:` →
stop and say why. Earlier cleanup stays as it is.

## 1. One step, no phase

No phase file: re-run the scan. Take the first step in its class 2 or
class 3 (failing always-loaded lines, then misplaced statements and old
files), with the action the
[routing table](../setup-codebase-for-agents/routing-table.md) names. Class 1
is setup's job: name it to the user as the scan does.

One branch, one PR, label `cleanup`. A step on a steering path: say
"steering diff, a human merges" in the body. Then stop. This step writes no
phase file and no path list, asks no mode and runs no comment pass.

A step too big for one PR starts a phase (§2).

## 2. Start a phase

Input: a scan report whose next step is a phase. Ask the human for the mode:

- **continuous**: feature work goes on; each task cleans the files it touched.
- **fast**: cleanup only, until the phase ends.

Path list: `git ls-files` into `.agents/refactor-paths.txt`. Show the human
the top-level folders with file counts; they strike vendored and generated
paths. Write it once. Files created later are never added; `comment-review`
covers them.

Fast mode: open the parent issue, title `Refactor: <goal>`, body the scan's
three numbers and its class list. Its number goes in `parent:`.

Commit the phase file and path list in one PR labelled `cleanup`
(`gh label create cleanup` if missing).

## 3. Continuous: one cleanup PR per task

After the task's logic PR is open, in the same session:

1. Branch from the logic branch.
2. Files = the logic PR's changed files that sit on the path list.
   Empty → done.
3. Comment pass (§5) over them.
4. Remove the files that got the pass from the path list.
5. Open the PR against the logic branch, label `cleanup`, body starts with
   `Follows #<logic PR>.`

The logic PR's `comment-review` skips these files. Adjacent-line conflicts
between two stacked cleanup PRs are expected; resolve them by hand.

## 4. Fast: one child issue per step

1. Re-run the scan. Take its next step, in its class order: setup regressed,
   failing always-loaded lines, misplaced statements and old files. An old
   file gets the action its row in the
   [routing table](../setup-codebase-for-agents/routing-table.md) names.
   Scan green → comment pass over the next files on the path list, up to the
   cap (§5).
2. Open the step as a sub-issue of `parent:`, label `cleanup`.
3. One branch, one PR, `Closes #<step>`. A step on a steering path: say
   "steering diff, a human merges" in the body.
4. Remove the files the comment pass covered from the path list, in the same
   PR.

Next step only after this PR merges.

## 5. Comment pass

`cleanup_comments` = `${user_config.cleanup_comments}`, cap =
`${user_config.cleanup_comments_max_files}`. Still in `${…}` form (no
plugin) → `CLAUDE_PLUGIN_OPTION_CLEANUP_COMMENTS` and
`CLAUDE_PLUGIN_OPTION_CLEANUP_COMMENTS_MAX_FILES` from the environment;
unset → on, cap 20.

`false` → skip the pass; the files still leave the path list. Past the cap,
the rest stay on the list and go into the PR body under "Not cleaned: over
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

## 6. Pause and resume

Team: add `paused: <reason>` to the phase file, commit, PR. One person: write
the same line to `.agents/refactor.local`; confirm it is gitignored. Resume:
delete the line.

## 7. End

- **fast**: scan green and path list empty → delete the phase file and the
  path list in one `cleanup` PR, close the parent issue.
- **continuous**: switch `mode:` to `fast` and set `parent:` (§2), then run §4
  over what is left.
