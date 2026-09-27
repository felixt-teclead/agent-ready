---
name: adopt-pocock-methodology
description: Move a set-up repo to Pocock's methodology — retire the old setup, model the domain, route the docs — in one steering PR, then start the comment pass and offer an architecture review. User-invoked.
disable-model-invocation: true
---

# Adopt Pocock's methodology

**Goal: one steering PR holds the retired old setup, a complete
`CONTEXT.md` and `docs/adr/`, and the routed docs; after it, the comment
pass is started and the architecture review offered.** This skill only
orchestrates. The blocks do the work, each by its own **as a block**
contract: `retire-agent-setup`, `model-codebase-domain`,
`route-codebase-docs`. The run's state is the [worklist](worklist.md).

Open every run with: "Unsure? Run `/ask-agent-ready`."

The **hand-over line** closes every stop, every block's hand-back, the PR
body and the last answer: "Unsure which Pocock skill fits your next task?
Run `/ask-matt`."

An architecture-review offer from the PR reminder during the run waits for
[Architecture review](#6-architecture-review).

## 1. Start checks

In order; the first that matches decides.

1. **No setup**: `AGENTS.md` is missing on `origin/<default>` → stop, and
   point to `/setup-codebase-for-agents`.
2. **Running**: the worklist's
   [Start or resume](worklist.md#start-or-resume), for the branch
   `adopt-pocock-methodology`, including its check for other runs'
   branches. A resume goes on at the first open row of this skill's
   section; a run past its steering PR goes on at
   [Hand off to cleanup](#5-hand-off-to-cleanup); "start" means the next
   check.
3. **Paused phase**: `.agents/refactor.local`, then `.agents/refactor.md` on
   `origin/<default>`, says `paused:` → show the reason and ask "Resume the
   phase and migrate?". No: stop. Yes: resume it as `cleanup`'s
   [Pause and resume](../cleanup/SKILL.md#6-pause-and-resume) says; for
   `refactor.local` only that user answers. A team pause's commit is the
   first on the branch [Branch and worklist](#2-branch-and-worklist) opens;
   with no block to run, it goes into its own `cleanup` PR.
4. **Missing fixed rows**: run `scan-codebase-for-agents`. Its Missing fixed
   rows class has a finding → stop: "Re-run `/setup-codebase-for-agents`,
   merge its pull request, then run `/adopt-pocock-methodology` again."
5. **Blocks**: each block whose signal shows, from the scan and its
   [Old setup](../setup-codebase-for-agents/measure.md#4-old-setup):
   - **preflight** (`retire-agent-setup`): a plugin, skill or hook hit, or an
     overridden framework `.agents/deviations.md` does not list;
   - **`model-codebase-domain`**: no `CONTEXT.md` or `CONTEXT-MAP.md`, or a
     specs and plans hit;
   - **`route-codebase-docs`**: the scan is not green, or a framework
     section hit.

   Any → [Branch and worklist](#2-branch-and-worklist).
6. **In shape**: no block → say "nothing to migrate". The scan's report has
   the `comments` line → ask "Start the comment pass (a `cleanup` phase)?";
   yes → step 2 of [Hand off to cleanup](#5-hand-off-to-cleanup). A phase is
   running → name it. Then [Architecture review](#6-architecture-review).

## 2. Branch and worklist

The worklist's Start ([Start or resume](worklist.md#start-or-resume)), with
the branch `adopt-pocock-methodology`. Ask once, defaults shown, only the
settings of the blocks that run:

- `specs:` `delete` or `archive`, default `delete`, when a specs and plans
  hit exists
- `architecture:` `delete` or `keep`, default `delete`, when
  `route-codebase-docs` runs and an architecture doc exists

Your section, one row per block the start checks chose, in their order:

```
## adopt-pocock-methodology
scan before: <the scan's three numbers>
- [ ] preflight
- [ ] model-codebase-domain
- [ ] route-codebase-docs
```

**Review window.** No `AGENT_READY_ARCHITECTURE_REVIEW_DAYS` in the `env` of
`.claude/settings.json` → ask it as question J of setup's
[Interview](../setup-codebase-for-agents/SKILL.md#2-interview) does, and
write it as setup's `.claude/settings.json` step does. Above 0 on a GitHub
remote: run [labels.sh](../setup-codebase-for-agents/labels.sh) with
`--review-only`.

Commit.

## 3. Blocks

Per open row, in order, call the block on this branch. When it hands back,
tick its row and commit.

- **preflight**: `retire-agent-setup`. Paste its summary under the row. It
  removed or switched off anything → stop: "The retired setup still steers
  this session. Start a fresh Claude Code session in this checkout and type
  `/adopt-pocock-methodology`; it resumes at the next row."
- **model-codebase-domain**.
- **route-codebase-docs**: before the call, list open `cleanup` PRs
  (`gh pr list --state open --label cleanup`) and ask the user to merge or
  close them; go on only when none are left or on an explicit "continue
  anyway".

Done when every row is ticked.

## 4. Steering PR

The worklist's [End](worklist.md#end), then the PR, `Adopt Pocock's
methodology`. Its body, from the worklist:

- the preflight summary, with its teammate lines
- the issues `model-codebase-domain` filed
- per topic, the count per route and the files touched
- the lines added to `.agents/deviations.md`
- the scan's three numbers before, and after `route-codebase-docs` when it
  ran
- the settings as applied
- "Steering diff, a human merges." when the diff touches the steering list
  in `AGENTS.md` or `.agents/deviations.md`
- "After the merge, run `/adopt-pocock-methodology` again; it starts the
  comment pass unless one runs."
- the hand-over line
- plugin channel: "To run without the plugin: `update-codebase-for-agents`,
  Move this repo off the plugin."

## 5. Hand off to cleanup

The comment pass is a normal `cleanup` phase. This section picks when it
starts.

1. **Wait or stack**, while the steering PR is open. Ask "Wait for the
   steering PR to merge, or stack the phase on the steering branch?",
   default wait.
   - **Wait**: once the user says it merged, check out the default branch
     and pull. A user who leaves now has the PR body's line.
   - **Stack**: stay on the steering branch; the phase PR targets it and
     lands with it. The phase's steps start once the steering PR merges.
2. **Start or take over.** `cleanup`'s
   [Start a phase](../cleanup/SKILL.md#2-start-a-phase), with input
   `comment pass` and mode `fast`. A running phase stays as it is: Start a
   phase names it, and `cleanup` continues it with its path list and done
   files.

Done when the phase PR is open or the running phase is named.

## 6. Architecture review

Ask once: "Run `/improve-codebase-architecture` now in a fresh worktree?"
This also answers a reminder offer held during the run. No offer came, and
the stamp `$(git rev-parse --git-common-dir)/agent-ready-review-offered`
holds today's date → the user was asked today: skip the question.

- **Yes**: `git worktree add` off `origin/<default>`, switch into it, and ask
  the user to type `/improve-codebase-architecture` there. With a review
  window set, its hook names the branch and label.
- **No**: go on.

No review window and no steering PR in this run: say that question J of
setup sets one; re-running `/setup-codebase-for-agents` asks it.

Then suggest `/grill-with-docs` for the next feature, and close with the
hand-over line.

Done when the steering PR is open or the repo is in shape, the comment pass
is started, running or declined, and the review question is answered or
skipped.
