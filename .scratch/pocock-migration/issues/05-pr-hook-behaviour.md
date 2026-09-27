# PR hook behaviour

Type: prototype
Status: resolved
Blocked by: 04, 07
Assignee: Efte

## Question

How does the PR hook behave? Prototype the trigger (`gh pr create`), the prompt text that offers to run `/improve-codebase-architecture`, and the default window (14 days, setup suggests 7). Decide what happens when the user declines.

Already settled in [How the PR hook knows the last architecture review](04-architecture-review-marker.md): the PR-list check, the opt-in and window setting, and the accept path (current PR goes through, the review runs in a fresh worktree).

## Answer

Prototyped and grilled with the owner on 2026-09-27. Prototype: [05-architecture-review-reminder.sh](../assets/05-architecture-review-reminder.sh).

**Trigger**: `PostToolUse` on `Bash`, matching `gh pr create`. The offer comes after the PR exists. It blocks nothing. A `PreToolUse` offer would fire before `comment-review-gate.sh` can block, so the user would get the offer for a PR that never opened.

**Window**: `AGENT_READY_ARCHITECTURE_REVIEW_DAYS` only. Setup proposes 7. Unset, `0`, or a non-number means off. No 14-day default: an unset value means off, so a default never applies.

**Skips** (exit silently):
- the command contains `architecture-review` (the review PR itself);
- a review PR with the `architecture-review` label merged in the last N days;
- a review PR with that label is open and was created in the last N days. An older open one counts as abandoned;
- `gh` fails, or `jq` is missing;
- the hook already offered today in this clone.

**Offer text**: the hook adds context. The agent asks once:

> No architecture review in 7 days. Run /improve-codebase-architecture in a fresh worktree? Not touching the PR.

**Decline**: the agent carries on. The hook offers at most once per clone per day, whatever the answer. It stamps today's date in `.git/agent-ready-review-offered` when it offers. The stamp limits how often the hook asks. It doesn't record a review, so the per-clone marker rejected in [How the PR hook knows the last architecture review](04-architecture-review-marker.md) doesn't apply.

Rejected: asking on every PR (noisy on busy teams); once per session (short sessions nag often); snooze for N days after a no (the whole window passes with no reminder).
