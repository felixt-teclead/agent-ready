---
name: cleanup
description: Fix what a scan found. Use to run the scan's next step as one pull request, or to run a refactor phase — start one from a scan report or for a comment pass, ship cleanup PRs in continuous or fast mode, pause it, end it.
---

**Goal: an existing codebase reaches its routing table one PR at a time, and
every file gets one full comment pass.**

A `cleanup` PR changes no behaviour. It may move statements into or out of
steering files.

## Moving a statement

A PR that moves a statement fixes its pointers. Before the commit, search
the repo for the old spot: its file path, its heading anchor and its heading
text. Point each hit at the new home; a gist clause beside the pointer moves
with it and still names what the target covers. A hit in a steering file
makes the PR a steering diff. What counts as a pointer: the scan's
[Pointers](../scan-codebase-for-agents/SKILL.md#pointers).

## Files

`.agents/refactor.md`, the phase file, one `key: value` per line:

```
mode: continuous | fast
goal: <the gap the scan called a phase, or: comment pass>
parent: #<issue>     (fast only)
comments: true | false
cap: <files per fast step>
paused: <reason>     (only while paused)
```

No phase file means mode `none`: `comment-review` covers each PR alone.

`.agents/refactor.local`: same format, gitignored, holds `paused:` for one
person.

`.agents/refactor-paths.txt`, the path list: every path the phase cleans, one
per line, written once when the phase starts. No later step edits it.

`.agents/refactor-done/<branch>.txt`, a done file: one per cleanup PR that
ran the comment pass, the files it covered, one per line. `/` in the branch
name becomes `-`.

**Files left** = the path list, minus every done file, minus paths no longer
in the tree.

Agents and humans write these files without a human merge. `comment-review`
greps `mode:`, `comments:` and `paused:`, so keep these keys at the start of
a line.

## Merging a cleanup PR

An agent merges its own `cleanup` PR when all three hold:

- the diff touches no steering file and not `.agents/deviations.md`;
- `comment-review`'s stamp is on the PR's head
  ([Stamp](../comment-review/SKILL.md#7-stamp));
- the manifest's `check` script exits 0 on that head.

Otherwise the body says why ("steering diff, a human merges" for a steering
file), and a human merges.

## 0. Before any run

`.agents/refactor.local`, then `.agents/refactor.md`: either says `paused:` →
stop and say why. Earlier cleanup stays as it is.

## 1. One step, no phase

No phase file: re-run the scan. Take the **next finding**: the first in the
scan's class order
([One next step](../scan-codebase-for-agents/SKILL.md#4-one-next-step)),
skipping Missing fixed rows, with the action the
[routing table](../setup-codebase-for-agents/routing-table.md) names.
Missing fixed rows is setup's job: name it to the user as the scan does.

The user keeps a finding instead of fixing it → write its line into
`.agents/deviations.md` in this PR, as the scan's
[Accepted deviations](../scan-codebase-for-agents/SKILL.md#accepted-deviations)
says.

One branch, one PR, label `cleanup`. Merge it by
[Merging a cleanup PR](#merging-a-cleanup-pr). Then stop. This step writes
no phase file and no path list, asks no mode and runs no comment pass.

A step too big for one PR starts a phase
([Start a phase](#2-start-a-phase)). Scan green and its report has the
`comments` line → ask "Start a phase for the comment pass?"; yes → Start a
phase with input `comment pass`.

## 2. Start a phase

Input, one of:

- a scan report that calls a gap a phase: `goal:` names the gap;
- `comment pass`, from the user or from a calling skill after a green scan:
  `goal: comment pass`.

A phase file exists, or an open `cleanup` PR adds one → name it and stop.

The calling skill may give the mode. Otherwise ask the human:

- **continuous**: each task's PR gets a stacked cleanup PR over the files it
  touched. The goal's scan steps wait for the switch to fast
  ([End](#7-end)).
- **fast**: one cleanup PR after another, not tied to tasks, until the phase
  ends.

Feature work goes on in both.

Delete any `.agents/refactor-done/` an earlier phase left.

Path list: the files of `git ls-files` that `comment-review` keeps
([Scope](../comment-review/SKILL.md#1-scope)), minus the files
`.agents/agent-ready-manifest.json` lists and the steering list in
`AGENTS.md`. Show the human the top-level folders with file counts; they
strike vendored and generated paths. Tell them how many comment-pass PRs a
fast phase takes: the list's length divided by `cap:`. Files created later
are never added; `comment-review` covers them.

`comments:` and `cap:` come from the switches
([Comment pass](#5-comment-pass)).

Fast mode: open the parent issue as `docs/agents/issue-tracker.md` says,
title `Refactor: <goal>`. Body: the scan's three numbers and its class list,
or, for a comment pass, the length of the path list. Its number goes in
`parent:`.

Commit the phase file and path list in one PR labelled `cleanup` (create the
label if missing). Merge it by [Merging a cleanup PR](#merging-a-cleanup-pr).

## 3. Continuous: one cleanup PR per task

After the task's logic PR is open, in the same session:

1. Branch `cleanup/pr-<logic PR>` from the logic branch.
2. Files = the logic PR's changed files that are files left, minus the done
   files of open `cleanup` PRs. Empty, or `comments: false` → done.
3. [Comment pass](#5-comment-pass) over them.
4. Add the done file ([Files](#files)) with the files that got the pass.
5. Open the PR against the logic branch, label `cleanup`, body starts with
   `Follows #<logic PR>.`
6. Merge it into the logic branch by
   [Merging a cleanup PR](#merging-a-cleanup-pr), before the logic PR
   merges. The logic PR merged first → rebase with
   `git rebase --onto origin/<default> <logic branch>`, stamp again, and
   retarget the PR to the default branch.

The logic PR's `comment-review` skips these files.

## 4. Fast: one child issue per step

1. Re-run the scan, unless the previous step's PR says `Scan green at <sha>`
   and `git diff --name-only <sha>` names no file of the scan's inventory.
   Take the next finding ([One step, no phase](#1-one-step-no-phase)). An
   old file gets the action its row in the
   [routing table](../setup-codebase-for-agents/routing-table.md) names.
   No next finding (scan green, or only Missing fixed rows) → comment pass
   over the next files left that are not held, up to `cap:`; the PR body
   says `Scan green at <the scanned commit>` when it was.
   **Held**: changed by an open PR. Read them before picking:
   `gh pr list --state open --limit 1000 --json number,changedFiles,files`.
   `files` stops at 100; a PR with more `changedFiles` →
   `gh api repos/{owner}/{repo}/pulls/<n>/files --paginate`. Held files stay
   files left for a later step. Only held files left → list them with their
   PRs and ask the human: wait, or clean anyway. No `gh` → the tracker's
   list of open merge requests; none → warn the human once that open
   branches go unchecked, then pick as usual.
2. Open the step issue as `docs/agents/issue-tracker.md` says, label
   `cleanup`, body starting with `Part of #<parent>`.
3. Branch `cleanup/step-<step>`, one PR, `Closes #<step>`.
4. Add the done file ([Files](#files)) with the files the comment pass
   covered, in the same PR.
5. Merge it by [Merging a cleanup PR](#merging-a-cleanup-pr).

Next step only after this PR merges, one step per run.

## 5. Comment pass

`comments:` and `cap:` in the phase file are the team's values. Start a
phase fills them from the switches: `cleanup_comments` =
`${user_config.cleanup_comments}`, cap =
`${user_config.cleanup_comments_max_files}`. Still in `${…}` form (no
plugin) → `CLAUDE_PLUGIN_OPTION_CLEANUP_COMMENTS` and
`CLAUDE_PLUGIN_OPTION_CLEANUP_COMMENTS_MAX_FILES` from the environment;
unset → the default in the routing table's
[Switches](../setup-codebase-for-agents/routing-table.md#switches). A phase
file without the keys: the switches decide.

`comments: false` → no pass: a task gets no cleanup PR, and a fast phase
ends at scan green. The cap bounds a fast step; a continuous step passes all
its files. Past the cap, the rest stay files left and go into the PR body
under "Not cleaned: over the cap".

**Docs** for the pass: a rule, contract, gotcha or trap goes into a scoped
section of `docs/CODING_STANDARDS.md`; a decision goes into `docs/adr/`, a
new one in `/domain-modeling`'s ADR format. `CONTEXT.md` holds domain terms
only. No fitting home → the fact stays a comment at its anchor. Pass these
docs to both skills below.

Per file, in this order:

1. **Strip.** Remove every comment. Keep tool directives (lint, type checker,
   formatter, coverage, licence) and tracked markers (`TODO:`, `FIXME(`). A
   line that held only a comment becomes an empty line. `git show HEAD:<path>`
   keeps the originals.
2. **Write.** Run `agent-ready:orchestrate-comment-write` over the stripped
   set.
3. **Merge back.** `git diff HEAD -- <path>`: each original comment whose fact
   no written comment carries goes back at its anchor, in its own words.
   Additive only: never delete a written comment here. Then delete each line
   Strip emptied that is still empty.
4. **Prune.** Run `agent-ready:comment-cleanup` over the set. Its script
   parses `.ts`, `.tsx`, `.js`, `.mjs` and `.css` only, and needs
   `typescript` resolvable from the repo. Other files, or no `typescript`,
   skip this step and go into the PR body as "not pruned".

Gate: `git diff HEAD` changes only comment lines, the doc sentences the pass
placed, and lines that differ only by an applied `NAME` or `TYPE` that passes
the no-op test, as `comment-review`'s
[Gates](../comment-review/SKILL.md#6-gates) allow a `RENAME`. Revert any other
code line. Commit as `docs: comment pass`.

The pass covers `comment-review` for these files: after the step's last
commit, write its stamp ([Stamp](../comment-review/SKILL.md#7-stamp)).

## 6. Pause and resume

Team: add `paused: <reason>` to the phase file, commit, PR. One person: write
the same line to `.agents/refactor.local`; confirm it is gitignored. Resume:
delete the line.

## 7. End

- **fast**: scan green, and no files left or `comments: false` → delete the
  phase file, the path list and `.agents/refactor-done/` in one `cleanup` PR,
  close the parent issue.
- **continuous**: no files left, or the human asks → switch `mode:` to
  `fast` and set `parent:` ([Start a phase](#2-start-a-phase)), then run
  [Fast](#4-fast-one-child-issue-per-step) over what is left.
