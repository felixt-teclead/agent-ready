---
name: route-codebase-docs
description: Route every statement in the docs agents read to its one home, rebuild those homes with /writing-for-agents, and fix the pointers. Use when steering docs repeat, contradict or sprawl.
---

# Route a codebase's docs

**Goal: every statement in the docs agents read sits in its one home, every
move approved by the user; every rebuilt doc has a verdict per lever; the
scan is green.** The homes come from setup's
[routing table](../setup-codebase-for-agents/routing-table.md); the writing
comes from `/writing-for-agents`, which you run directly. Comments are
`cleanup`'s job, not this skill's.

**In scope:** the docs agents read. Run
[measure.md](../setup-codebase-for-agents/measure.md) and take the files its
inventory marks always loaded, loaded on a trigger, or pointed at. Leave
out:

- the files `.agents/agent-ready-manifest.json` lists (fetched skills);
- a skill production code loads (the scan's ruling in its
  [Measure](../scan-codebase-for-agents/SKILL.md#1-measure) section): it
  moves only whole, by its row, and is never rewritten;
- `CONTEXT.md` and `docs/adr/`, `model-codebase-domain`'s files: never
  rebuilt; `CONTEXT.md` takes new terms in [Rewrite homes](#4-rewrite-homes);
- tool-owned blocks (the scan's
  [Lines](../scan-codebase-for-agents/SKILL.md#2-lines)).

Docs for humans, such as `README.md`, change only where a statement moves
out or a pointer breaks.

**Setup first.** Measure's statuses give a finding of the scan's Missing
fixed rows class
([One next step](../scan-codebase-for-agents/SKILL.md#4-one-next-step)) →
stop, and tell the user to re-run `/setup-codebase-for-agents`, merge its
pull request, then run this again.

## 1. Worklist

Run the [worklist's Start or resume](../adopt-pocock-methodology/worklist.md#start-or-resume):
branch `route-codebase-docs`. Its Start asks `architecture:` when an
architecture doc exists. Your section:

```
## route-codebase-docs
- [ ] extract
- [ ] topic: <topic>
  - <file:line> <statement> → <route>
- [ ] home: <file>
- [ ] levers: <file>
- [ ] scan
  - <first run's three numbers> → <last run's three numbers>
```

Commit the worklist.

## 2. Extract

Split every in-scope doc into single statements, each with its `file:line`:
a list item or a sentence that says one thing. Group them by topic, across
docs, so duplicates and conflicts sit side by side: one `topic:` row per
group, its statements under it.

Tick `extract` and commit. Done when every non-blank line of every in-scope
doc, headings aside, sits under a `topic:` row.

## 3. Route, per topic

Per statement, propose one route:

- **home**: a file, by the routing table row the statement belongs to. It
  may be the file it is in now.
- **tool**: a lint rule, a config value or a test that enforces it.
- **delete**: a no-op, or a duplicate whose one copy keeps a home. Name
  which.

Two rules on top of the routing table:

- **Domain terms** route to `CONTEXT.md`, in `/domain-modeling`'s entry
  form.
- **Framework sections** (measure.md's
  [Old setup](../setup-codebase-for-agents/measure.md#4-old-setup)) route to
  a home, like any statement. Under `owner: adopt-pocock-methodology`,
  propose delete for a framework the preflight retired (its summary under
  the preflight row).

Per topic, the user approves, edits or strikes each route. A struck
statement stays where it is. Write each approved route after its statement,
tick the topic and commit. Nothing moves in this step.

Done when every `topic:` row is ticked.

## 4. Rewrite homes

One `home:` row per file an approved route touches: each target, and each
source that loses a statement. A file whose statements all stay where they
are is no target. Per row:

- Rebuild the file from its statements, in the order and hierarchy
  `/writing-for-agents` sets. A doc for humans keeps its text and loses only
  the moved lines. `CONTEXT.md` gets each approved term appended; every
  entry it holds stays.
- **tool** routes: add the rule to the tool's config and drop the statement.
  A rule the tool cannot express goes back to
  [Route, per topic](#3-route-per-topic) as a home route.
- **Pointers**: fix them in the same commit, as
  [Moving a statement](../cleanup/SKILL.md#moving-a-statement) in `cleanup`
  says.
- An architecture doc with every statement routed: before the first one
  goes, show `architecture:` again; its statements have homes now, so the
  answer is informed. A change goes into the worklist. `delete` → `git rm`
  it and its `AGENTS.md` pointer; `keep` → it stays, with one pointer line
  in `AGENTS.md`.

Tick the row and commit. Done when every approved route has landed and no
file still points at a moved statement's old spot.

## 5. Levers

One `levers:` row per file [Rewrite homes](#4-rewrite-homes) rebuilt,
`CONTEXT.md` aside. Run `/writing-for-agents` over it and
give one verdict, pass or finding, per lever the scan does not test; an
item `.agents/deviations.md` lists is no finding:

- pointer wording
- hierarchy and sprawl
- completion criteria (skills only)
- leading words
- negation

Propose a fix for each finding. Apply the fixes the user accepts, then ask
fix-or-keep for each remaining one. A kept finding goes into
`.agents/deviations.md` as the scan's
[Accepted deviations](../scan-codebase-for-agents/SKILL.md#accepted-deviations)
says, class `levers`. Tick the row and commit.

Done when every lever of every rebuilt file has a verdict and every
fix-or-keep is answered.

## 6. Scan

Run `scan-codebase-for-agents` on the branch and take its report. Per class
of its One next step:

- **Missing fixed rows**: a row this branch removed → undo that route, back
  through [Route, per topic](#3-route-per-topic). Otherwise stop, as under
  **Setup first**.
- **Dead pointers**: point each at the statement's home, or remove it.
- **Failing lines**, and **Misplaced statements and old files**: each
  finding becomes a new `topic:` row; run Route, Rewrite homes and Levers
  over it. An old file takes the action its routing table row names. A skill
  production code loads is never rewritten: `git mv` it whole as its row
  says, fix the path its loader reads, and run the manifest's `check`; or
  the user keeps it.

Run the scan again after each fix. A finding the user keeps, or whose
statement the user struck in Route, per topic, goes into
`.agents/deviations.md`, as under [Levers](#5-levers), with its class; a
struck one without asking again. Write
the first and last run's three numbers under `scan`, tick it and commit.
Done when the scan is green.

## 7. End

- **`owner: adopt-pocock-methodology`**: hand back; the caller keeps the
  worklist and opens the pull request.
- **`owner: route-codebase-docs`**: the worklist's
  [End](../adopt-pocock-methodology/worklist.md#end). The pull request body
  lists, per topic, the count per route (home, tool, delete) and the files
  touched; the scan's numbers; the lines added to `.agents/deviations.md`.

Done when every worklist row is ticked.
