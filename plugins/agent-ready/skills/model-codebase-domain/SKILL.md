---
name: model-codebase-domain
description: Build CONTEXT.md and ADRs for an existing codebase from its code, docs and old specs, then retire the spec and plan folders. Use when a repo needs its domain model written or rebuilt, or when adopt-pocock-methodology runs step 1.
---

# Model a codebase's domain

**Goal: `CONTEXT.md` and `docs/adr/` hold what the code does, in the words
the team uses, every entry approved by the user; old spec and plan folders
are gone or archived.** `/domain-modeling` sets the rules for both files;
this skill feeds it the repo's sources and records the progress.

Sources, by rank:

1. **Code**: the truth for behaviour and decisions.
2. **Existing `CONTEXT.md` and ADRs**: checked against the code.
3. **Specs, plans, architecture docs**: language only, how people inside and
   outside the code name things.

A behaviour conflict between a doc and the code: the code wins, no question.
A naming conflict: the user decides.

`CONTEXT.local.md`, when present and gitignored, maps canonical terms to one
developer's terms. Use the personal term in chat with that developer only;
code, commits, issues, PRs and ADRs keep the canonical one. This skill never
creates the file.

## 1. Branch and worklist

The worklist is `.agents/migration.md`:

```
owner: model-codebase-domain | adopt-pocock-methodology
specs: delete | archive

## model-codebase-domain
- [ ] doc: <folder or file>
- [ ] code: <top-level area>
- [ ] fit check
- [ ] folders

## Known deviations
- <kept item>: <why>
```

- **It exists with this section**: resume on its branch at the first open
  row. `owner: adopt-pocock-methodology` means a caller owns the branch,
  the settings and the pull request.
- **It exists without this section**: the owner is another block. Stop and
  say which run to finish first. When the owner is
  `adopt-pocock-methodology`, add the section and go on.
- **It does not exist**: start from a clean tree on a new branch,
  `model-codebase-domain`, from the default branch. Ask the setting
  `specs:`, default `delete`. Write the worklist with `owner:
  model-codebase-domain`.

Rows: one `doc:` row per spec folder, plan folder, architecture doc, and
the existing `CONTEXT.md` and `docs/adr/`; one `code:` row per top-level
code area. Show the list; the user strikes rows. The step runs even when
there is no doc row.

Run §4 of [measure.md](../setup-codebase-for-agents/measure.md). A plugin,
skill, hook or framework-section hit means the old framework is still
**active**: its unfinished specs and plans stay (step 2). Tell the user.

Commit the worklist.

## 2. Rows

Per `doc:` or `code:` row, run `/domain-modeling` over it with the ranks
above. Each row yields:

- **Terms.** Group the proposed `CONTEXT.md` entries by domain topic. Per
  topic, the user approves, edits or strikes each entry. Write approved
  entries only.
- **ADRs.** Only decisions that pass `/domain-modeling`'s bar and that the
  code still shows. A spec decision the code does not show is dropped.
- **Unfinished plans** (plan rows only). Candidates from unchecked plan
  items, checked against the code: done in code → dropped. The user
  confirms each remaining one. File it in the tracker
  (`docs/agents/issue-tracker.md`) with the label `needs-triage`.
- **Framework active.** A spec or plan is finished when the code shows all
  of it. Fold finished ones only. Each unfinished plan stays as it is and
  gets one `needs-triage` issue, "Fold and remove `<plan>` once it
  finishes", in place of the item issues above.

Tick the row and commit. The worklist carries the run across sessions.

## 3. Fit check

Read `CONTEXT.md` and `docs/adr/` whole. Flag:

- `CONTEXT.md` entries holding implementation detail;
- ADRs that fail `/domain-modeling`'s bar;
- terms defined twice.

Propose a fix for each. Apply the fixes the user accepts, then ask
fix-or-keep for each remaining item. Each kept item goes under `Known
deviations`. Tick the row and commit.

## 4. Folders

Show the settings again; the `specs:` answer is the one that only makes
sense now. Then per spec or plan folder, the user answers delete or
archive, the setting as the default. With the framework active, the
answer covers the finished files only; unfinished specs and plans stay.

- **delete**: `git rm -r <folder>`.
- **archive**: `git mv <folder> docs/archive/<folder>/`, plus
  `docs/archive/<folder>/README.md`: "Historical. Superseded by
  `CONTEXT.md` and `docs/adr/`. Do not follow."

Architecture docs stay; `route-codebase-docs` handles them. Tick the row
and commit.

## 5. End

- **`owner: adopt-pocock-methodology`**: hand back; the caller keeps the
  worklist and opens the pull request.
- **`owner: model-codebase-domain`**: delete the worklist in the same
  commit, then open one pull request. Its body lists the issues filed and
  the known deviations.

Done when every worklist row is ticked, every folder has its answer, and
every unfinished plan left in place has its issue.
