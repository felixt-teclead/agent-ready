# How /writing-for-agents shapes the doc-cleanup step

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

How does `/writing-for-agents` shape the doc-cleanup step? Decide how much of the step it does on its own, what the migration skill adds, and how it can improve the plugin's own skills. Include where the skill points users to `/ask-matt`: when they are unsure what comes next, why a step comes next, or where they are in the migration.

## Answer

Grilled with the owner on 2026-09-27.

**Branch**: step 2 runs on the migration branch in several commits, and the migration stays one PR (see [What /domain-modeling produces during migration](02-domain-modeling-step.md)).

**Scope**: docs agents read: `AGENTS.md`/`CLAUDE.md`, the docs they point at, and the repo skills kept in the preflight. Docs for humans (README, contributor guides) change only where a statement moved out or a pointer broke.

**Statements**, rule book `migrate-writing-for-agents` plus the setup routing table:
1. **Extract**: split every in-scope doc into single statements. One worklist row per statement, with its source.
2. **Group by topic**: statements about the same thing sit together, across docs, so duplicates and conflicts show.
3. **Route**: per statement the agent proposes a home: old home, new home, a tool (lint, config), or delete (no-op, duplicate, framework-specific). The user approves, edits or strikes per topic. Nothing unapproved moves.
4. **Rewrite**: rebuild each home file from its approved statements.

**Levers**: per rebuilt doc, one verdict per `/writing-for-agents` lever the scan does not test: pointer wording, hierarchy and sprawl, completion criteria (skills only), leading words, negation. The agent proposes fixes, then asks fix-or-keep for the rest. Kept items go into the PR as known deviations.

**Comment pass**: `orchestrate-comment-write`, with `comment-write` and `comment-cleanup` under it, run as a `cleanup` fast phase. One parent ticket, one sub-ticket per batch of files up to the cap, worked in order. Tracker: GitHub or local md tickets. Each sub-ticket becomes one commit on the migration branch. Local tickets live in `.scratch/` and are deleted before the PR, like the worklist.

**Cap**: `cleanup_comments_max_files` default goes from 20 to 10, and the `cleanup` §4 fallback changes with it. `plugin.json` is a steering path, so a human merges that change.

**Done**: every statement has an approved home, the scan is green, every lever has a verdict, every fix-or-keep is answered, and the path list is empty.

**`/ask-matt`**: the skill itself answers "where am I, what's next, why this step" from the worklist: the chain, the current step, open rows, and the reason for the order. `/ask-matt` does not know the migration. At the end of each step and in the PR body, the skill says: "Unsure which Pocock skill fits your next task? Run `/ask-matt`." The user types it, so no `migrate-ask-matt` copy is needed.

**Plugin's own skills**: out of scope, see the map.
