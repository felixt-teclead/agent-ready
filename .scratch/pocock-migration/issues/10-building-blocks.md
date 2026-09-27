# Which parts of the migration run on their own

Type: grilling
Status: resolved
Assignee: Efte

## Question

The owner wants building blocks: every part of the migration usable alone, so a repo can do only part of a migration. Decide the cut, what the migration itself keeps, whether step 3 is mandatory, and which flows start a `cleanup` cycle.

## Answer

Grilled with the owner on 2026-09-27, from a handoff on cleanup as a repeatable cycle.

**Blocks**, each runnable alone:
- **Preflight** (retire old plugins, skills, hooks, scratch): its own skill.
- **Step 1** (`/domain-modeling` plus folding old specs): its own skill.
- **Step 2a** (route statements, lever verdicts): its own skill.
- **Step 2b** (comment pass): the `cleanup` cycle, unchanged.
- **Step 3**: `/improve-codebase-architecture` as it is.

**Migration = orchestrator only**: start checks, worklist, calls the blocks in order. It adds no logic of its own.

**Step 3 is optional.** After the steering PR opens, the skill asks "Run `/improve-codebase-architecture` now in a fresh worktree?". Yes: its own PR labelled `architecture-review`, like a yes to the PR hook. Rejected: a setting at the start (the answer is known only after the work).

**Cleanup is one repeatable cycle**: trigger → phase → PRs → end. Every caller uses it unchanged. Triggers:
- **Migration**: always starts one (see [How a running cleanup phase meets the migration](09-cleanup-phase-ordering.md)).
- **Setup and update**: start none themselves. Their hand-over runs `scan-codebase-for-agents`. When the scan calls a gap a phase, it offers to start `cleanup` §1 instead of only pointing to it.
- **Human**: runs `cleanup` any time.

Only the scan decides when a gap is a phase.
