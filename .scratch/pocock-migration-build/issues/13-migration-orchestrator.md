# 13: Migration orchestrator and steering PR

**What to build:** `adopt-pocock-methodology`: start checks (no setup → stop; branch → resume; old setup → preflight + chain; not in shape → missing steps only; in shape → stop), one branch, worklist, settings at start and end, calls the three blocks in order, opens the steering PR, offers step 3 in its own `architecture-review` PR, hand-over with the `/ask-matt` line. No logic of its own beyond that. Decisions: [How a user starts the migration later](../../pocock-migration/issues/08-later-entry-point.md), [How a running cleanup phase meets the migration](../../pocock-migration/issues/09-cleanup-phase-ordering.md), [Which parts of the migration run on their own](../../pocock-migration/issues/10-building-blocks.md), [What /domain-modeling produces during migration](../../pocock-migration/issues/02-domain-modeling-step.md).

**Blocked by:** 10: Preflight skill: retire an old agent setup, 11: Step 1 skill: domain modeling, 12: Step 2a skill: route statements

**Status:** ready-for-agent

- [ ] Each start case behaves as decided
- [ ] Blocks called unchanged
- [ ] Worklist and copies removed before the PR
- [ ] Step 3 only on a yes
