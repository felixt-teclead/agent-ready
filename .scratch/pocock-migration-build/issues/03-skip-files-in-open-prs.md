# 03: Fast steps skip files in open PRs

**What to build:** A fast comment-pass step never cleans a file an open PR touches. Held files stay for a later step. When only held files are left, the step lists them with their PRs and asks: wait or clean anyway. Without `gh` (local tracker): no check, one warning. Continuous mode unchanged. Decision: [Where cleanup keeps its state and which files it skips](../../pocock-migration/issues/11-cleanup-state-and-open-branches.md). Steering-adjacent (`cleanup` skill); a human merges.

**Blocked by:** 02: Write-once path list plus done files

**Status:** ready-for-agent

- [ ] Fast step reads open PR files before picking
- [ ] Held files stay on the list
- [ ] Only-held-files case lists PRs and asks
- [ ] No `gh` → one warning, no check
