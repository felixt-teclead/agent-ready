# AGENTS.md

## Single source of truth

Every statement has one home; everywhere else, point at it.

## Steering files

The steering files are `AGENTS.md`, `CLAUDE.md`, `docs/agents/`, `docs/CODING_STANDARDS.md`, `.github/CODEOWNERS`, `.agents/skills/`, `.claude/skills`, `.agents/hooks/` and `.claude/settings.json`.

A diff that touches one is a **steering diff**: stop, state plainly what it decides, write that exchange into the pull request, and leave the merge to a human. Any human's merge click is the approval.

## Verify

Verify with the `check` command in the stack's manifest or task runner.

## Agent skills

### Issue tracker

Issues live in <the tracker: GitHub issues, GitLab issues, `.scratch/`, ...>. See `docs/agents/issue-tracker.md`.

### Triage labels

<defaults: "The five canonical triage roles, each label string equal to its name." | renamed: "Label string per role: see `docs/agents/triage-labels.md`." | none: "No triage labels: skip every labeling step.">

### Domain docs

Domain terms: `CONTEXT.md` (multi-context: `CONTEXT-MAP.md`). Decisions: `docs/adr/`.

### Superpowers

Before any `superpowers:` skill, read `docs/agents/superpowers.md`. It overrides them.

### AFK runs

Working a ticket with nobody in the chat (an AFK run): read `docs/agents/environment.md` first, and hand back as `docs/agents/afk-handback.md` says.
