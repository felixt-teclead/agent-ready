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
   request descriptions and issues, and the team's own language sources: a
   glossary or data dictionary, in-repo backlog tickets, meeting notes,
   requirements. Language and decisions only: how people inside and outside
   the code name things, and what they chose.

A behaviour conflict between a source and the code: the code wins, no
question. A naming conflict: the user decides.

`CONTEXT.local.md`, when present and gitignored, maps canonical terms to one
developer's terms. Use the personal term in chat with that developer only;
code, commits, issues, PRs and ADRs keep the canonical one. Only its
developer writes it.

With `CONTEXT-MAP.md`, `CONTEXT.md` means each context's file.

**The repo's ADR rules** (a README or template in `docs/adr/`) outrank
`/domain-modeling`'s form: numbering, form, status lifecycle, and whether
history may be deleted. An ADR index (a list of ADR titles) stays current
with each ADR written or changed.

## 1. Worklist

Run the [worklist's Start or resume](../adopt-pocock-methodology/worklist.md#start-or-resume):
branch `model-codebase-domain`, or the owner's branch as a block. Its Start
asks `specs:` when a specs and plans hit exists. Your section:

```
## model-codebase-domain
framework: active | retired
- [ ] code: <folder>
- [ ] doc: <file, or files of one folder>
  - issue #<n>: <title>
- [ ] discussions
- [ ] approve
- [ ] fit check
- [ ] folders
```

Run [measure.md](../setup-codebase-for-agents/measure.md). Rows, from its
inventory and its
[Old setup](../setup-codebase-for-agents/measure.md#4-old-setup), in this
order:

- **Build**, no `CONTEXT.md` or `CONTEXT-MAP.md`: one `code:` row per folder
  one level under each source root (`src/lib`, `src/app`; a root's loose
  files join its first row). Then `doc:` rows: per specs and plans hit,
  one per spec or plan folder, never their shared parent; per architecture
  doc; for `docs/adr/` when it exists; per team language source (glossary
  or data dictionary, in-repo backlog, meeting notes, requirements). Then
  `discussions`, `approve`, `fit check`, `folders`.
- **Complete**, the domain file exists: the same rows without `code:`. Each
  row proposes only what `CONTEXT.md` and `docs/adr/` lack.

**Size.** A row fits one commit and one session. A `doc:` row holds at most
about 10 files or 3,000 lines: split a bigger folder into consecutive rows
(`doc: docs/plans/ 1-10`), in `git ls-files` order. A `code:` row too big
for a session splits by its subfolders.

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

Per `code:`, `doc:` or `discussions` row, run `/domain-modeling` over it
with the ranks above; a doc row checks its terms against the code as it
goes. `discussions`: the newest 100 merged pull requests without the
`cleanup` label, and 100 issues, title and body
(`gh pr list --state merged --search '-label:cleanup'`,
`gh issue list --state all`, `--limit 100 --json title,body`), or the
tracker's equivalent; an in-repo backlog is the tracker. A tracker with
little in it: add merge commit messages (`git log --merges -100
--format=%B`). Each row yields:

- **Proposals.** The row's `CONTEXT.md` entries, and ADRs for decisions
  that pass `/domain-modeling`'s bar and that the code still shows,
  overriding `/domain-modeling`'s inline writes. Drop what `CONTEXT.md`,
  `docs/adr/` or earlier proposals hold; merge a variant into its earlier
  proposal. Write them to `.agents/domain-proposals.md`, grouped by domain
  topic, each with its row.
- **Plans** (spec and plan rows). Judge each by its deliverables first: the
  code, migrations, tests or documents it names, found in the code, the
  docs, an in-repo backlog's status or notes. Checkboxes come second: a
  plan template's unticked boxes say nothing once the deliverables exist.
  - **finished**: every deliverable exists.
  - **superseded**: a later plan, a pull request or its own header replaces
    it. Dropped, no issue.
  - **unfinished**: its items whose deliverable is missing (for a plan
    without checkboxes, the open work it lists) are candidates. The user
    confirms each. File it in the tracker (`docs/agents/issue-tracker.md`)
    with the `needs-triage` role's label from `AGENTS.md`'s Triage labels;
    no labels → none. Add `- issue #<n>: <title>` under the row. An issue
    filed in error: close it and delete its line.
- **Framework active.** Fold finished and superseded ones only. Each
  unfinished plan stays as it is and gets one issue, "Fold and remove
  `<plan>` once it finishes", in place of the item issues above.
- **Framework retired.** A plan with an open "Fold and remove `<plan>`"
  issue from an earlier run: fold it, and close that issue.

A row is done when every domain term its source names, and every decision
it shows that passes the bar, sits in `CONTEXT.md`, `docs/adr/` or the
proposals file, or was dropped above. Then tick it and commit.

**Approve**, after the last source row. Per topic of the proposals file,
across all rows at once, the user approves, edits or strikes each entry,
and decides each naming conflict. Write the approved entries into
`CONTEXT.md` and `docs/adr/`, in the form the repo's ADR rules set; take the
topic out of the proposals file and commit. Done when every topic is
answered; then delete the file, tick the row and commit.

## 3. Fit check

Read `CONTEXT.md` and `docs/adr/` whole. Flag:

- `CONTEXT.md` entries holding implementation detail;
- ADRs that fail `/domain-modeling`'s bar; the fix is what the repo's ADR
  rules allow (a Deprecated status where history stays);
- terms defined twice;
- an ADR whose form departs from the one the repo's ADR rules set;
- an ADR index that misses an ADR or shows a stale status.

An item `.agents/deviations.md` lists is no finding.
[Fix-or-keep](../adopt-pocock-methodology/worklist.md#fix-or-keep) each, class
`fit check`, one question per flag across all items. Done when every
`CONTEXT.md` entry, every ADR and the index were checked for the five flags
and every fix-or-keep is answered; then tick the row and commit.

## 4. Folders

Show the settings again; `specs:` is the answer that only makes sense now.
A folded folder still reaches every agent that searches the repo and pulls
it toward old decisions: suggest removing it. Per folded spec or plan
folder, the user answers delete, archive or keep, the setting as the
default. Sibling folders under the same parent that hold neither specs nor
plans (notes, prompts) stay; name them, and the user may add them. Each
answer acts on the folder, or with the framework active on its finished
files:

- **delete**: `git rm -r`.
- **archive**: `git mv` to `docs/archive/<folder>/`, plus
  `docs/archive/<folder>/README.md`: "Historical. Superseded by
  `CONTEXT.md` and `docs/adr/`. Do not follow."
- **keep**: its line goes into `.agents/deviations.md`, class `old setup`.

With the framework `active`, a folder that keeps unfinished plans gets its
line in `.agents/deviations.md`, class `old setup`: "kept while
`<framework>` runs".

A deleted or moved folder's pointers change in the same commit, as
[Moving a statement](../setup-codebase-for-agents/pointers.md#moving-a-statement)
says, including those with no new home. The deletes and moves are
[confirmed steps](../setup-codebase-for-agents/confirmed-steps.md): show
every folder's `git rm` or `git mv` and the pointer edits in one view. A
denied one leaves the row open: name the gap and stop. Architecture docs stay;
`route-codebase-docs` handles them. Tick the row and commit.

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
  next? Run `/what-to-do`."

Done when every worklist row is ticked, every folded folder has its answer,
and every unfinished plan left in place has its issue.
