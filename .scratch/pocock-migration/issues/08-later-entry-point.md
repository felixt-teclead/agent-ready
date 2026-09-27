# How a user starts the migration later

Type: grilling
Status: resolved
Assignee: Efte

## Question

A user who said no to the migration question during `/setup-codebase-for-agents` wants to migrate later. Decide how they find the migration (skill name, pointer in setup's PR or `AGENTS.md`, a prompt from `scan-codebase-for-agents` or `update-codebase-for-agents`), and what the skill checks before it starts: setup ran and merged, the inventory still finds a current setup, a migration branch already exists.

## Answer

Grilled with the owner on 2026-09-27.

**Finding it**: the migration is a user-invoked skill with its own name. When the user says no, setup's hand-over and PR body name it once: "Migrate later: run `/<name>`." `scan-codebase-for-agents` §4 gets a new class, placed after "Setup regressed" and before "failing always-loaded lines": the inventory finds an old setup, so the next step is the migration. The migration removes many failing lines anyway. Nothing goes into `AGENTS.md`.

**In shape** = `CONTEXT.md` exists and the scan is green. The architecture review is not part of it; it recurs through the PR hook.

**Checks at start**, in order:
1. No `AGENTS.md` on `origin/<default>` → stop, point to `/setup-codebase-for-agents`. The migration does not run setup.
2. Migration branch exists → offer to resume from its worklist. Starting fresh deletes the branch after the user confirms.
3. Inventory finds an old setup → preflight, then the chain.
4. No old setup, not in shape → the chain without the preflight. Steps 1 and 2 run only where their signal is missing (`CONTEXT.md`, scan green).
5. No old setup, in shape → "nothing to migrate", stop.

Then the running-phase check (see [How a running cleanup phase meets the migration](09-cleanup-phase-ordering.md)) and the push gate.

Every run in 3 and 4 ends with step 3, `/improve-codebase-architecture`.

**After the migration**, and in case 5: suggest `/improve-codebase-architecture`, or `/grill-with-docs` for new features.

**No migration marker.** The repo state tells: a branch means running, in shape means done. Rejected: a `pocock-migration` PR label (no new labels), a marker file.
