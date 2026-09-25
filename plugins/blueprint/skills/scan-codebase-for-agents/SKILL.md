---
name: scan-codebase-for-agents
description: Measure a codebase against the routing table and name the one next change. Use when the user asks how agent-ready a repo is or wants to continue cleaning up its steering files. Runs only after /setup-codebase-for-agents.
---

<!-- PROTOTYPE — throwaway draft for "The scan skill" ticket. Not shipped. -->

# Scan a codebase for agents

You measure. You do not edit. The output is a report in chat.

Read `../../reference/routing-table.md` first. Every check below is against it.

## 0. Setup has run

If `AGENTS.md` is missing, stop. Tell the user to run `/setup-codebase-for-agents` first and push.

Read the install switches from `userConfig`. A switched-off row is **n/a**.

## 1. Inventory

List every file an agent loads or is pointed at:

- Always loaded: `AGENTS.md`, `CLAUDE.md`, nested `CLAUDE.md`/`AGENTS.md`, `.claude/rules/*.md` without a `paths:` list.
- Loaded on a trigger: `.claude/rules/*.md` with a `paths:` list, `.agents/skills/`, `.claude/skills/`, `docs/agents/`, the review-rules doc.
- Pointed at: every doc an always-loaded file cites.

Skip gitignored paths.

For each: line count, and whether an always-loaded file cites it.

## 2. Rows

For each routing-table row, give one status:

- **home** — the statements of this kind live in their home.
- **misplaced** — some live elsewhere. Give up to three examples, `file:line`.
- **missing** — a `fixed` row has no home, and no statement of its kind exists anywhere. If statements exist elsewhere, the row is **misplaced**.
- **n/a** — a switched-off row, or a `lazy` row the repo does not need.
- **not measured** — the comments row. Scan does not read comments; that audit is costly and belongs to a cleanup phase.

A skill that production code loads at runtime is not an agent procedure. Report it as misplaced: it belongs in a tooling folder in the source tree, not in `.claude/` or `.agents/`.

## 3. Lines

Test every line in an always-loaded file against two tests:

- **Single source of truth.** Does another file already say it? Name that file.
- **No-op.** Delete the line in your head. Would an agent act differently? A line fails when it restates a default, restates what lint, typecheck or a test already enforces, or points at a path that does not exist. A tool wins over prose, even when the line would save a red run.

When an always-loaded line repeats a doc, the always-loaded copy fails. The doc keeps it.

Judge each line. Do not count keywords.

## 4. Score

Three numbers, nothing weighted:

- `rows: X of Y in their home` (n/a rows excluded)
- `lines: A of B always-loaded lines pass both tests`
- `load: B lines loaded on every task`

## 5. One next step

Take the first class with a finding, in this order:

1. Setup regressed: `CLAUDE.md` is no longer a symlink to `AGENTS.md`, or a `fixed` row is missing.
2. Always-loaded lines that fail a test.
3. Misplaced statements.

Name one change that fits one pull request. Say which file it touches and what it removes or moves. If it touches a steering path, say: steering diff, a human merges.

If that change alone does not fit one pull request, do not shrink it. Say the gap is a phase, and point at the cleanup skill's refactor mode.

## 6. Writing skills

If the next step writes prose or comments, look for these in `.agents/skills/`, `.claude/skills/` and `~/.claude/skills/`:

- `unslop` (English prose), `unslop-de-kompakt` (German prose)
- `comment-review` (comments on new work), `comment-cleanup` (comments in existing code)

Name the ones you find next to the step. Say nothing about the ones you do not find.

## Report format

```
rows   X of Y in their home
lines  A of B always-loaded lines pass
load   B lines on every task

next   <one change, one PR, which file>
tools  <writing skills found, or omit the line>

<the row table, then the failing lines, file:line — reason>
```
