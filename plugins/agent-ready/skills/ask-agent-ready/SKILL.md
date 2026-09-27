---
name: ask-agent-ready
description: Orient in a repo's agent setup — read where it stands, say what happened, the one next step and why, and weigh the choices. Use for a newcomer's first question, when a user states a goal for agents here, asks what's next or where the repo stands, or is unsure at a setup or migration question, and when you meet state you cannot place — a phase file, a migration worklist, a kept or overridden framework.
---

# Ask agent-ready

**Goal: the asker knows where the repo stands, what happened, the one next
step and why, and each alternative as a command to type.** You answer people
new to Pocock's methodology, and agents that met state they cannot place.
Read and explain; edit nothing. On a yes to a step an agent may run, run it.

Speak plainly: say what a thing does before you name it, and gloss a term in
one clause the first time it comes up:

- **Pocock's methodology**: Matt Pocock's skills, one flow from idea to
  merged code ([WHY.md](WHY.md#why-pococks-methodology) walks it).
- **`CONTEXT.md`**: the glossary of the team's domain words. **ADR**: a short
  record of a hard-to-reverse decision, in `docs/adr/`.
- **Steering files**: the files that tell agents how to work, listed in
  `AGENTS.md`; a human merges every change to them.
- **AFK**: an agent working with nobody at the keyboard.
- **Phase**: a run of cleanup pull requests toward one goal.
- **Stubborn**: keeping Superpowers, with agent-ready's override.

## 1. Read the state

Live, every time; write none of it down. `git fetch` first. `<default>` is
`git symbolic-ref --short refs/remotes/origin/HEAD` without `origin/`. The
team's state is on `origin/<default>` (`git show origin/<default>:<path>`);
`.agents/refactor.local` is one person's, in the checkout.

- **Setup**: `AGENTS.md` on `origin/<default>`. The channel, plugin or
  copies: measure's
  [Channel and switches](../setup-codebase-for-agents/measure.md#1-channel-and-switches).
  No-plugin copies older than agent-ready's `main`: setup's
  [Measure](../setup-codebase-for-agents/SKILL.md#1-measure) says how to
  tell.
- **Framework**: `docs/agents/superpowers.md` exists → the team chose
  Stubborn. Hits on the scan's `old` line → an old setup is still in place.
- **Kept findings**: `.agents/deviations.md`, one line per finding the team
  kept, with its class
  ([Accepted deviations](../scan-codebase-for-agents/SKILL.md#accepted-deviations)).
- **Migration**: the branches `adopt-pocock-methodology`,
  `retire-agent-setup`, `model-codebase-domain` and `route-codebase-docs`,
  local and on `origin`; each one's pull request
  (`gh pr list --head <branch> --state all`); its worklist
  (`git show <branch>:.agents/migration.md`), its `owner:` and open rows.
  What each combination means: the worklist's
  [Start or resume](../adopt-pocock-methodology/worklist.md#start-or-resume).
- **Phase**: `.agents/refactor.md` and `.agents/refactor.local`; their keys:
  cleanup's [Files](../cleanup/SKILL.md#files). The session-start hook
  printed the files left; for a fresh count, run it from the repo root:
  `sh <this skill's folder>/../../hooks/refactor-phase.sh`. Open cleanup
  pull requests: `gh pr list --state open --label cleanup`.
- **Domain**: `CONTEXT.md` or `CONTEXT-MAP.md`, and `docs/adr/`.
- **Architecture review**: the window, `AGENT_READY_ARCHITECTURE_REVIEW_DAYS`
  in the `env` of `.claude/settings.json` (absent: never asked; `"0"`: off).
  The last review:
  `gh pr list --state merged --label architecture-review --limit 1 --json number,title,mergedAt`.
  Due when it merged longer ago than the window, or never.
- **AFK readiness**: `docs/agents/environment.md` and the `### AFK runs` line
  in `AGENTS.md`; the manifest's `check` script; open issues labelled
  `needs-triage` and `ready-for-agent`, by the strings `AGENTS.md`'s Triage
  labels names.
- **Recent work**:
  `gh pr list --state all --limit 20 --json number,title,state,headRefName,labels`.
- **The scan**: a report from this session, else run
  `scan-codebase-for-agents` when the answer turns on its three numbers, its
  next step, or its `old`, `overridden` and `comments` lines. It edits
  nothing, and as its caller you decide, so it makes no phase offer. On a
  large repo it takes minutes: say so before you start it.

Done when every item has a value, or is named unknown (`gh` missing or
failing, no network).

## 2. Place the repo

First match wins. The table names the stage; the stage's skill decides the
details.

| Stage | Signal | Next |
|---|---|---|
| Not set up | no `AGENTS.md` on `origin/<default>` | `/setup-codebase-for-agents`; its pull request open → a human merges it first |
| Copies behind | the no-plugin copies are older than agent-ready's `main` | `/update-codebase-for-agents` |
| Migration mid-run | a run's branch holds a worklist | `/<owner>`, from its `owner:` line, typed in a fresh session; it resumes at the first open row |
| Steering PR open | a run's branch has an open pull request and no worklist | a human reviews and merges it; then `/adopt-pocock-methodology` again, which starts the comment pass |
| Phase paused | `paused:` in either phase file | say the reason; resuming: cleanup's [Pause and resume](../cleanup/SKILL.md#6-pause-and-resume) |
| Phase running | `.agents/refactor.md` | fast: `cleanup` takes the next step ([Fast](../cleanup/SKILL.md#4-fast-one-child-issue-per-step)); continuous: work tasks as usual, each gets its cleanup PR |
| Setup gap | the scan's Missing fixed rows | `/setup-codebase-for-agents` again; it writes missing rows only |
| Not migrated | the scan shows `old` or is not green, or `CONTEXT.md` is missing and `.agents/deviations.md` has no `domain` line | a choice: [Stance](#stance), then [TRADEOFFS.md](TRADEOFFS.md); default `/adopt-pocock-methodology` |
| Comment pass never ran | the scan's `comments` line | `cleanup`: on a green scan it offers the comment pass |
| In shape | none of the above | feature work at `/grill-with-docs`; `needs-triage` issues → `/triage`; review due → `/improve-codebase-architecture` |

In shape with `overridden` in the scan is Stubborn, a steady state:
`/adopt-pocock-methodology` retires the override whenever the team drops
Superpowers.

Done when one stage matched, with its evidence.

## 3. Answer

In chat, in this shape:

```
Where  <the stage, with its evidence: file, branch, pull request, the scan's three numbers>
Done   <what happened last: merged pull requests, ticked rows>
Next   <one command> — <why, in one sentence>
Else   <command> — <when it is the better pick>
```

- One `Next`. One `Else` line per path the asker could pick instead: a
  choice from [TRADEOFFS.md](TRADEOFFS.md), or another way to their goal.
  None when there is none.
- Every step is a command. The user types the user-invoked skills:
  `/setup-codebase-for-agents`, `/update-codebase-for-agents`,
  `/adopt-pocock-methodology`, and Pocock's `/grill-with-docs`, `/to-spec`,
  `/to-tickets`, `/implement`, `/triage`, `/improve-codebase-architecture`,
  `/ask-matt` and `/teach`. You may run the others on a yes. With the
  plugin, agent-ready's are `/agent-ready:<name>`, Pocock's
  `/mattpocock-skills:<name>`.
- A stated goal ([Goals](#goals)): the stage first, then the path toward the
  goal. A choice: read [TRADEOFFS.md](TRADEOFFS.md) first.
- "What do I answer here?", inside another skill's question: explain the
  question in plain words and give its recommended answer. Accepting it is
  safe: every change lands in one pull request a human merges, and git keeps
  the old text. The exception is `retire-agent-setup`'s scratch, deleted
  outside git after its unpushed-work check.
- An agent with no user in the chat gets what the state asks of its task,
  then goes back to it:
  - a worklist in the checkout: a migration branch; resume it only when the
    migration is the task;
  - `.agents/refactor.md`: follow the session-start hook's line;
  - `docs/agents/superpowers.md`: the team kept Superpowers; follow that
    file;
  - `.agents/deviations.md`: the team kept those findings; leave them.

  Starting a migration or a phase needs a human's answers: name it in the
  hand-back.

Done when the asker has one `Next` with its reason, and each alternative as
a command.

## Goals

- **"Agents should take tickets unattended."** The full migration, then the
  comment pass. An AFK run also needs `docs/agents/environment.md`: re-run
  `/setup-codebase-for-agents`, which asks only for missing rows. Tickets
  reach agents labelled `ready-for-agent`: `/to-tickets` writes them,
  `/triage` moves raw issues there.
- **"Just fix our docs."** No framework change. `scan-codebase-for-agents`
  names one next change, `cleanup` lands it, repeat until green. Docs that
  repeat or sprawl across many files: `route-codebase-docs` alone. No
  `CONTEXT.md`: `model-codebase-domain` first.
- **"We use Superpowers, what now?"** Migrate, Stubborn or neither:
  [TRADEOFFS.md](TRADEOFFS.md#migrate-stubborn-or-neither). Recommend
  migrate.
- **"Are our own skills an old setup?"** No. A hit replaces a Pocock or
  agent-ready step, or routes the agent through another framework; a
  repo-specific skill, hook or tool plugin never is
  ([Old setup](../setup-codebase-for-agents/measure.md#4-old-setup)).
- **"Are we done? The scan still says `old`."** Done is In shape in adopt's
  [Start checks](../adopt-pocock-methodology/SKILL.md#1-start-checks). Each
  hit left is migrated or kept; a kept one gets a line in
  `.agents/deviations.md`, and the scan and every later run skip it.
- **"Why does every session print a refactor phase?"** A phase runs until
  cleanup's [End](../cleanup/SKILL.md#7-end); the count is its files left.
  Pausing it for the team or for yourself:
  [Pause and resume](../cleanup/SKILL.md#6-pause-and-resume).
- **"When do we drop the plugin?"** The last line of setup's
  [Hand over](../setup-codebase-for-agents/SKILL.md#5-hand-over); the move is
  update's
  [Move this repo off the plugin](../update-codebase-for-agents/SKILL.md#4-move-this-repo-off-the-plugin).
- **"Which skill fits my next task?"** `/ask-matt`.
- **"Teach me Pocock's ideas."** `/teach <topic>`, such as
  `/teach CONTEXT.md and ADRs`, in an empty folder outside the repo: it
  writes its lessons into the current directory. Why agent-ready chose what
  it did: [WHY.md](WHY.md).

## Stance

For a team that splits work across people and agents and lets agents work
unattended, a full migration makes the most sense: one methodology, so
everyone follows the same flow; one `CONTEXT.md`, so everyone uses the same
words; clean docs, so each rule sits in one place and nothing contradicts
it. Say so when a choice comes up.

A partial start is fine. Run one block at a time, each its own pull request,
and measure: the scan's three numbers before and after, and how agents do on
a few similar tickets before and after (how often a person corrects them).
Suggested order:

1. `model-codebase-domain`: the shared words and decisions every Pocock
   skill reads. It works with the old framework still running.
2. `route-codebase-docs`: every statement in one home, until the scan is
   green.
3. The comment pass: a `cleanup` phase.
4. `retire-agent-setup`, once the team stops using the old framework; first,
   when nobody uses it now.

## How comments and docs get better

- **New code**: `comment-review` checks the comments each branch adds before
  it is pushed.
- **Old code**: a phase gives every file one full comment pass, per task in
  continuous mode, in batches of `cap:` files in fast mode (cleanup's
  [Comment pass](../cleanup/SKILL.md#5-comment-pass)). Rules the pass finds
  land in `docs/CODING_STANDARDS.md` in batches (cleanup's
  [Rule queue](../cleanup/SKILL.md#rule-queue)).
- **Docs**: the scan names one next change and `cleanup` lands it, until the
  scan is green (the scan's
  [One next step](../scan-codebase-for-agents/SKILL.md#4-one-next-step)). A
  pull request that moves a statement fixes its pointers (cleanup's
  [Moving a statement](../cleanup/SKILL.md#moving-a-statement)); the scan's
  Dead pointers class catches the misses.
- **Design**: after a pull request opens, a hook offers
  `/improve-codebase-architecture` when no review merged within the window.
- **Words**: `CONTEXT.md` grows as `/grill-with-docs` meets new terms.

Progress shows in the scan's three numbers and in the phase's files left.
