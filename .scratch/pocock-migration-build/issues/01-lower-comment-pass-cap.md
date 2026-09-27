# 01: Lower the comment-pass cap to 10

**What to build:** New installs default to 10 files per comment-pass batch. The `cleanup` fallback (no plugin) and setup interview G recommend the same. Decision: [How /writing-for-agents shapes the doc-cleanup step](../../pocock-migration/issues/03-doc-cleanup-step.md). Steering diff: `plugin.json`, a human merges.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `cleanup_comments_max_files` defaults to 10
- [x] `cleanup` §4 no-plugin fallback says cap 10
- [x] Setup interview G recommends 10
