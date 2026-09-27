# AGENTS.md

## Single source of truth

Every statement has one home. Do not write it a second time. Point at the home instead.

## Steering files

The steering files are `AGENTS.md`, `CLAUDE.md`, `docs/agents/`, `docs/CODING_STANDARDS.md`, `.github/CODEOWNERS`, `.agents/skills/`, `.agents/hooks/` and `.claude/settings.json`.

Never merge a diff that touches one. Stop, state plainly what the diff decides, write that exchange into the pull request, and leave the merge to a human. The merge click is the approval, and every real human is a pass.

This rule guards itself: a diff that edits it is a steering diff.

## Verify

Verify with the manifest's `check` script.

## Agent skills

### Issue tracker

<one line: where issues live>. See `docs/agents/issue-tracker.md`.

### Triage labels

<defaults: "The five canonical triage roles, each label string equal to its name." | renamed: "Label string per role: see `docs/agents/triage-labels.md`." | none: "No triage labels: skip every labeling step.">

### Domain docs

Domain terms: `CONTEXT.md` (multi-context: `CONTEXT-MAP.md`). Decisions: `docs/adr/`.

### Superpowers

Before any `superpowers:` skill, read `docs/agents/superpowers.md`. It overrides them.

### AFK runs

Before an AFK run, read `docs/agents/environment.md`. Hand back as `docs/agents/afk-handback.md` says.
