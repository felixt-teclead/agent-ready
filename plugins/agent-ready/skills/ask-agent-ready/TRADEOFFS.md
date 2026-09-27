# Tradeoffs

The choices a team makes on the way to Pocock's methodology, what each
unlocks for agents working unattended, and what it costs.

## Stance

Give it with every choice below. For a team that splits work across people
and agents and lets agents work unattended, a full migration makes the most
sense: one flow, one language, one home per rule
([why](WHY.md#the-goal)).

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

## Migrate, Stubborn or neither

Setup asks this, and it comes back while the scan shows `old` or
`overridden`.

- **Migrate** (recommended). `/adopt-pocock-methodology` retires the old
  setup, writes `CONTEXT.md` and ADRs from the code and the old specs, and
  gives every doc statement one home, in one steering pull request. Then the
  comment pass starts.
  - Unlocks: one flow, one language, one home per rule, so several agents
    can take tickets in parallel with nobody watching.
  - Needs a human: an answer at each approval and the steering pull
    request's merge. Teammates uninstall a retired plugin only for their
    other repos.
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
    [Hand over](../setup-codebase-for-agents/SKILL.md#5-hand-over)).
    Existing specs and plans in `docs/superpowers/` stay until
    `model-codebase-domain` folds them; new plans go to the gitignored
    `.superpowers/`.
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
  the order of the [Stance](#stance). Right when the team wants to
  measure first, or reviews only small pull requests. Costs: a human merge
  per block; while the old framework runs, its unfinished plans stay in
  place, each with an issue to fold it later.

## Wait or stack

The migration asks this once its steering pull request is open; what each
does: adopt's
[Hand off to cleanup](../adopt-pocock-methodology/SKILL.md#5-hand-off-to-cleanup).

- **Wait** (default): the file list and the scan see the new docs. Costs:
  someone comes back after the merge, says so in the session or types
  `/adopt-pocock-methodology` again.
- **Stack**: saves the return trip. Costs: a change to the steering pull
  request in review can mean a rebase of the stacked one.

## Fast or continuous

A new phase asks this; what each does: cleanup's
[Start a phase](../cleanup/SKILL.md#2-start-a-phase). Feature work goes on
in both; neither is a freeze.

- **Fast**: an unattended runner can loop the steps, since an agent merges
  its own cleanup pull request
  ([Merging a cleanup PR](../cleanup/SKILL.md#merging-a-cleanup-pr)); rules
  for `docs/CODING_STANDARDS.md` wait for a human-merged batch
  ([Rule queue](../cleanup/comment-pass.md#rule-queue)).
- **Continuous**: no extra stream of pull requests, and cleanup follows the
  work; files nobody touches wait. To finish, switch to fast
  ([End](../cleanup/SKILL.md#7-end)).

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

- **Migration**: approvals grow with the repo: one for all retired items
  together, one per term topic, per doc topic, per lever finding and per
  folded folder. The trial repo had 175
  docs in scope.
- **Comment pass**: several subagents per file; files ÷ `cap:` pull
  requests, about 230 at the default `cap:` on the trial repo.
