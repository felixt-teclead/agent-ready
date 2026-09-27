---
name: scan-codebase-for-agents
description: Scan a repo for agent-readiness and name the one next step. Use when asked how agent-ready a repo is, or what to clean up next.
---

# Scan a codebase for agents

Edit nothing. The report goes to chat. The one exit is a yes to the phase
offer in [One next step](#4-one-next-step), which hands over to `cleanup`.

Skill names take the `agent-ready:` prefix in the plugin channel.

## 0. Setup has run

`AGENTS.md` is missing: stop, and tell the user to run
`/setup-codebase-for-agents` and merge its pull request first.

## 1. Measure

Run [measure.md](../setup-codebase-for-agents/measure.md). It gives the
channel, the switches, the inventory and one status per row.

Plugin channel switch values, filled in when the skill loads. A value still
in `${…}` form is unset, and unset means on:

- `comment_review`: `${user_config.comment_review}`
- `steering_gate`: `${user_config.steering_gate}`

Done when measure.md's Done holds.

## 2. Lines

Judge every non-blank line of every always-loaded file against the
[routing table](../setup-codebase-for-agents/routing-table.md)'s two tests
and the pointer test below. When
`CLAUDE.md` is a symlink to `AGENTS.md`, it is one file.

- **Headings** pass when a line under them passes.
- **Tool-owned blocks,** text a tool writes and rewrites (such as the block
  `next dev` keeps in `AGENTS.md`), count toward `load` but are not judged.
  The next step never edits them.
- **Single source of truth.** Search the inventory for the line's key terms.
  When two files say the same thing, the copy in the row's home passes and
  the other fails. Neither copy in the home: the always-loaded copy fails and
  the other file keeps it. A pointer line may carry when to read its target
  and a gist: one clause per target, naming what the target covers. Anything
  beyond the gist repeats the target and fails.
- **No-op.** A line fails when it restates a default, the tree, or what lint,
  typecheck or a test enforces. The tool wins, even when the line would save a
  red run.
- **Pointers.** A line with a
  [pointer](../setup-codebase-for-agents/pointers.md) passes when the pointer
  resolves or is skipped, and its target is not always loaded. Otherwise it
  fails.

Judge each line by its meaning, not by keyword counts. A duplicate you did
not find is a pass.

**Review rules.** Judge the lines of `docs/CODING_STANDARDS.md` (or the old
`docs/CODING_CONVENTIONS.md`) by the same tests and by the routing table's
`docs/CODING_STANDARDS.md` section. Leave out the lines setup copies from its
[templates](../setup-codebase-for-agents/templates/docs/). A line that is no
review rule, such as a command or a note to the editor, fails as no-op.
These lines count in `lines`, not in `load`.

Done when every judged line has a verdict, and each failure names its reason
and, for single source of truth, the other file.

## 3. Numbers

Three numbers, none weighted:

- `rows X of Y in their home`: Y leaves out `n/a` and `not measured` rows.
  An old file counts only in its row.
- `lines A of J pass`: J is the judged lines from [Lines](#2-lines).
- `load L lines on every task`: every non-blank always-loaded line, judged
  or not.

## 4. One next step

Take the first class with a finding, in this order:

1. **Missing fixed rows.** A `fixed` row is `missing`, `CLAUDE.md` is not a
   symlink, or `.claude/skills` exists and is not a symlink. The step: re-run
   `/setup-codebase-for-agents`; it writes missing rows only. Only the
   architecture review row is missing → `/adopt-pocock-methodology` asks
   the window and writes it. Every missing row lives in
   `.claude/settings.json` → confirm or write `.claude/settings.json` as
   setup's
   [Writing the file](../setup-codebase-for-agents/settings.md#writing-the-file)
   says, with the JSON its
   [Settings file](../setup-codebase-for-agents/settings.md#settings-file)
   gives.
2. **Dead pointers.** A
   [dead pointer](../setup-codebase-for-agents/pointers.md#when-it-resolves).
   The step points it at the statement's new home or removes it.
3. **Failing lines.** A line [Lines](#2-lines) failed; always-loaded lines
   first, then review rules.
4. **Misplaced statements.** A `misplaced` row: the step moves its statements
   home. An old file of the routing table is one of its row's examples and
   takes the action its row names.

Missing fixed rows come first because the other fixes need their homes. A dead pointer
sends every reader nowhere and its fix is small, so it goes before the
lines.

The scan is **green** when no class has a finding. A finding listed in
`.agents/deviations.md`
([Accepted deviations](../setup-codebase-for-agents/accepted-deviations.md))
is no finding.

Name one next step that fits one pull request: the files it touches, and
what it removes or moves. If it touches a steering file, say "steering
diff, a human merges", and name any line in the repo that asks for consent
before that file changes.

The `cleanup` skill runs a step of any class after Missing fixed rows as
one pull request.

A next step too big for one pull request stays whole: call the gap a phase.
Then the first branch that fits:

- A phase is running (`.agents/refactor.md` exists): give its `mode:` and
  say `cleanup` takes the step.
- A skill called the scan: the caller decides.
- The user started it: after the report, ask "Start a refactor phase with
  `cleanup` now?". Yes: run the "Start a phase" section of
  [`cleanup`](../cleanup/SKILL.md#2-start-a-phase) with this report as
  input. No: the report stands.

Only the next step decides the offer: a later class too big for one pull
request reaches a phase when `cleanup` takes it as its one step.

## 5. Writing skills

Only when the next step writes new prose (a pure move, delete or repoint
writes none), look in `.agents/skills/`, `.claude/skills/` and
`~/.claude/skills/` for `unslop` (English prose) and `unslop-de-kompakt`
(German prose). Name only the ones you find.

## Report

Open with this block, in a code fence, before any other text:

```
rows   X of Y in their home
lines  A of J pass
load   L lines on every task

next   <the next step, the files it touches; "steering diff, a human merges" if so>
tools  <writing skills found; leave the line out if none>
old    <old setup hits, by their summary>; run <the skill below>
overridden  <framework>, by <its override file>
comments  full pass not run: cleanup
```

The `old` and `overridden` lines only report, from measure.md's
[Old setup](../setup-codebase-for-agents/measure.md#4-old-setup); leave each
out when it lists nothing. `old` names `model-codebase-domain` when every hit
is a specs and plans folder, else `/adopt-pocock-methodology`, which also
retires an overridden framework.

The `comments` line only reports. It shows on a green scan when no comment
pass has ever run: no
`.agents/refactor.md`, and `git log -1 --format=%h -- .agents/refactor-done`
prints nothing. Otherwise leave it out, also in a shallow clone
(`git rev-parse --is-shallow-repository` prints `true`), whose history
cannot tell.

Then the row table (statement, status, up to three `file:line` examples),
then the old files found with their row and action, then the failing
lines grouped by file, `file:line`, and the reason, then the dead pointers,
`file:line`, and the missing file or anchor.
