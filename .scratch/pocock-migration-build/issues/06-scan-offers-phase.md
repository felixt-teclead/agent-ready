# 06: The scan offers to start a phase

**What to build:** When the scan calls a gap a phase, it offers to start `cleanup` §1 instead of only pointing to it. Setup and update hand-overs run the scan. Only the scan decides when a gap is a phase. Decision: [Which parts of the migration run on their own](../../pocock-migration/issues/10-building-blocks.md).

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Scan §4 phase case offers to start `cleanup` §1
- [x] Setup hand-over runs the scan
- [x] Update hand-over runs the scan
