---
name: cleanup
description: Run the scan's next step as one cleanup PR, or a refactor phase. Use to start a phase from a scan report or for a comment pass, ship its PRs in continuous or fast mode, pause, resume or end it.
---

**Goal: an existing codebase reaches its routing table one PR at a time, and
every file gets one full comment pass.**

A `cleanup` PR changes no behaviour. It may move statements into or out of
steering files; such a PR fixes its pointers as
[Moving a statement](../setup-codebase-for-agents/pointers.md#moving-a-statement)
says. A step may hit a
[confirmed step](../setup-codebase-for-agents/confirmed-steps.md); a
denied one leaves the step open, with the gap in the PR body or the report.

Skill names take the `agent-ready:` prefix in the plugin channel.

## Files

The phase file, the path list, done files, **files left** and **held**:
[phase-files.md](phase-files.md).

## Next step

The **next step** is the first class with a finding after Missing fixed
rows, in the scan's order
([One next step](../scan-codebase-for-agents/SKILL.md#4-one-next-step)),
fixed with the action the
[routing table](../setup-codebase-for-agents/routing-table.md) names.
Missing fixed rows is setup's job: name it to the user as the scan does.
**No next step**: the scan is green, or only Missing fixed rows are left.

## Merging a cleanup PR

An agent merges its own `cleanup` PR when all of these hold:

- the diff touches no steering file and not `.agents/deviations.md`;
- `comment-review`'s stamp is on the PR's head
  ([Stamp](../comment-review/SKILL.md#7-stamp)); with `comment_review` off,
  no stamp is needed;
- the `check` command in the manifest or task runner exits 0 on that head;
- the PR's required checks on the remote pass.

Otherwise the body says why ("steering diff, a human merges" for a steering
file), and a human merges.

## 0. Before any run

`.agents/refactor.local`, then `.agents/refactor.md`: either says `paused:` →
stop and say why.

A phase file without `comments:` or `cap:` gets them as
[Start a phase](#2-start-a-phase) fills them, in this run's PR.

## 1. One step, no phase

No phase file: take a scan report from this session, else re-run the scan.
The first branch that fits:

- **No next step** ([Next step](#next-step)): nothing to fix. The report has
  the `comments` line → ask "Start a phase for the comment pass?"; yes →
  [Start a phase](#2-start-a-phase) with input `comment pass`.
- **The next step does not fit one pull request** →
  [Start a phase](#2-start-a-phase) with this report.
- **Otherwise** fix one pull request's worth of the next step: branch
  `cleanup/<topic>`, one PR, label `cleanup`. Merge it by
  [Merging a cleanup PR](#merging-a-cleanup-pr).

The user keeps a finding instead of fixing it → write its line into
`.agents/deviations.md` in this PR, as
[Accepted deviations](../setup-codebase-for-agents/accepted-deviations.md)
says.

The PR is this run's only output; then stop.

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

Path list: the files of `git -c core.quotePath=off ls-files` that
`comment-review` keeps ([Scope](../comment-review/SKILL.md#1-scope)), minus
the files `.agents/agent-ready-manifest.json` lists and the steering list in
`AGENTS.md`. Show the human the top-level folders with file counts; they
strike vendored and generated paths. Tell them how many comment-pass PRs a
fast phase takes: the list's length divided by `cap:`. Files created later
are never added; `comment-review` covers them.

`comments:` = `${user_config.cleanup_comments}`, `cap:` =
`${user_config.cleanup_comments_max_files}`. A value still in `${…}` form
(no plugin) comes from `CLAUDE_PLUGIN_OPTION_CLEANUP_COMMENTS` and
`CLAUDE_PLUGIN_OPTION_CLEANUP_COMMENTS_MAX_FILES`, found as measure.md's
[Channel and switches](../setup-codebase-for-agents/measure.md#1-channel-and-switches)
says; unset → the routing table's
[Switches](../setup-codebase-for-agents/routing-table.md#switches) default.

Open the parent issue as `docs/agents/issue-tracker.md` says, title
`Refactor: <goal>`. Body: the scan's three numbers and its class list, or,
for a comment pass, the length of the path list. Its number goes in
`parent:`.

Commit the phase file and path list in one PR labelled `cleanup` (create the
label if missing). Merge it by [Merging a cleanup PR](#merging-a-cleanup-pr).

Done when the phase PR is merged, or open with the reason a human merges it.

## 3. Continuous: one cleanup PR per task

After the task's logic PR is open, in the same session:

1. Files = the list "Left to the cleanup PR" in the logic PR's
   `## Comment review` section. No such section (`comment_review` off, or
   the section got lost) → the logic PR's changed files that are files left
   and not held by an open PR other than the logic PR. Empty or `none` →
   done.
2. Branch `cleanup/pr-<logic PR>` from the logic branch.
3. The [comment pass](comment-pass.md) over them.
4. Open the PR against the logic branch, label `cleanup`, body starting with
   `Follows #<logic PR>. Merge this first; if #<logic PR> merged first,
   rebase this onto the default branch.`, then the pass's report.
5. Merge it into the logic branch by
   [Merging a cleanup PR](#merging-a-cleanup-pr), before the logic PR
   merges. The logic PR merged first →
   `git rebase --onto origin/<default> <head>`, with `<head>` from
   `gh pr view <logic PR> --json headRefOid`; stamp again, and retarget the
   PR to the default branch.
6. No files left → [End](#7-end).

Done when the cleanup PR is merged, or open with the reason a human merges
it.

## 4. Fast: one child issue per step

1. **Pick.** An open `cleanup` PR whose body says `Closes #<step>` or
   `Closes #<parent>` → name it and stop: the next step waits for its merge.
   Otherwise re-run the scan, unless the last merged `cleanup/step-…` PR
   says `Scan green at <sha>` and `git diff --name-only <sha>` names no file
   that measure.md's
   [Inventory](../setup-codebase-for-agents/measure.md#2-inventory) lists.
   Then the first branch that fits:
   - A [next step](#next-step) → one pull request's worth of it.
   - No next step, and no files left or `comments: false` → [End](#7-end).
   - No next step → the next files left that are not held, up to `cap:`, for
     the comment pass. Held files stay files left for a later step. Only held
     files left → list them with their PRs and ask the human: wait, or clean
     anyway.
2. Open the step issue as `docs/agents/issue-tracker.md` says, label
   `cleanup`, body starting with `Part of #<parent>`.
3. Branch `cleanup/step-<step>` from the default branch.
4. Do the step: the fix, or the [comment pass](comment-pass.md) over the
   picked files.
5. Open the PR, `Closes #<step>`, with the pass's report. A comment pass on a
   green scan: the body says `Scan green at <the scanned commit>`.
6. Merge it by [Merging a cleanup PR](#merging-a-cleanup-pr).

Done when the step's PR is merged, or open with the reason a human merges
it. One step per run.

## 5. Comment pass

The steps: [comment-pass.md](comment-pass.md).

## 6. Pause and resume

Team: add `paused: <reason>` to the phase file, commit, PR. One person: write
the same line to `.agents/refactor.local`; confirm it is gitignored. Resume:
delete the line.

## 7. End

- **fast**: first every `[ ]` line in `.agents/refactor-log.md` needs a
  human decision: list them, ask `keep` or `cut` for each, mark it. Any
  `[ ]` left → the phase is not done; stop. Then one `cleanup` PR, body
  `Closes #<parent>`: it applies each `cut` (delete the comment), and deletes
  the phase file, the path list, the log and `.agents/refactor-done/`. Merge
  it by
  [Merging a cleanup PR](#merging-a-cleanup-pr).
- **continuous**: no files left, or the human asks → switch `mode:` to
  `fast` in a `cleanup` PR, then run [Fast](#4-fast-one-child-issue-per-step)
  over what is left.

Done when the End PR or the switch PR is merged, or open with the reason a
human merges it.
