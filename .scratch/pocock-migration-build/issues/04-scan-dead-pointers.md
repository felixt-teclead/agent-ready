# 04: Scan flags dead pointers

**What to build:** The scan reports backtick paths and markdown links whose file or heading anchor no longer exists, in the docs it already measures. New class in §4, right after "Setup regressed". Anchors use GitHub heading slugs. Decision: [Who fixes pointers when a statement moves](../../pocock-migration/issues/12-pointer-updates.md).

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A dead path in a measured doc becomes the next step when setup is fine
- [x] A dead anchor is caught
- [x] Docs outside the measured set are not checked
- [x] Report shows the finding
