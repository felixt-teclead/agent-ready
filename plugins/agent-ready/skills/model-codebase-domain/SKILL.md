---
name: model-codebase-domain
description: Build or complete CONTEXT.md and ADRs for a whole existing codebase from its code, old specs and past discussions, then fold the spec and plan folders. Use when a repo needs its domain model written, rebuilt or completed.
---

# Model a codebase's domain

**Goal: `CONTEXT.md` and `docs/adr/` hold what the code does, in the words
the team uses, and nothing an earlier source settled is missing; the user
approved every entry; each folded spec or plan folder has the user's
answer.** `/domain-modeling` sets the form of both files; this skill feeds
it the repo's sources and records the progress. Where `/domain-modeling`
writes each term inline, this skill collects the entries per topic and
writes them after approval.

Sources, by rank:

1. **Code**: the truth for behaviour and decisions.
2. **Existing `CONTEXT.md` and ADRs**: checked against the code.
3. **Earlier material**: specs, plans, architecture docs, merged pull
   request descriptions and issues. Language and decisions only: how people
   inside and outside the code name things, and what they chose.

A behaviour conflict between a source and the code: the code wins, no
question. A naming conflict: the user decides.

`CONTEXT.local.md`, when present and gitignored, maps canonical terms to one
developer's terms. Use the personal term in chat with that developer only;
code, commits, issues, PRs and ADRs keep the canonical one. This skill never
creates the file.

With `CONTEXT-MAP.md`, `CONTEXT.md` means each context's file.

## 1. Worklist

Run the [worklist's Start or resume](../adopt-pocock-methodology/worklist.md#start-or-resume):
branch `model-codebase-domain`, setting `specs:`, default `delete`. Your
section:

```
## model-codebase-domain
framework: active | retired
- [ ] doc: <folder or file>
  - issue #<n>: <title>
- [ ] code: <top-level area>
- [ ] discussions
- [ ] fit check
- [ ] folders
```

Rows, from [measure.md](../setup-codebase-for-agents/measure.md)'s
[Old setup](../setup-codebase-for-agents/measure.md#4-old-setup) and
inventory:

- **Build**, no `CONTEXT.md` or `CONTEXT-MAP.md`: one `doc:` row per specs
  and plans hit, per architecture doc, and for `docs/adr/`; one `code:` row
  per top-level code area; one `discussions` row.
- **Complete**, the domain file exists: the same rows without `code:`. Each
  row proposes only what `CONTEXT.md` and `docs/adr/` lack.

Show the list; the user strikes rows. A struck folder is neither folded nor
removed.

**Framework.** Under `owner: adopt-pocock-methodology` the preflight has
retired the old framework: `retired`. Alone: `active` when Old setup lists
a plugin, skill or hook hit or a framework section, else `retired`. An
overridden framework keeps its live plans in `.superpowers/`, so its
committed folders fold whole. Write the verdict into the section; tell the
user when it is `active`.

Commit the worklist.

## 2. Rows

Per `doc:`, `code:` or `discussions` row, run `/domain-modeling` over it with
the ranks above. `discussions`: the newest 100 merged pull requests and 100
issues, title and body (`gh pr list --state merged`, `gh issue list --state
all`, `--limit 100 --json title,body`), or the tracker's equivalent. Each
row yields:

- **Terms.** Group the proposed `CONTEXT.md` entries by domain topic. Per
  topic, the user approves, edits or strikes each entry. Write approved
  entries only.
- **ADRs.** Only decisions that pass `/domain-modeling`'s bar and that the
  code still shows. A decision the code does not show is dropped.
- **Unfinished plans** (plan rows only). Candidates from unchecked plan
  items, checked against the code: done in code → dropped. The user
  confirms each remaining one. File it in the tracker
  (`docs/agents/issue-tracker.md`) with the `needs-triage` role's label from
  `AGENTS.md`'s Triage labels; no labels → none. Add `- issue #<n>: <title>`
  under the row.
- **Framework active.** A spec or plan is finished when the code shows all
  of it. Fold finished ones only. Each unfinished plan stays as it is and
  gets one issue, "Fold and remove `<plan>` once it finishes", in place of
  the item issues above.

Tick the row and commit.

## 3. Fit check

Read `CONTEXT.md` and `docs/adr/` whole. Flag:

- `CONTEXT.md` entries holding implementation detail;
- ADRs that fail `/domain-modeling`'s bar;
- terms defined twice.

Propose a fix for each. Apply the fixes the user accepts, then ask
fix-or-keep for each remaining item. A kept item goes into
`.agents/deviations.md` as the scan's
[Accepted deviations](../scan-codebase-for-agents/SKILL.md#accepted-deviations)
says, class `fit check`. Tick the row and commit.

## 4. Folders

Show the settings again; `specs:` is the answer that only makes sense now.
A folded folder still reaches every agent that searches the repo and pulls
it toward old decisions: suggest removing it. Per folded spec or plan
folder, the user answers delete, archive or keep, the setting as the
default. With the framework active, the answer covers the finished files
only.

- **delete**: `git rm -r <folder>`.
- **archive**: `git mv <folder> docs/archive/<folder>/`, plus
  `docs/archive/<folder>/README.md`: "Historical. Superseded by
  `CONTEXT.md` and `docs/adr/`. Do not follow."
- **keep**: its line goes into `.agents/deviations.md`, class `old setup`.

A deleted or moved folder's pointers change in the same commit, as
[Moving a statement](../cleanup/SKILL.md#moving-a-statement) in `cleanup`
says. Architecture docs stay; `route-codebase-docs` handles them. Tick the
row and commit.

## 5. End

- **`owner: adopt-pocock-methodology`**: hand back; the caller keeps the
  worklist and opens the pull request.
- **`owner: model-codebase-domain`**: the worklist's
  [End](../adopt-pocock-methodology/worklist.md#end), then one pull request.
  Its body lists the issues filed, for `/triage`, and the lines added to
  `.agents/deviations.md`; with those lines, a human merges.

Done when every worklist row is ticked, every folded folder has its answer,
and every unfinished plan left in place has its issue.
