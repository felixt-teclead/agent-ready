# 02: Write-once path list plus done files

**What to build:** Parallel and stacked cleanup PRs stop conflicting. `cleanup` §1 writes the path list once; each cleanup PR adds its own done file listing the files it covered; "files left" = list minus all done files, in continuous mode, fast mode and the SessionStart hook (no `gh`). The phase end deletes list and done folder. Decision: [Where cleanup keeps its state and which files it skips](../../pocock-migration/issues/11-cleanup-state-and-open-branches.md). Steering diff (hook), a human merges.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] No cleanup step edits the path list after §1
- [ ] Each continuous and fast PR adds one done file named after its branch
- [ ] The SessionStart hook reports files left from list minus done files
- [ ] Phase end deletes list and done folder
- [ ] `comment-review` skip rule still finds the phase files it relies on
