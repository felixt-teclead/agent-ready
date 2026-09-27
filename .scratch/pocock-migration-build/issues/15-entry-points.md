# 15: Entry points for the migration

**What to build:** Setup asks the migration question when the inventory finds an old setup, listing hits. Setup hand-over and PR body say "Migrate later: run `/adopt-pocock-methodology`." The scan report gets an "old setup found" line (hits + migration skill name); it is not a §4 class and never blocks the next step (../../pocock-migration/issues/13-standalone-paths.md). Nothing in `AGENTS.md`. Decision: [How a user starts the migration later](../../pocock-migration/issues/08-later-entry-point.md).

**Blocked by:** 10: Preflight skill: retire an old agent setup, 13: Migration orchestrator and steering PR

**Status:** ready-for-agent

- [ ] Question only when inventory hits
- [ ] Hand-over line on no
- [ ] Scan class placed as decided
