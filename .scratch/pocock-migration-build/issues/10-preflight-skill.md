# 10: Preflight skill: retire an old agent setup

**What to build:** A skill, runnable alone, retires an old agent setup. The inventory of agent artifacts setup did not write lives in `measure.md`, shared with setup. Soft push gate, plugin entries, one skill-and-hook table (replacement, loss, action; user strikes, confirms once), scratch. Decisions: [What migrating the current setup covers](../../pocock-migration/issues/01-migration-scope.md), [Which parts of the migration run on their own](../../pocock-migration/issues/10-building-blocks.md). Name: `retire-agent-setup`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Inventory lists hits with no framework name lists
- [x] Push gate needs explicit "continue anyway"
- [x] Nothing deleted without the one confirmation
- [x] Runs alone and as a migration block
