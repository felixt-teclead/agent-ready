---
name: adopt-pocock-methodology
description: Move a set-up repo to Pocock's methodology — retire the old setup, model the domain, route the docs — in one steering PR, then start the comment pass and offer an architecture review.
disable-model-invocation: true
---

# Adopt Pocock's methodology

**Goal: one steering PR holds the retired old setup, a complete
`CONTEXT.md` and `docs/adr/`, and the routed docs; after it, the comment
pass is started and the architecture review offered.** This skill only
orchestrates: the blocks `retire-agent-setup`, `model-codebase-domain` and
`route-codebase-docs` work on this branch and hand back, as the
[worklist](worklist.md)'s owner rule says. The worklist is the run's state.

Open every run and close every stop with: "Unsure? Run `/what-to-do`."
The **hand-over line** closes the PR body and the last answer: "Unsure which
Pocock skill fits your next task? Run `/ask-matt`." In the plugin channel,
say each command with its plugin prefix, as what-to-do's
[Answer](../what-to-do/SKILL.md#3-answer) says.

`cleanup_comments`: `${user_config.cleanup_comments}`, filled in when the
skill loads. Still in `${…}` form: measure's
[Channel and switches](../setup-codebase-for-agents/measure.md#1-channel-and-switches);
unset → the routing table's
[Switches](../setup-codebase-for-agents/routing-table.md#switches) default.

## 1. Start checks

In order; the first that matches decides. `git fetch` first.

1. **No setup**: `AGENTS.md` is missing on `origin/<default>` → stop: "Run
   `/setup-codebase-for-agents`, or merge its open pull request, first."
2. **Running**: the worklist's [Start or resume](worklist.md#start-or-resume)
   for the branch `adopt-pocock-methodology`, through its Other runs check;
   where it reaches Start, go on at the next check. A run past its steering
   PR goes on at [Hand off to cleanup](#5-hand-off-to-cleanup).
3. **Paused phase**: from here on the checks read `<default>`: from a clean
   tree, check it out and `git pull --ff-only`. `.agents/refactor.local`,
   then `.agents/refactor.md` on `origin/<default>`, says `paused:` → show the reason and ask "Resume the
   phase and migrate?". No: stop. Yes: `refactor.local` → delete its
   `paused:` line now (gitignored). `refactor.md` →
   [Branch and worklist](#2-branch-and-worklist) deletes the line in its
   first commit; with no block to run, a `cleanup` PR does
   ([Pause and resume](../cleanup/SKILL.md#6-pause-and-resume)).
4. **Missing fixed rows**: run `scan-codebase-for-agents` once; its report
   feeds this check, the next and `scan before:`. Its Missing fixed
   rows class has a finding other than the review window row, which this
   skill writes itself → stop: "Re-run `/setup-codebase-for-agents`,
   merge its pull request, then run `/adopt-pocock-methodology` again."
5. **Blocks**: each block whose signal shows, from the scan and its
   [Old setup](../setup-codebase-for-agents/measure.md#4-old-setup):
   - **preflight** (`retire-agent-setup`): a plugin, skill or hook hit,
     scratch, or an overridden framework, each one `.agents/deviations.md`
     does not list;
   - **`model-codebase-domain`**: no `CONTEXT.md` or `CONTEXT-MAP.md` and no
     `domain` line in `.agents/deviations.md`, or a specs and plans hit;
   - **`route-codebase-docs`**: the scan is not green apart from the review
     window row and a Specs row a specs and plans hit makes `misplaced`
     (`model-codebase-domain` fixes that one), or a framework section hit;
   - **review window**: no `AGENT_READY_ARCHITECTURE_REVIEW_DAYS` in the
     `env` of `.claude/settings.json`. It is no block:
     [Branch and worklist](#2-branch-and-worklist) writes it.

   Any → [Branch and worklist](#2-branch-and-worklist).
6. **In shape**: no block → say "nothing to migrate". The scan's report has
   the `comments` line → ask "Start the comment pass (a `cleanup` phase)?";
   yes → Start a phase in [Hand off to cleanup](#5-hand-off-to-cleanup). A
   phase is running → name it. Then
   [Architecture review](#6-architecture-review).

## 2. Branch and worklist

The worklist's [Start](worklist.md#start-or-resume), with the branch
`adopt-pocock-methodology`. Of the worklist's settings, ask `specs:` when a
specs and plans hit exists, and `architecture:` when `route-codebase-docs`
runs and an architecture doc exists. Start's one commit also holds:

- a team pause the start checks lifted: its `paused:` line deleted;
- the review window, below;
- with no preflight row: a `.agents/deviations.md` line, class
  `repo-specific`, for each repo-specific item Old setup lists that the file
  lacks. Show them first; one the user strikes is a hit after all, and adds
  the preflight row.

Your section, one row per block the start checks chose, in their order:

```
## adopt-pocock-methodology
scan before: <the scan's three numbers>
- [ ] preflight
- [ ] model-codebase-domain
- [ ] route-codebase-docs
```

**Review window.** No `AGENT_READY_ARCHITECTURE_REVIEW_DAYS` in the `env` of
`.claude/settings.json` → ask and write it as setup's
[Review window](../setup-codebase-for-agents/settings.md#review-window)
and [Writing the file](../setup-codebase-for-agents/settings.md#writing-the-file)
say. Above 0 on a
GitHub remote: run [labels.sh](../setup-codebase-for-agents/labels.sh) with
`--review-only`.

## 3. Blocks

Per open row, in order, call the block on this branch. When it hands back,
tick its row, commit with what its bullet puts under the row, and push; then
its bullet's stop, if any. A block's denied
[confirmed step](../setup-codebase-for-agents/confirmed-steps.md) leaves its
row open: name the gap and stop.

- **preflight**: `retire-agent-setup`. Its summary goes under the row. It
  switched off a plugin or removed an override, skill or hook → after the
  commit, stop: "The retired setup still steers this session. Start a fresh
  Claude Code session in this checkout and type `/adopt-pocock-methodology`;
  it resumes at the next row."
- **model-codebase-domain**.
- **route-codebase-docs**: before the call, list open `cleanup` PRs
  (`gh pr list --state open --label cleanup`) and ask the user to merge or
  close them; go on only when none are left or on an explicit "continue
  anyway".

Done when every row is ticked.

## 4. Steering PR

No diff against `origin/<default>` but the worklist (every block changed
nothing) → delete the branch and go on at In shape in
[Start checks](#1-start-checks).

Otherwise the worklist's [End](worklist.md#end), with the PR title `Adopt
Pocock's methodology`. Its body, from the worklist:

- the preflight summary, with its teammate lines
- what the End of `model-codebase-domain` and of `route-codebase-docs`
  would list, for each that ran
- the scan's three numbers before, and after `route-codebase-docs` when it
  ran
- the settings as applied, and the review window when this run set it
- "After the merge, run `/adopt-pocock-methodology` again; it offers the
  comment pass unless one runs."
- the hand-over line
- plugin channel: "To run without the plugin: `update-codebase-for-agents`,
  Move this repo off the plugin."

The PR reminder's offer after `gh pr create` waits for
[Architecture review](#6-architecture-review).

## 5. Hand off to cleanup

The comment pass is a normal `cleanup` phase. This section picks when it
starts, and whether to ask first: no comment pass ran yet (no
`.agents/refactor.md`, and `git log -1 --format=%h -- .agents/refactor-done`
prints nothing) and `cleanup_comments` is on → start it; otherwise ask
"Start the comment pass (a `cleanup` phase)?", and a no ends this section.

1. **Wait or stack**, while the steering PR is open. Ask "Wait for the
   steering PR to merge, or stack the phase on the steering branch?",
   default wait.
   - **Wait**: go on at [Architecture review](#6-architecture-review) now;
     once the user says it merged, check out the default branch, pull, and
     run Start a phase below. A user who leaves now has the PR body's
     line.
   - **Stack**: stay on the steering branch; the phase PR targets it and
     lands with it. The phase's steps start once the steering PR merges.
2. **Start a phase.** `cleanup`'s
   [Start a phase](../cleanup/SKILL.md#2-start-a-phase), with input
   `comment pass` and mode `fast`. A running phase stays as it is: Start a
   phase names it, and `cleanup` continues it with its path list and done
   files.

Done when the phase PR is open, the running phase is named, the pass is
declined, or the phase waits for the steering PR's merge.

## 6. Architecture review

Ask once: "Run `/improve-codebase-architecture` now in a fresh worktree?"
This also answers a reminder offer held during the run. No offer came, and
the stamp `$(git rev-parse --git-common-dir)/agent-ready-review-offered`
holds today's date → the user was asked today: skip the question. After an
answer, write `date +%Y-%m-%d` to the stamp.

- **Yes**: `git worktree add` off `origin/<default>`, switch into it, and ask
  the user to type `/improve-codebase-architecture` there. With a review
  window set, its hook names the branch and label.
- **No**: go on.

Then suggest `/grill-with-docs` for the next feature, and close with the
hand-over line.

Done when the steering PR is open or the repo is in shape, the comment pass
is started, running, declined or waiting for the merge, and the review
question is answered or skipped.
