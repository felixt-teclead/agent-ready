# AGENTS.md

## Single source of truth

Every statement has one home. Do not write it a second time. Point at the home instead.

## Steering files

The steering files are `AGENTS.md`, `CLAUDE.md`, `docs/agents/`, `docs/CODING_CONVENTIONS.md`, `.github/CODEOWNERS` and `.agents/skills/`.

Two plugin paths are guarded too, because one line in either switches a safeguard off in every installed repo: `plugins/agent-ready/.claude-plugin/plugin.json` and `plugins/agent-ready/hooks/`.

Never merge a diff that touches one. Stop, state plainly what the diff decides, write that exchange into the pull request, and leave the merge to a human. The merge click is the approval, and every real human is a pass.

This rule guards itself: a diff that edits it is a steering diff.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `felixt-teclead/agent-ready`, driven with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the root plus `docs/adr/`.
