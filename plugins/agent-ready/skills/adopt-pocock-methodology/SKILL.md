---
name: adopt-pocock-methodology
description: Move a set-up repo from its current agent setup to Pocock's methodology — retire the old setup, model the domain, route the docs — in one steering PR, then offer an architecture review. User-invoked.
disable-model-invocation: true
---

# Adopt Pocock's methodology

**Goal: one steering PR holds the retired old setup, `CONTEXT.md` and
`docs/adr/`, and the routed docs; the architecture review is offered.** This
skill only orchestrates. The blocks do the work, each by its own **as a
block** contract: `retire-agent-setup`, `model-codebase-domain`,
`route-codebase-docs`.

The **hand-over line** closes every stop, every block's hand-back, the PR
body and the last answer: "Unsure which Pocock skill fits your next task?
Run `/ask-matt`."

## 1. Start checks

In order; the first that matches decides.

1. **No setup**: `AGENTS.md` is missing on `origin/<default>` → stop, and
   point to `/setup-codebase-for-agents`.
2. **Running**: a branch `adopt-pocock-methodology` exists, local or on
   `origin` → offer to resume. Yes: check it out and go to the first open row
   of its worklist; no worklist on it means the steering PR is open, go to §5.
   Fresh start: delete the branch after the user confirms, then check again.
3. **Old setup**: §4 of
   [measure.md](../setup-codebase-for-agents/measure.md) finds a hit → all
   three blocks.
4. **Not in shape**: no hit, and `CONTEXT.md` is missing or the scan is not
   green → only the blocks whose signal is missing: `model-codebase-domain`
   without `CONTEXT.md`, `route-codebase-docs` without a green scan.
5. **In shape** → say "nothing to migrate", suggest
   `/improve-codebase-architecture`, or `/grill-with-docs` for a new feature,
   and stop.

**Green**: `scan-codebase-for-agents` names no §4 class. Take its report
only; decline its phase offer, §5 covers the phase.

**Cleanup phase**: before §2, read `.agents/refactor.local`, then
`.agents/refactor.md` on `origin/<default>`. Either says `paused:` → show the
reason and ask "Resume the phase and migrate?". No: stop. Yes: resume it
(`cleanup` §5); for `refactor.local` only that user answers. An unpaused phase
is taken over in §5.

## 2. Branch and worklist

From a clean tree, a new branch `adopt-pocock-methodology` off
`origin/<default>`. Ask both settings once, defaults shown:

- `specs:` `delete` or `archive`, default `delete`
- `architecture:` `delete` or `keep`, default `delete`

Write `.agents/migration.md`, one row per block the start check chose:

```
owner: adopt-pocock-methodology
specs: delete | archive
architecture: delete | keep

## adopt-pocock-methodology
- [ ] preflight
- [ ] model-codebase-domain
- [ ] route-codebase-docs
```

The blocks read the settings from it and add their own sections. Commit.

## 3. Blocks

Per open row, in order, call the block on this branch. When it hands back,
tick its row and commit.

- **preflight**: `retire-agent-setup`. Paste its summary under the row.
- **model-codebase-domain**: its §4 shows the settings again.
- **route-codebase-docs**: before the call, list open `cleanup` PRs
  (`gh pr list --state open --label cleanup`) and ask the user to merge or
  close them; go on only when none are left or on an explicit "continue
  anyway". Then show the settings again. Stress `architecture:`: step 1 has
  mined those docs, so the choice is informed now. Write a change into the
  worklist.

Done when every row is ticked.

## 4. Steering PR

The last commit removes `.agents/migration.md`. Then open the PR,
`Adopt Pocock's methodology`. Its body, from the worklist before removal:

- the preflight summary
- what the blocks' own PRs would list: issues filed and known deviations
  (`model-codebase-domain` §5), routes per topic and the scan's three numbers
  (`route-codebase-docs` §7)
- the settings as applied
- "Steering diff, a human merges."
- the hand-over line
- "To run without the plugin: `update-codebase-for-agents` §4."

## 5. Hand off to cleanup

The comment pass is a normal `cleanup` phase. This section only picks when
it starts.

1. **Wait or stack.** Only in an interactive chat, ask "Wait for the steering
   PR to merge, or stack on the steering branch?", default wait.
   - **Wait**: once the user says it merged, check out the default branch and
     pull.
   - **Stack**: stay on the steering branch; the phase PR targets it.
2. **Start or take over.**
   - No `.agents/refactor.md`: re-run the scan, then `cleanup` §1 with mode
     `fast`.
   - A phase is running: leave it as is. Its path list and done files stay,
     and `cleanup` continues it.

Done when the phase PR is open or the running phase is taken over.

## 6. Architecture review

Ask "Run `/improve-codebase-architecture` now in a fresh worktree?"

- **Yes**: `git worktree add` off `origin/<default>` on a new branch
  `architecture-review/<YYYY-MM-DD>`, switch into it, and ask the user to type
  `/improve-codebase-architecture` there.
- **No**: done.

Done when the steering PR is open and step 3 is answered.
