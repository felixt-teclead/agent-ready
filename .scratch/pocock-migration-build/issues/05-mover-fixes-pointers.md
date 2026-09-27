# 05: Moving PRs fix their pointers

**What to build:** Any `cleanup` PR that moves a statement searches the repo for the old spot (file path, heading anchor) and rewrites each hit in the same PR. A pointer in a steering file makes the PR a steering diff. Decision: [Who fixes pointers when a statement moves](../../pocock-migration/issues/12-pointer-updates.md).

**Blocked by:** 04: Scan flags dead pointers

**Status:** ready-for-agent

- [ ] `cleanup` states the rule where statements move
- [ ] The rule names the steering-diff consequence
- [ ] A scan after such a PR shows no dead pointer
