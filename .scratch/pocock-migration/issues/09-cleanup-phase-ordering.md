# How a running cleanup phase meets the migration

Type: grilling
Status: resolved
Assignee: Efte
Assignee: Efte

## Question

The migration's comment pass is a `cleanup` fast phase (see [How /writing-for-agents shapes the doc-cleanup step](03-doc-cleanup-step.md)). Decide what happens when the repo already has a phase running (`.agents/refactor.md` exists, continuous or fast, maybe paused): the migration stops, pauses it, or takes over its path list. Also decide whether anything is left for a `cleanup` phase after the migration merges.

## Answer

Grilled with the owner on 2026-09-27.

**The migration covers a phase.** Both count as done when the scan is green and the path list is empty. A phase's scan steps (setup regressed, failing lines, misplaced statements) are doc work that step 2 already does.

**Phase running, not paused (continuous or fast): the migration takes it over.**
- The remaining `.agents/refactor-paths.txt` becomes the migration's path list. Files already cleaned stay done.
- The preflight lists open `cleanup` PRs. The user merges or closes them before step 2. This is a soft gate, like the push gate in [What migrating the current setup covers](01-migration-scope.md).
- The migration PR ends the phase: it deletes the phase file and the path list and closes the parent issue.

**Phase paused**: the migration never lifts a pause on its own.
- Team pause (`paused:` in `refactor.md`): it shows the reason and asks "resume the phase and migrate?". No stops the migration.
- Personal pause (`paused:` in `refactor.local`): the same question, only to that user. Yes deletes the line.

**Reopened 2026-09-27** by a handoff on cleanup as a repeatable cycle. The first answer kept a private phase on the migration branch and deleted it before the PR. That copied `cleanup` instead of using it. Replaced by:

**Three kinds of PR, merged in order:**
1. **Steering PR**: preflight, step 1, step 2a (route statements). A human merges it.
2. **Cleanup PRs**: the migration starts a normal phase (`cleanup` §1 PR: phase file, path list, parent issue), or takes over a running one. The comment pass then runs as normal `cleanup` §3 steps, one PR each. No exception to §3.
3. **Architecture PR**: only on a yes at the end (see [Which parts of the migration run on their own](10-building-blocks.md)).

**Wait or stack**: by default the phase starts after the steering PR merges, so the path list and the scan see the routed docs. In an interactive chat the skill asks "wait for the merge or stack on the steering branch?", default wait.

**Done**: the steering PR is open and the phase is started. The path list need not be empty. Phase state outlives the migration PR, so no file is lost.

Rejected: a private phase on the migration branch, deleted before the PR (a copy of `cleanup`); stop until the phase ends (the user waits, and the phase does work the migration redoes); pause, then resume (the migration empties the path list, so nothing is left to resume).
