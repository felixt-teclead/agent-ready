---
name: route-codebase-docs
description: Route every statement in the docs agents read to its one home, rebuild those homes with /writing-for-agents, and fix the pointers. Use when steering docs repeat, contradict or sprawl, or when adopt-pocock-methodology runs step 2.
---

# Route a codebase's docs

**Goal: every statement in the docs agents read sits in its one home, every
move approved by the user; every rebuilt doc has a verdict per lever; the
scan is green.** The homes come from setup's
[routing table](../setup-codebase-for-agents/routing-table.md); the writing
comes from `/writing-for-agents`, which you run directly. Comments are
`cleanup`'s job, not this skill's.

**In scope:** the docs agents read. Run §2 of
[measure.md](../setup-codebase-for-agents/measure.md) and take the files it
marks always loaded, loaded on a trigger, or pointed at. Leave out the files
`.agents/agent-ready-manifest.json` lists (fetched skills), `CONTEXT.md` and
`docs/adr/` (`model-codebase-domain` owns them), and tool-owned blocks
(scan §2). Docs for humans, such as `README.md`, change only where a
statement moves out or a pointer breaks.

## 1. Branch and worklist

The worklist is `.agents/migration.md`:

```
owner: route-codebase-docs | adopt-pocock-methodology
architecture: delete | keep

## route-codebase-docs
- [ ] extract
- [ ] topic: <topic>
  - <file:line> <statement> → <route>
- [ ] home: <file>
- [ ] levers: <file>
- [ ] scan

## Known deviations
- <kept item>: <why>
```

- **It exists with this section**: resume on its branch at the first open
  row. `owner: adopt-pocock-methodology` means a caller owns the branch, the
  settings and the pull request.
- **It exists without this section**: the owner is another block. Stop and
  say which run to finish first. When the owner is
  `adopt-pocock-methodology`, add the section and go on.
- **It does not exist**: start from a clean tree on a new branch,
  `route-codebase-docs`, from the default branch. Ask the setting
  `architecture:`, default `delete`: once its statements have homes, an
  architecture doc goes, or stays behind one pointer line in `AGENTS.md`.
  Write the worklist with `owner: route-codebase-docs`.

Commit the worklist.

## 2. Extract

Split every in-scope doc into single statements: one line each, with its
`file:line`. A heading is no statement; a list item or a sentence that says
one thing is.

Tick `extract` and commit. Done when every non-blank line of every in-scope
doc belongs to a statement.

## 3. Route, per topic

Group the statements by topic, across docs, so duplicates and conflicts sit
side by side. One `topic:` row per group, its statements under it.

Per statement, propose one route:

- **home**: a file, by the routing table row the statement belongs to. It
  may be the file it is in now.
- **tool**: a lint rule, a config value or a test that enforces it.
- **delete**: a no-op, or a duplicate whose one copy keeps a home. Name
  which.

Two rules on top of the routing table:

- **Domain terms** route to `CONTEXT.md`, in `/domain-modeling`'s entry
  form.
- **Framework sections** (measure.md §4) route to a home, like any
  statement. Under `owner: adopt-pocock-methodology` the preflight has
  retired the framework, so propose delete there.

Per topic, the user approves, edits or strikes each route. A struck
statement stays where it is. Write the approved routes into the rows, tick
the topic and commit. Nothing moves in this step.

Done when every `topic:` row is ticked.

## 4. Rewrite homes

One `home:` row per file an approved route touches: each target, and each
source that loses a statement. Per row:

- Rebuild the file from its statements, in the order and hierarchy
  `/writing-for-agents` sets. A doc for humans keeps its text and loses only
  the moved lines.
- **tool** routes: add the rule to the tool's config and drop the statement.
  A rule the tool cannot express goes back to §3 as a home route.
- **Pointers**: fix them in the same commit, by the pointer rule at the top
  of [cleanup](../cleanup/SKILL.md).
- An architecture doc with every statement routed: `architecture: delete` →
  `git rm` it and its `AGENTS.md` pointer; `keep` → it stays, with one
  pointer line in `AGENTS.md`.

Tick the row and commit. Done when every approved route has landed and no
file still points at a moved statement's old spot.

## 5. Levers

One `levers:` row per file §4 rebuilt. Run `/writing-for-agents` over it and
give one verdict, pass or finding, per lever the scan does not test:

- pointer wording
- hierarchy and sprawl
- completion criteria (skills only)
- leading words
- negation

Propose a fix for each finding. Apply the fixes the user accepts, then ask
fix-or-keep for each remaining one. Each kept item goes under `Known
deviations`. Tick the row and commit.

Done when every lever of every rebuilt file has a verdict and every
fix-or-keep is answered.

## 6. Scan

Run `scan-codebase-for-agents` on the branch. Its §4 classes are the check:

- **Dead pointers**: point each at the statement's home, or remove it.
- **Setup regressed, failing always-loaded lines, misplaced statements**:
  each finding becomes a new `topic:` row; run §3 to §5 over it.

Run the scan again after each fix. A finding the user strikes in §3 goes
under `Known deviations`. Tick `scan` and commit. Done when the scan names
no class, or only kept findings.

## 7. End

- **`owner: adopt-pocock-methodology`**: hand back; the caller keeps the
  worklist and opens the pull request.
- **`owner: route-codebase-docs`**: delete the worklist in the same commit,
  then open one pull request. Its body lists the routes per topic, the
  scan's three numbers, and the known deviations. A steering file in the
  diff: say "steering diff, a human merges".

Done when every worklist row is ticked.
