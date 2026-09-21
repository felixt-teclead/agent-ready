# Verum measured against the retrofit procedure

Date: 2026-09-21. Subject: `Teclead/verum` at `0709aa5b`, 2365 commits, 542
tracked markdown files.

Read-only. Nothing in verum was changed. This report validates the Stage 1
measurements of `docs/retrofit.md` and reports what they found.

## 1. Citation failures

Command, run from the blueprint checkout:

```sh
node bin/doc-guards.mjs check --root ../verum \
  --config docs/research/verum-doc-guards.config.json
```

Result: **1 violation in 141 citations checked**. The index guard passes over 13
domain files.

```
docs/architecture/security-and-access.md:67 — cited path does not resolve:
backlog/ad-hoc/AH19-entity-scoped-rls-financial-tables.md
```

The number depends on the config, not on the repo. The same repo scanned with
guard defaults and no tuning gave 381 failures, 252 of them bare directory
citations. The config that produced 1 sets `minCitations: 100`,
`resolveRoots: [".claude/skills"]`, one `allowMissing` entry for a gitignored
client folder, and 8 exempt globs for dated records.

**Effect on the procedure.** Stage 5 now tunes the config before it reads the
result, and says to expect a short seeded list or none. Seeding hundreds of
entries is the signal of a wrong config.

## 2. Line counts

In scope for the 400-line prompt, which is `docs/ARCHITECTURE.md` plus
`docs/architecture/**`: **8 of 14 files are over 400 lines**.

| File | Lines |
| --- | --- |
| `docs/architecture/data-model.md` | 1231 |
| `docs/architecture/ingestion-extraction.md` | 1179 |
| `docs/architecture/frontend-and-library-layout.md` | 914 |
| `docs/architecture/review-queue.md` | 852 |
| `docs/architecture/manual-entry.md` | 775 |
| `docs/architecture/loans-and-debt.md` | 762 |
| `docs/architecture/crypto.md` | 525 |
| `docs/architecture/account-matching.md` | 429 |

`docs/ARCHITECTURE.md` is 96 lines and indexes all 13 domain files.

Out of scope, and worth naming: **98 further markdown files are over 400 lines**,
the largest 3514. Almost all are dated records under `docs/superpowers/plans/`,
`docs/backlog/`, `docs/planning/` and `docs/meeting-notes/`. A prompt that fired
on every file over 400 lines would fire 106 times in this repo and be ignored.
The scope limit in ticket #4 is what makes the prompt usable.

## 3. Inbound pointers

No orphans. Every architecture doc is cited by at least 2 files.

`docs/ARCHITECTURE.md` 176, `data-model.md` 29, `ingestion-extraction.md` 23,
`frontend-and-library-layout.md` 20, `security-and-access.md` 12,
`review-queue.md` 10, `manual-entry.md` 10, `loans-and-debt.md` 10,
`crypto.md` 8, `mcp.md` 7, `reconciliation-datev.md` 4, `account-matching.md` 4,
`known-gaps.md` 3, `private-markets.md` 2.

The 176 pointers at the index are the reason Stage 7 does not move files. The
count also shows which docs a split would hurt: `data-model.md` is both the
longest and the second most cited.

## 4. Anchored citations

**1326 lines carry an anchor, in 446 files.** Outside the dated records: **667
lines in 256 files.**

This is the largest single edit in the retrofit, and the first draft of the
procedure buried it in one sentence of Stage 2.

**Effect on the procedure.** Stripping the anchors is now Stage 3, its own pull
request, scoped to live docs and code. The dated records keep their anchors,
for the same reason they are exempt from the guard.

## 5. Path-scoped rules

Verum has 4 files in `.claude/rules/`, one of them 908 lines.

**179 files cite a rule file by name.** Ticket #7 measured that 20 of them are
not matched by the globs of the rule they cite, so the agent that edits those
files never loads the rule it is told to follow.

`.claude/rules/governance.md` has **no `paths:` list at all**. No glob ever
loads it. It is a document that describes its own scope in prose and relies on
a reader finding it.

**Effect on the procedure.** Stage 1 now measures rule files with no `paths:`
list. The decision to remove path-scoped rules from an existing repo stays a
per-file content decision.

## 6. What the measurement did not test

Stages 2, 3, 4, 6 and 7 were not run. This was a read-only pass, so the merge
behaviour of Stage 2, the anchor rewrite of Stage 3, and the split steps of
Stage 7 are still unvalidated. The split steps carry the one known failure in
the record: verum's own split reconstructed line-identical and still dropped a
rule that five code comments pointed at.
