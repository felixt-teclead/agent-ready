# Why agent-ready works this way

The reasons behind agent-ready's main choices, for people who never heard of
Matt Pocock. What to do next: [SKILL.md](SKILL.md). The choices a team makes
itself: [TRADEOFFS.md](TRADEOFFS.md).

## The goal

A team where people and coding agents take tickets side by side, and agents
work unattended as much as possible. That needs **one flow, one language,
one home per rule**: every agent follows the same flow, uses the same words,
and finds each rule in one place.

## Why Pocock's methodology

Matt Pocock publishes a set of agent skills, one flow from idea to merged
code. An interview sharpens the idea and records the team's words in
`CONTEXT.md` and its hard-to-reverse decisions in ADRs. The idea becomes a
spec, then tickets small enough for one agent session each. An agent builds
each ticket test-first and reviews its own diff. agent-ready pins one
version of those skills and adds what a company repo needs around them:
setup, the scan, cleanup, comment review and the migration.

One methodology, because two frameworks give an agent two answers to "what
next?", and an unattended agent has nobody to settle them.

## Why migrate is recommended, and Stubborn exists

A migration leaves one flow. Stubborn exists for teams that rely on
Superpowers' plan-and-execute loop: an override sends the steps both
frameworks have to Pocock's skills, so the team gets Pocock's interview,
tickets and review without dropping Superpowers today. The override is text
the agent reads, and every Superpowers update can shift it, so it comes
second.

## Why a hit is judged by what it does

The migration names no framework and judges each artifact by what it does
([Old setup](../setup-codebase-for-agents/measure.md#4-old-setup)), so a
repo's own skills stay, and the migration works for any framework.

## Why the old setup goes first, then a fresh session

Old plugins and skills would steer the session that writes `CONTEXT.md`, so
the migration retires them first. A running session keeps what it loaded at
its start, so after retiring, the migration stops and resumes in a fresh
one.

## Why the code wins over old specs

A spec describes an intent at one moment; the code shows what was built. So
behaviour comes from the code, and old specs give only words and decisions.
Once folded into `CONTEXT.md`, ADRs and issues, the migration suggests
removing the folder: a stale spec pulls every agent that searches the repo
toward old decisions.

## Why a person approves every entry

`CONTEXT.md` is the team's vocabulary: agents propose, people decide. A
naming conflict is the team's call; a behaviour conflict is the code's.
Entries come grouped by topic, so people review a group at once and decide
each entry: approve, edit or strike.

## Why one steering pull request, merged by a human

Steering files decide how every agent works, so a person merges each change
to them: the merge click is the approval. One pull request keeps the whole
move reviewable at once, and nothing reaches the default branch half done.

## Why kept findings are written down

A team may keep something the scan flags. `.agents/deviations.md` records
each one with its reason, so the scan and later runs stop raising it and
done means done. A human merges each line.

## Why no migration marker

The repo's own state says where a migration stands: a branch with a
worklist is a run in progress, an open pull request waits for review, a
repo in shape is done. A marker would be one more thing to go stale.

## Why the comment pass is its own phase

Passing over every comment of a large repo takes hundreds of pull requests,
too many for the steering pull request. It runs as a normal cleanup phase
after that merge, so its file list and the scan see the new docs, and the
migration reuses cleanup instead of copying it.

## Why small cleanup pull requests, merged by agents

A cap of a few files (`cap:`) keeps each pull request small enough to
review. Hundreds
of them cannot each wait for a person, so an agent merges its own when it
touches no steering file
([Merging a cleanup PR](../cleanup/SKILL.md#merging-a-cleanup-pr)). The
review rules a pass finds are steering, so they wait in the phase's issue
for a human-merged batch
([Rule queue](../cleanup/comment-pass.md#rule-queue)).

## Why the phase keeps its state in files

A path list written once, plus one done file per pull request
([Files](../cleanup/phase-files.md)): no two pull requests edit the same
file, so they never conflict, and it works on any tracker.

## Why the architecture review is a reminder

`/improve-codebase-architecture` is an interview, so no CI job can run it.
After a pull request opens, a hook offers it when no pull request labelled
`architecture-review` merged within the team's window. Ran means merged, so
an abandoned review does not count. It asks at most once a day per clone,
and only a person in the chat.

## Why a repo can move off the plugin

A plugin is installed per person. Copies in `.agents/` come with every
clone, with the team's settings in `.claude/settings.json`: right for
unattended runners and for teammates without the plugin. Both at once would
load every hook twice, so the move switches the plugins off for the repo.

## Why this skill exists

Newcomers meet setup's framework question, the migration's approvals and
cleanup's modes with nobody to ask. `/ask-matt` answers which Pocock skill
fits a task, not where this repo stands. This skill reads the repo and
answers that.

## How comments and docs get better

- **New code**: `comment-review` checks the comments each branch adds before
  it is pushed.
- **Old code**: a phase gives every file one full comment pass, per task in
  continuous mode, in batches of `cap:` files in fast mode
  ([Comment pass](../cleanup/comment-pass.md)). Rules the pass finds
  land in `docs/CODING_STANDARDS.md` in batches
  ([Rule queue](../cleanup/comment-pass.md#rule-queue)).
- **Docs**: the scan names one next change and `cleanup` lands it, until the
  scan is green (the scan's
  [One next step](../scan-codebase-for-agents/SKILL.md#4-one-next-step)). A
  pull request that moves a statement fixes its pointers
  ([Moving a statement](../setup-codebase-for-agents/pointers.md#moving-a-statement)); the scan's
  Dead pointers class catches the misses.
- **Design**: after a pull request opens, a hook offers
  `/improve-codebase-architecture` when no review merged within the window.
- **Words**: `CONTEXT.md` grows as `/grill-with-docs` meets new terms.

Progress shows in the scan's three numbers and in the phase's files left.
