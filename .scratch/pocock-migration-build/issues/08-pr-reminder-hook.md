# 08: Remind the team after a PR opens

**What to build:** PR hook per the prototype in [PR hook behaviour](../../pocock-migration/issues/05-pr-hook-behaviour.md) (asset `05-architecture-review-reminder.sh`): `PostToolUse` after `gh pr create`, blocks nothing, skips the review PR, a merged review PR in N days, a fresh open review PR, `gh`/`jq` failure, and a second offer the same day in the same clone. Offer text: "No architecture review in N days. Run /improve-codebase-architecture in a fresh worktree? Not touching the PR." Steering diff, a human merges.

**Blocked by:** 07: Opt in to recurring architecture reviews

**Status:** done

- [x] Each skip case exits silently
- [x] Offer appears once per clone per day
- [x] Wired in plugin hooks and no-plugin setup step 9
- [x] Verify step in setup §4 covers it
