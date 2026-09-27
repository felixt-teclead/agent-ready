---
name: setup-basics
description: Tier Basic — set a repo up for agents and model its domain, then stop. Guided with the owner, or done by the agent alone.
disable-model-invocation: true
model: opus
effort: max
---

# Set up the basics

**Goal: the repo has its steering files (`AGENTS.md`, `CLAUDE.md` pointing
at it, `docs/CODING_STANDARDS.md`) and its domain (`CONTEXT.md`,
`docs/adr/`), each in a pull request a human merges. Then stop.** No
migration, no cleanup phase, no comment pass. This skill only orchestrates:
it runs two skills in order and reads their state live, so a new session
resumes where the last one stopped.

1. **Setup**: [setup-codebase-for-agents](../setup-codebase-for-agents/SKILL.md).
2. **Domain**: [model-codebase-domain](../model-codebase-domain/SKILL.md),
   with `owner: model-codebase-domain`.

Read and follow each skill's `SKILL.md`; do not wait for the user to type
it. In the plugin channel, say each command with its plugin prefix, as
what-to-do's [Answer](../what-to-do/SKILL.md#3-answer) says.

## 1. Mode

Ask once per session, before anything else:

- **Guided** (recommended): you walk the owner through each step. The owner
  answers every question of both skills and approves every `CONTEXT.md`
  entry. At each stop, the owner types `/handoff` (Pocock's; with the
  plugin `/mattpocock-skills:handoff`) with the next step as its argument,
  and continues in a fresh session with that document and `/setup-basics`.
- **Agent**: the agent does both skills alone. It takes each question's
  recommended answer; a question without one puts its row on the gap list.
  In the domain step it approves its own proposals and decides naming
  conflicts by the code's names. It asks only
  [confirmed steps](../setup-codebase-for-agents/confirmed-steps.md). The
  human review of each pull request is the approval: its body lists every
  answer and every entry the agent decided, so the reviewer can strike one.

Both modes run on Opus at maximum effort; this skill's frontmatter sets it.

Done when the owner picked a mode.

## 2. Place

`git fetch` first. `<default>` is
`git symbolic-ref --short refs/remotes/origin/HEAD` without `origin/`. First
match wins:

1. **No setup**: no `AGENTS.md` on `origin/<default>`, and no open pull
   request from the branch `setup-codebase-for-agents` → [Setup](#3-setup).
2. **Setup open**: that pull request is open → stop at
   [Stop](#5-stop): "Merge the setup pull request, then type
   `/setup-basics` again."
3. **No domain**: no `CONTEXT.md` or `CONTEXT-MAP.md` on `origin/<default>`,
   and no `domain` line in `.agents/deviations.md` → [Domain](#4-domain).
4. **Done**: say the basics are in place, and go to [Stop](#5-stop).

## 3. Setup

Run setup's steps 1 to 5. Its framework question, answer I, stays; Migrate
and Stubborn name steps after the basics, and setup's hand-over names them.
Setup's pull request touches steering files, so a human merges it: go to
[Stop](#5-stop) with "Merge the setup pull request, then type
`/setup-basics` again."

Done when setup's pull request is open.

## 4. Domain

Run `model-codebase-domain` from its first step. Its End opens its pull
request. Then go to [Stop](#5-stop).

Done when its pull request is open.

## 5. Stop

Say where the repo stands and the one next step, with its command.

- Guided: tell the owner to type `/handoff <next step>` now, then open a
  fresh session.
- Agent: list the pull requests to review, and the gap list.

After the domain pull request: the basics are done. Say "Next: type
`/what-to-do`; it names the next tier."

Done when the owner has the next step and its command.
