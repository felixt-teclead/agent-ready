---
name: scan-codebase-for-agents
description: Measure how agent-ready a repo is and name the one next change to its steering files. Use when the user asks how agent-ready a repo is, or what to clean up next.
---

# Scan a codebase for agents

Edit nothing. The report goes to chat. The one exit is a yes to the phase
offer in [One next step](#4-one-next-step), which hands over to `cleanup`.

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

Two rulings on top of measure.md:

- A skill that production code loads at runtime (a source file reads the
  skill folder) is not an agent procedure. Its row is **misplaced** while it
  sits in `.agents/` or `.claude/`.
- A repo's own consent rule ("change this file only with approval") belongs
  to the steering-approval row. Judge it like any other line.

Done when every row has a status and every old file found has its row.

## 2. Lines

Judge every non-blank line of every always-loaded file against the two tests
in the [routing table](../setup-codebase-for-agents/routing-table.md). When
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
- **Pointers.** A line with a [pointer](#pointers) passes when the pointer
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

1. **Missing fixed rows.** A `fixed` row is `missing`, or `CLAUDE.md` or
   `.claude/skills` is not a symlink. Regressed or never written, the step
   is the same: re-run `/setup-codebase-for-agents`. It writes missing rows
   only.
2. **Dead pointers.** A [pointer](#pointers) that does not resolve. The fix
   points it at the statement's new home or removes it.
3. **Failing lines,** always-loaded lines first, then review rules.
4. **Misplaced statements and old files.**

Setup comes first because the other fixes need its homes. A dead pointer
sends every reader nowhere and its fix is small, so it goes before the
lines.

The scan is **green** when no class has a finding. A finding listed in
`.agents/deviations.md` ([Accepted deviations](#accepted-deviations)) is no
finding.

Name one change that fits one pull request: the files it touches, and what it
removes or moves. If it touches a steering file, say "steering diff, a human
merges", and name any line in the repo that asks for consent before that file
changes.

The `cleanup` skill (`agent-ready:cleanup` in the plugin channel) runs a
step of any class after Missing fixed rows as one pull request.

If the change does not fit one pull request, do not shrink it: call the gap a
phase. When `.agents/refactor.md` exists, a phase is already running: give
its `mode:` and say `cleanup` takes the step. Otherwise, after the report,
ask "Start a refactor phase with `cleanup` now?". Yes: run the "Start a
phase" section of [`cleanup`](../cleanup/SKILL.md#2-start-a-phase) with this
report as input. No: the report stands. When a calling skill runs the scan,
it decides; do not offer. Only the next change decides the offer: a later
class too big for one pull request reaches a phase when `cleanup` takes it
as its one step.

### Pointers

A **pointer** is a markdown link target without a URL scheme or a path in
backticks, in a doc of the inventory, or `See <path> §"<heading>"` in a code
comment anywhere in the repo (`git grep -n 'See [^ ]* §"'`). Leave out the
files `.agents/agent-ready-manifest.json` lists: they are fetched, not
written here.

A token in backticks is a **path** when it has no space, `<`, `*`, `{`, `$`,
`…` or URL scheme, and it ends in a name with a file extension (`x.md`;
`.md` alone is none) or has a `/` after a first segment that names a folder
in the tree. `EUR/USDT`, `n/a` and `Cmd/Ctrl+Enter` are no paths. Drop a
`:line`, `:line-line` or `#L…` suffix first.

A path in backticks or in a `See` comment **resolves** when it exists from
the repo root or from the doc's folder, or is the tail of at least one
`git ls-files` path (`accounts/aggregate.ts` for
`src/lib/accounts/aggregate.ts`). A markdown link target resolves as GitHub
renders it: from the doc's folder, or from the repo root when it starts with
`/`. A folder pointer resolves when the folder exists. An `#anchor` resolves
when a heading's GitHub slug matches: lowercase, punctuation dropped except
`-` and `_`, spaces as `-`, a repeated heading gets `-1`, `-2`. A
`§"<heading>"` resolves when a heading or bold lead-in in the target reads
the same.

Skip gitignored paths; the domain files (`CONTEXT.md`, `CONTEXT-MAP.md`,
`docs/adr/`), which skills create when a term or decision first needs a home;
the steering list; a path the sentence names as former, old, moved or
removed; a package or product name (`Next.js`); and a name a doc uses as an
example, a placeholder or a stand-in for the repo's own file.

### Accepted deviations

`.agents/deviations.md` lists the findings the user chose to keep, one line
each:

```
- `<file>`: "<the finding's line, pointer or path, quoted>" (<class>). <Why, one sentence.>
```

`<class>` is a class of [One next step](#4-one-next-step), or a check of
another skill: `old setup` (an old-setup item or folder kept, measure.md's
[Old setup](../setup-codebase-for-agents/measure.md#4-old-setup)),
`fit check` (`model-codebase-domain`), `levers` (`route-codebase-docs`),
`domain` (no `CONTEXT.md` wanted).

A finding with the same file and quoted text is no finding: it stays as it
is, and no class counts it. A line an open PR adds to the file counts too,
so a finding the user just kept stays kept while its PR waits. Only the user
accepts a finding. The skill that
asked writes the line into its own PR, and a human merges that PR.

## 5. Writing skills

Only when the next step writes new prose or comments (a pure move, delete or
repoint writes none), look for these in `.agents/skills/`, `.claude/skills/`,
`~/.claude/skills/`, and among this plugin's skills:

- `unslop` for English prose, `unslop-de-kompakt` for German prose
- `comment-review` for comments in new work, `comment-cleanup` for comments
  in existing code

Name the ones you find. Say nothing about the rest.

## Report

Open with this block, in a code fence, before any other text:

```
rows   X of Y in their home
lines  A of J pass
load   L lines on every task

next   <one change, the files it touches; "steering diff, a human merges" if so>
tools  <writing skills found; leave the line out if none>
old    <old setup hits, by their summary>; run <the skill below>
overridden  <framework>, by <its override file>
comments  full pass not run: cleanup
```

The `old` and `overridden` lines only report, from measure.md's
[Old setup](../setup-codebase-for-agents/measure.md#4-old-setup); leave each
out when it lists nothing. `old` names `model-codebase-domain` when every hit
is a specs and plans folder, else `/adopt-pocock-methodology`, which also
retires an overridden framework (`agent-ready:` prefix in the plugin
channel).

The `comments` line only reports (`agent-ready:cleanup` in the plugin
channel). It shows on a green scan when no comment pass has ever run: no
`.agents/refactor.md`, and `git log -1 --format=%h -- .agents/refactor-done`
prints nothing. Otherwise leave it out, also in a shallow clone
(`git rev-parse --is-shallow-repository` prints `true`), whose history
cannot tell.

Then the row table (statement, status, up to three `file:line` examples),
then the old files found with their row and action, then the failing
lines grouped by file, `file:line`, and the reason, then the dead pointers,
`file:line`, and the missing file or anchor.
