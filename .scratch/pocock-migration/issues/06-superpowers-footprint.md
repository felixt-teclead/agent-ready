# What Superpowers leaves in a repo

Type: research
Status: resolved

## Question

What does Superpowers leave in a repo when installed and used? List files, folders, hooks, plugin entries, and `CLAUDE.md` edits. The migration skill stays framework-agnostic; this is one real test case to check the scope ticket's answer against.

## Answer

Full findings: [docs/research/superpowers-footprint.md](../../../docs/research/superpowers-footprint.md) (checked against obra/superpowers v6.4.2, 8ca22dba; merged in PR #65).

- Install writes nothing to the repo at user scope (the default). Project scope adds only an `enabledPlugins` key to `.claude/settings.json`.
- Superpowers never edits `CLAUDE.md`/`AGENTS.md`. Its steering is a plugin SessionStart hook that injects `using-superpowers`, and it lives in `~/.claude/plugins/`.
- Normal use leaves committed project knowledge: `docs/superpowers/specs/*-design.md` and `docs/superpowers/plans/*.md` (`docs/plans/` before v5.0.0).
- Scratch: `.superpowers/sdd/` (self-ignored, deleted when the plan ends), `.superpowers/brainstorm/` (not ignored), `.worktrees/` plus a committed `.gitignore` line.
- Home only: `~/.superpowers/diagnosing-superpowers/`, personal skills in `~/.claude/skills/`.
- For 01: in the Superpowers case, migration is mostly about turning specs and plans into ADRs, `CONTEXT.md` and issues. There are no steering files to remove. With a user-scope install, a fresh clone shows no trace until someone has used the framework. Superpowers ranks `CLAUDE.md` above its skills, so it can coexist with a Pocock setup.
