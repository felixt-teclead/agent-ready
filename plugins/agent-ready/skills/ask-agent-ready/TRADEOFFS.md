# Tradeoffs

The choices a team makes on the way to Pocock's methodology, what each
unlocks for agents working unattended, and what it costs. Give the
[Stance](SKILL.md#stance) with them.

## Migrate, Stubborn or neither

Setup asks this, and it comes back while the scan shows `old` or
`overridden`.

- **Migrate** (recommended). `/adopt-pocock-methodology` retires the old
  setup, writes `CONTEXT.md` and ADRs from the code and the old specs, and
  gives every doc statement one home, in one steering pull request. Then the
  comment pass starts.
  - Unlocks: one flow, one set of words, one place per rule, so several
    agents can take tickets in parallel with nobody watching.
  - Needs a human: an answer at each approval, the steering pull request's
    merge, and each teammate uninstalling their own copy of a retired plugin.
  - Costs: the most up front ([Costs](#costs)).
- **Stubborn**. Keep Superpowers. agent-ready writes an override,
  `docs/agents/superpowers.md`, that sends Superpowers' design, test, debug
  and review steps to Pocock's skills, and blocks the replaced skills in
  `.claude/settings.json`.
  - Right when the team relies on Superpowers' plan-and-execute loop and
    wants Pocock's interview, tickets and review now, without a migration.
  - Costs: two methodologies in every session. The override is text the
    agent reads, and a Superpowers update can shift what it overrides, so
    someone reruns the smoke run after each update (setup's
    [Hand over](../setup-codebase-for-agents/SKILL.md#5-hand-over)). Specs
    and plans keep landing in `docs/superpowers/` until
    `model-codebase-domain` folds them.
  - Later: `/adopt-pocock-methodology` retires the override at any time.
- **Neither**. Leave the setup as it is.
  - Right when the hits are unused and the team decides later.
  - Costs: an old framework keeps steering agents with nothing to reconcile
    it with Pocock's skills, and an unattended agent has nobody to ask which
    wins. The scan's `old` line keeps naming it.

## Full migration or single blocks

- **Full**: `/adopt-pocock-methodology` runs each block the repo still needs
  and ends in one steering pull request: one review, one merge, all docs
  consistent at once. Best for parallel, unattended work.
- **Blocks**: `model-codebase-domain`, `route-codebase-docs` and
  `retire-agent-setup` each run alone, each with its own pull request, in
  the order of the [Stance](SKILL.md#stance). Right when the team wants to
  measure first, or reviews only small pull requests. Costs: a human merge
  per block; while the old framework runs, its unfinished plans stay in
  place, each with an issue to fold it later.

## Wait or stack

The migration asks this once its steering pull request is open.

- **Wait** (default): the comment pass starts after the steering pull
  request merges, so its file list and the scan see the new docs. Costs:
  someone comes back after the merge, says so in the session or types
  `/adopt-pocock-methodology` again.
- **Stack**: the phase's first pull request targets the steering branch and
  lands with it; its steps still start only after that merge. Saves the
  return trip. Costs: a change to the steering pull request in review can
  mean a rebase of the stacked one.

## Fast or continuous

A new phase asks this. Feature work goes on in both; neither is a freeze.

- **Fast**: one cleanup pull request after another, `cap:` files each
  (default 10), not tied to tasks, until the phase ends. An agent merges its
  own cleanup pull request under cleanup's
  [Merging a cleanup PR](../cleanup/SKILL.md#merging-a-cleanup-pr), so an
  unattended runner can loop the steps. Rules for
  `docs/CODING_STANDARDS.md` wait for a human-merged batch (cleanup's
  [Rule queue](../cleanup/SKILL.md#rule-queue)).
- **Continuous**: each task's pull request gets a stacked cleanup pull
  request over the files it touched. No extra stream of pull requests, and
  cleanup follows the work; files nobody touches wait. To finish, switch to
  fast (cleanup's [End](../cleanup/SKILL.md#7-end)).

## What runs unattended

| Piece | Unattended | Needs a human |
|---|---|---|
| Comment review on every pull request | yes, before each push, while `comment_review` is on | no |
| Cleanup steps, fast or continuous | yes, the agent merges its own pull request | steering diffs, kept findings, files held by open pull requests |
| Tickets | `/implement` on issues labelled `ready-for-agent` | `/to-tickets` or `/triage` makes them |
| An AFK run's environment | yes, once `docs/agents/environment.md` exists | setup's answer F writes it |
| Setup, update, migration, a new phase | no | every answer and approval, and the merge |
| Architecture review | no, it is an interview | typing `/improve-codebase-architecture` |

## Costs

Rough orders of magnitude from one trial on a 2,333-file repo, one run each.
Your repo differs; these are no estimates.

| Run | Tokens | Time |
|---|---|---|
| Setup | ≈ 99k | ≈ 9 min, with scripted answers |
| Scan | ≈ 103k | ≈ 6.5 min |

Not measured yet:

- **Migration**: approvals grow with the repo, one per retired item, per term
  topic, per doc topic, per lever and per folder. The trial repo had 175
  docs in scope.
- **Comment pass**: several subagents per file; files ÷ `cap:` pull
  requests, about 230 at the default 10 on the trial repo.
