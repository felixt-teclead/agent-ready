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

**State on the migration branch**: the migration writes `.agents/refactor.md` (`mode: fast`, `parent:` = the comment pass's parent ticket) and the path list, or takes them over. `cleanup` §3 reads `parent:` from there, `refactor-phase.sh` shows the phase in every session on the branch, and `comment-review` sees fast mode. The last commit before the PR deletes both, like the `.scratch` worklist.

**After the merge**: mode `none`. Nothing is left for `cleanup`. `comment-review` covers new files. A new phase starts only when a later scan reports a gap.

Rejected: stop until the phase ends (the user waits, and the phase does work the migration redoes); pause, then resume (the migration empties the path list, so nothing is left to resume).
