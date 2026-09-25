# AGENTS.md

## Single source of truth

Every statement has one home. Do not write it a second time. Point at the home instead.

## Steering files

The steering files are `AGENTS.md`, `CLAUDE.md`, `docs/agents/`, `docs/CODING_CONVENTIONS.md`, `.github/CODEOWNERS`, `.agents/skills/`, `.agents/hooks/` and `.claude/settings.json`.

Never merge a diff that touches one. Stop, state plainly what the diff decides, write that exchange into the pull request, and leave the merge to a human. The merge click is the approval, and every real human is a pass.

This rule guards itself: a diff that edits it is a steering diff.

## Agent skills

### Issue tracker

<one line: where issues live>. See `docs/agents/issue-tracker.md`.

### Triage labels

<one line: the label vocabulary>. See `docs/agents/triage-labels.md`.

### Domain docs

<single-context or multi-context>. See `docs/agents/domain.md`.

### AFK runs

Before an AFK run, read `docs/agents/environment.md`. Hand back as `docs/agents/afk-handback.md` says.
