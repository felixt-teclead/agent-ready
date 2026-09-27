# 11: Step 1 skill: domain modeling

**What to build:** A skill, runnable alone, builds `CONTEXT.md` and ADRs from code (truth), existing docs (checked) and old specs (language only). Folds spec folders, then delete or archive. Unfinished plans → `needs-triage` issues. Fit check. `CONTEXT.local.md` support. Makes its own agent-invokable copy of `/domain-modeling` and removes it after the run. Decisions: [What /domain-modeling produces during migration](../../pocock-migration/issues/02-domain-modeling-step.md), [Which parts of the migration run on their own](../../pocock-migration/issues/10-building-blocks.md). Name: `model-codebase-domain`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Entries approved per topic, nothing unapproved written
- [x] Spec folders end deleted or archived with the README
- [x] Fit check answered
- [x] Copy removed at the end
