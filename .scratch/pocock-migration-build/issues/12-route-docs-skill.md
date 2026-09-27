# 12: Step 2a skill: route statements

**What to build:** A skill, runnable alone: extract statements from docs agents read, group by topic, route with per-topic approval, rewrite homes, lever verdicts with fix-or-keep, pointer fixes, scan green. Makes its own agent-invokable copy of `/writing-for-agents`, removed after. Decisions: [How /writing-for-agents shapes the doc-cleanup step](../../pocock-migration/issues/03-doc-cleanup-step.md), [Who fixes pointers when a statement moves](../../pocock-migration/issues/12-pointer-updates.md), [Which parts of the migration run on their own](../../pocock-migration/issues/10-building-blocks.md). Name: `route-codebase-docs`.

**Blocked by:** 04: Scan flags dead pointers, 05: Moving PRs fix their pointers

**Status:** ready-for-agent

- [ ] Nothing unapproved moves
- [ ] Every lever has a verdict
- [ ] Moved statements leave no dead pointer
- [ ] Done = scan green (comment pass excluded)
