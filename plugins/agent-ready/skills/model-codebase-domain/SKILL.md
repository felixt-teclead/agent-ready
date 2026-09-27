---
name: model-codebase-domain
description: Build or complete CONTEXT.md and ADRs for a whole existing codebase, then fold its spec and plan folders. Use when a repo's domain model is missing, or lags its old specs and past discussions.
---

# Model a codebase's domain

**Goal: `CONTEXT.md` and `docs/adr/` hold what the code does, in the words
the team uses, and nothing an earlier source settled is missing; the user
approved every entry; each folded spec or plan folder has the user's
answer.** `/domain-modeling` sets the form of both files; this skill feeds
it the repo's sources and records the progress.

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
code, commits, issues, PRs and ADRs keep the canonical one. Only its
developer writes it.

With `CONTEXT-MAP.md`, `CONTEXT.md` means each context's file.

## 1. Worklist

Run the [worklist's Start or resume](../adopt-pocock-methodology/worklist.md#start-or-resume):
branch `model-codebase-domain`. Its Start asks `specs:` when a specs and
plans hit exists. Your section:

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

Run [measure.md](../setup-codebase-for-agents/measure.md). Rows, from its
inventory and its
[Old setup](../setup-codebase-for-agents/measure.md#4-old-setup):

- **Build**, no `CONTEXT.md` or `CONTEXT-MAP.md`: one `doc:` row per specs
  and plans hit, per architecture doc, and for `docs/adr/`; one `code:` row
  per top-level code area; one `discussions` row.
- **Complete**, the domain file exists: the same rows without `code:`. Each
  row proposes only what `CONTEXT.md` and `docs/adr/` lack.

Show the list; the user strikes rows. A struck folder is neither folded nor
removed; its line goes into `.agents/deviations.md` as under
[Folders](#4-folders) keep.

**Framework.** `active` unless measure.md's
[Old setup](../setup-codebase-for-agents/measure.md#4-old-setup) calls it
retired; alone, a framework section also makes it `active` (under
`owner: adopt-pocock-methodology`, `route-codebase-docs` deletes those in
the same pull request). Write the verdict into the section; tell the user
when it is `active`.

Commit the worklist.

## 2. Rows

Per `doc:`, `code:` or `discussions` row, run `/domain-modeling` over it with
the ranks above. `discussions`: the newest 100 merged pull requests without
the `cleanup` label, and 100 issues, title and body
(`gh pr list --state merged --search '-label:cleanup'`,
`gh issue list --state all`, `--limit 100 --json title,body`), or the
tracker's equivalent. Each row yields:

- **Terms.** Collect the proposed `CONTEXT.md` entries, overriding
  `/domain-modeling`'s inline writes, and group them by domain topic. Per
  topic, the user approves, edits or strikes each entry. Write approved
  entries only.
- **ADRs.** Proposed with the row's terms and approved the same way: only
  decisions that pass `/domain-modeling`'s bar and that the code still
  shows.
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
- **Framework retired.** A plan with an open "Fold and remove `<plan>`"
  issue from an earlier run: fold it, and close that issue.

A row is done when every domain term its source names, and every decision
it shows that passes the bar, sits in `CONTEXT.md` or `docs/adr/`, is struck
by the user, or was dropped above. Then tick it and commit.

## 3. Fit check

Read `CONTEXT.md` and `docs/adr/` whole. Flag:

- `CONTEXT.md` entries holding implementation detail;
- ADRs that fail `/domain-modeling`'s bar;
- terms defined twice.

An item `.agents/deviations.md` lists is no finding.
[Fix-or-keep](../adopt-pocock-methodology/worklist.md#fix-or-keep) each, class
`fit check`. Done when every `CONTEXT.md` entry and every ADR was checked
for the three flags and every fix-or-keep is answered; then tick the row
and commit.

## 4. Folders

Show the settings again; `specs:` is the answer that only makes sense now.
A folded folder still reaches every agent that searches the repo and pulls
it toward old decisions: suggest removing it. Per folded spec or plan
folder, the user answers delete, archive or keep, the setting as the
default. Each answer acts on the folder, or with the framework active on its
finished files:

- **delete**: `git rm -r`.
- **archive**: `git mv` to `docs/archive/<folder>/`, plus
  `docs/archive/<folder>/README.md`: "Historical. Superseded by
  `CONTEXT.md` and `docs/adr/`. Do not follow."
- **keep**: its line goes into `.agents/deviations.md`, class `old setup`.

With the framework `active`, a folder that keeps unfinished plans gets its
line in `.agents/deviations.md`, class `old setup`: "kept while
`<framework>` runs".

A deleted or moved folder's pointers change in the same commit, as
[Moving a statement](../cleanup/SKILL.md#moving-a-statement) in `cleanup`
says. Architecture docs stay; `route-codebase-docs` handles them. Tick the
row and commit.

## 5. End

Still no `CONTEXT.md` (every entry struck, or no domain terms): its line
goes into `.agents/deviations.md`, class `domain`, so later runs do not
build it again. Then:

- **`owner: adopt-pocock-methodology`**: hand back; the caller keeps the
  worklist and opens the pull request.
- **`owner: model-codebase-domain`**: the worklist's
  [End](../adopt-pocock-methodology/worklist.md#end). The pull request body
  lists the issues filed, for `/triage`, and the lines added to
  `.agents/deviations.md`. Tell the user: "After the merge, unsure what's
  next? Run `/ask-agent-ready`."

Done when every worklist row is ticked, every folded folder has its answer,
and every unfinished plan left in place has its issue.
