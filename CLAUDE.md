# CLAUDE.md

## Single source of truth

Every statement has one home. Do not write it a second time. Point at the home instead.

## Steering files

The steering files are `CLAUDE.md`, `AGENTS.md`, `.github/CODEOWNERS`, `docs/agents/`, `docs/ARCHITECTURE.md` and `docs/architecture/`.

Never merge a diff that touches one. Stop, state plainly what the diff decides, write that exchange into the pull request, and leave the merge to a human. The merge click is the approval, and every real human is a pass.

This rule guards itself: a diff that edits it is a steering diff.

## Code review

At code review, read `docs/agents/coding-standards.md`.

## Comments

Every export carries an interface comment. Write one plain statement per slot its types do not answer.

Default to no implementation comment. One earns its place only when it says what the code cannot, loses that when deleted, and changes what the next reader does.

Write the code first. Comments are a second pass over finished code (`/comment-write`). When you change code, update or delete its comments in the same diff.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `felixt-teclead/blueprint`, driven with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the root plus `docs/adr/`. See `docs/agents/domain.md`.
