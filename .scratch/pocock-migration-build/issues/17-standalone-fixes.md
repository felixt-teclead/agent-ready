# 17: Fix built parts for standalone runs

**What to build:** Apply [What each block does when run alone](../../pocock-migration/issues/13-standalone-paths.md) to parts already built. `model-codebase-domain`: drop the copy step and its fallback, call `/domain-modeling` directly; with an active framework (inventory hit) fold only finished specs and plans, and file a `needs-triage` issue "Fold and remove `<plan>` once it finishes" per unfinished plan, leaving it untouched. PR reminder hook: on a yes the agent opens the worktree and asks the user to type `/improve-codebase-architecture`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] No `migrate-*` copy left in any skill
- [x] Unfinished plans stay, each with an issue
- [x] Reminder offer text says the user types the command
