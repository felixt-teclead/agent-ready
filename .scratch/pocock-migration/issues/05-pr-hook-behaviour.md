# PR hook behaviour

Type: prototype
Status: open
Blocked by: 04, 07

## Question

How does the PR hook behave? Prototype the trigger (`gh pr create`), the check against the marker, the prompt text that offers to run `/improve-codebase-architecture`, and the `userConfig` setting for the window (default 14 days, setup suggests 7). Decide what happens when the user declines.

Already settled in [How the PR hook knows the last architecture review](04-architecture-review-marker.md): the marker, the check, the opt-in, and the accept path (current PR goes through, the review runs in a fresh worktree).
