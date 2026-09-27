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

- **It exists**: resume on its branch at the first open row. A worklist
  whose `owner:` is `adopt-pocock-methodology` means a caller owns the
  branch, the settings and the pull request.
- **It does not exist**: start from a clean tree on a new branch,
  `model-codebase-domain`, from the default branch. Ask the setting
  `specs:`, default `delete`. Write the worklist with `owner:
  model-codebase-domain`.

Rows: one `doc:` row per spec folder, plan folder, architecture doc, and
the existing `CONTEXT.md` and `docs/adr/`; one `code:` row per top-level
code area. Show the list; the user strikes rows. The step runs even when
there is no doc row.

Commit the worklist.

## 2. Agent-invokable copy

The pinned `/domain-modeling`:

- **No plugin** (this skill sits in `.agents/skills/`):
  `.agents/skills/domain-modeling/`.
- **Plugin**: the `mattpocock-skills` plugin next to this one,
  `${CLAUDE_PLUGIN_ROOT}/../../mattpocock-skills/*/skills/engineering/domain-modeling/`.

Not found → stop and say which path you checked. Copy the folder to
`.claude/skills/migrate-domain-modeling/`. In the copy's frontmatter set
`name: migrate-domain-modeling` and delete any `disable-model-invocation`
line. The pinned folder stays unchanged. Commit the copy.

Done when `/migrate-domain-modeling` is in your skill list. If this session
does not list it yet, read the copy's `SKILL.md` and follow it.

## 3. Rows

Per `doc:` or `code:` row, run `/migrate-domain-modeling` over it with the
ranks above. Each row yields:

- **Terms.** Group the proposed `CONTEXT.md` entries by domain topic. Per
  topic, the user approves, edits or strikes each entry. Write approved
  entries only.
- **ADRs.** Only decisions that pass `/domain-modeling`'s bar and that the
  code still shows. A spec decision the code does not show is dropped.
- **Unfinished plans** (plan rows only). Candidates from unchecked plan
  items, checked against the code: done in code → dropped. The user
  confirms each remaining one. File it in the tracker
  (`docs/agents/issue-tracker.md`) with the label `needs-triage`.

Tick the row and commit. The worklist carries the run across sessions.

## 4. Fit check

Read `CONTEXT.md` and `docs/adr/` whole. Flag:

- `CONTEXT.md` entries holding implementation detail;
- ADRs that fail `/domain-modeling`'s bar;
- terms defined twice.

Propose a fix for each. Apply the fixes the user accepts, then ask
fix-or-keep for each remaining item. Each kept item goes under `Known
deviations`. Tick the row and commit.

## 5. Folders

Show the settings again; the `specs:` answer is the one that only makes
sense now. Then per spec or plan folder, the user answers delete or
archive, the setting as the default:

- **delete**: `git rm -r <folder>`.
- **archive**: `git mv <folder> docs/archive/<folder>/`, plus
  `docs/archive/<folder>/README.md`: "Historical. Superseded by
  `CONTEXT.md` and `docs/adr/`. Do not follow."

Architecture docs stay; `route-codebase-docs` handles them. Tick the row
and commit.

## 6. End

`git rm -r` the copy from step 2 and commit. `/domain-modeling` is
human-only again.

- **`owner: adopt-pocock-methodology`**: hand back; the caller keeps the
  worklist and opens the pull request.
- **`owner: model-codebase-domain`**: delete the worklist in the same
  commit, then open one pull request. Its body lists the issues filed and
  the known deviations.

Done when every worklist row is ticked, every folder has its answer, and
`.claude/skills/migrate-domain-modeling/` is gone.
