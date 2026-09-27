# 14: Hand off to cleanup

**What to build:** After the steering PR the orchestrator starts a normal `cleanup` phase, or takes over a running one (its path list). Team or personal pause → show reason, ask; no stops. Open `cleanup` PRs listed as a soft gate. In a chat: ask wait-for-merge or stack, default wait. Decision: [How a running cleanup phase meets the migration](../../pocock-migration/issues/09-cleanup-phase-ordering.md).

**Blocked by:** 02: Write-once path list plus done files, 03: Fast steps skip files in open PRs, 13: Migration orchestrator and steering PR

**Status:** done

- [x] New phase via `cleanup` §1 unchanged
- [x] Takeover keeps done files
- [x] Pause never lifted without a yes
- [x] Wait/stack asked only in a chat
