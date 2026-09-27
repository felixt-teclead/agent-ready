# Who fixes pointers when a statement moves

Type: grilling
Status: resolved
Assignee: Efte

## Question

When a PR moves a statement between files, nothing finds or rewrites the pointers to its old place. That breaks the single-source rule in `AGENTS.md`. Decide who fixes them and what catches misses.

## Answer

Grilled with the owner on 2026-09-27.

**Mover fixes**: before the commit, the agent searches the repo for the old spot (file path, heading anchor) and rewrites each hit in the same PR. A rule in `cleanup` and in step 2a. A pointer in a steering file makes the PR a steering diff.

**Scan catches misses**: a new finding, a backtick path or markdown link whose file or anchor is gone. Scope: only docs the scan already measures. It reuses setup §4's path check and adds GitHub heading-slug matching for anchors. Its own class in scan §4, right after "Setup regressed": a dead pointer misleads the agent, but it is not a broken setup. No scheduled job (map #1: no doc CI).

**Accepted gap**: a pointer whose target still exists but no longer holds the statement.

Rejected: mover only (misses land on `main` unseen); scan only (broken pointers live until the next scan); class "Setup regressed" (one broken link blocks all other steps).
