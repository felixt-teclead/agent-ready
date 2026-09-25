---
name: scan-codebase-for-agents
description: Measure a codebase against the routing table, give three numbers and name the one next change. Use when the user asks how agent-ready a repo is, or what to clean up next in its steering files. Runs after /setup-codebase-for-agents.
---

# Scan a codebase for agents

You measure; you do not edit. The report goes to chat.

The routing table and the measuring steps belong to setup. Read them from its
folder: [routing-table.md](../setup-codebase-for-agents/routing-table.md) and
[measure.md](../setup-codebase-for-agents/measure.md). This skill adds the
line tests, the numbers and the next step.

## 0. Setup has run

`AGENTS.md` is missing: stop, and tell the user to run
`/setup-codebase-for-agents` and merge its pull request first.

## 1. Measure

Run measure.md. It gives the channel, the switches, the inventory and one
status per row.

Plugin channel switch values, filled in when the skill loads. A value still
in `${…}` form is unset, and unset means on:

- `comment_review`: `${user_config.comment_review}`
- `steering_gate`: `${user_config.steering_gate}`

Two rulings on top of measure.md:

- A skill that production code loads at runtime (a source file reads the
  skill folder) is not an agent procedure. Its row is **misplaced** while it
  sits in `.agents/` or `.claude/`.
- A repo's own consent rule ("change this file only with approval") belongs
  to the steering-approval row. Judge it like any other line.

Done when every row has a status.

## 2. Lines

Judge every non-blank line of every always-loaded file against the two tests
in the routing table. When `CLAUDE.md` is a symlink to `AGENTS.md`, it is one
file.

- **Headings** pass when a line under them passes.
- **Tool-owned blocks,** text a tool writes and rewrites (such as the block
  `next dev` keeps in `AGENTS.md`), count toward `load` but are not judged.
  The next step never edits them.
- **Single source of truth.** Search the inventory for the line's key terms.
  When an always-loaded line repeats a file loaded later, the always-loaded
  copy fails and the other file keeps it. Two always-loaded copies: the one
  outside the row's home fails.
- **No-op.** A line fails when it restates a default, the tree, or what lint,
  typecheck or a test enforces. The tool wins, even when the line would save a
  red run.
- **Pointers.** A line that points at a file passes when the file exists or
  is gitignored, and the file is not always loaded. Otherwise it fails.

Judge each line; do not count keywords. A duplicate you did not find is a
pass.

Done when every judged line has a verdict, and each failure names its reason
and, for single source of truth, the other file.

## 3. Numbers

Three numbers, none weighted:

- `rows X of Y in their home`: Y leaves out `n/a` and `not measured` rows.
- `lines A of J pass`: J is the judged lines from §2.
- `load L lines on every task`: every non-blank always-loaded line, judged
  or not.

## 4. One next step

Take the first class with a finding:

1. **Setup regressed.** `CLAUDE.md` or `.claude/skills` is no longer a
   symlink, or a `fixed` row is `missing`.
2. **Failing always-loaded lines.**
3. **Misplaced statements.**

Name one change that fits one pull request: the files it touches, and what it
removes or moves. If it touches a steering file, say "steering diff, a human
merges", and name any line in the repo that asks for consent before that file
changes.

If the change does not fit one pull request, do not shrink it. Call the gap a
phase, and point at the `cleanup` skill (`agent-ready:cleanup` in the plugin
channel) to start a refactor phase. When `.agents/refactor.md` exists, a
phase is already running: give its `mode:` and say `cleanup` takes the step.

## 5. Writing skills

Only when the next step writes new prose or comments (a pure move or delete
writes none), look for these in `.agents/skills/`, `.claude/skills/`,
`~/.claude/skills/`, and among this plugin's skills:

- `unslop` for English prose, `unslop-de-kompakt` for German prose
- `comment-review` for comments in new work, `comment-cleanup` for comments
  in existing code

Name the ones you find. Say nothing about the rest.

## Report

```
rows   X of Y in their home
lines  A of J pass
load   L lines on every task

next   <one change, the files it touches; "steering diff, a human merges" if so>
tools  <writing skills found; leave the line out if none>
```

Then the row table (statement, status, up to three `file:line` examples),
then the failing lines grouped by file, `file:line`, and the reason.
