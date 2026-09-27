# What Superpowers leaves in a repo

Research for [#64](https://github.com/felixt-teclead/agent-ready/issues/64) (child of #58, feeds #59).
Source: [obra/superpowers](https://github.com/obra/superpowers) at tag `v6.4.2`, commit `8ca22dba` (2026-09-25).
Paths below are relative to that tree unless marked as Claude Code behaviour.

## TL;DR

- **Install writes nothing into the repo** at the default (user) scope. The plugin, its skills and
  its hook live under `~/.claude/plugins/`. Project scope adds one `enabledPlugins` entry to
  `.claude/settings.json`.
- **Superpowers never edits `CLAUDE.md` or `AGENTS.md`.** Steering reaches the agent through a
  SessionStart hook that injects `using-superpowers/SKILL.md` into context. Remove the plugin and
  the steering is gone.
- **Normal use leaves project knowledge:** dated, committed specs in `docs/superpowers/specs/`
  and plans in `docs/superpowers/plans/`. Before v5.0.0 both went to `docs/plans/`.
- **Normal use also leaves scratch:** `.superpowers/sdd/` (self-ignored, deleted when a plan
  finishes), `.superpowers/brainstorm/` (not ignored), `.worktrees/` (added to `.gitignore` in a
  commit).

## Install time

| Artifact | Where | Scope | Kind | Source |
|---|---|---|---|---|
| Plugin copy: 14 skills, `hooks/`, manifests | `~/.claude/plugins/cache/…`, `~/.claude/plugins/marketplaces/…`, `installed_plugins.json`, `known_marketplaces.json` | home | steering | Claude Code behaviour; `.claude-plugin/plugin.json` |
| `enabledPlugins: {"superpowers@claude-plugins-official": true}` (or `@superpowers-marketplace`) | `~/.claude/settings.json` (user, default) / `.claude/settings.json` (project) / `.claude/settings.local.json` (local, gitignored) | home **or repo** | steering | Claude Code behaviour; README "Claude Code" |
| `extraKnownMarketplaces` entry for `obra/superpowers-marketplace` | same file as above; lands in the repo only for a project-scope install from the non-official marketplace | home or repo | steering | Claude Code behaviour |
| SessionStart hook (`startup\|clear\|compact`) → `hooks/session-start` injects `using-superpowers` as `additionalContext` | inside plugin dir; registered through the plugin, **not** in any `settings.json` | home | steering | `hooks/hooks.json`, `hooks/session-start` |

No `CLAUDE.md`, `AGENTS.md`, `.claude/skills/`, `.claude/commands/` or repo hook files are written.
The old `/brainstorm`, `/write-plan`, `/execute-plan` commands were plugin-internal and were removed in v5.1.0 (`RELEASE-NOTES.md`).

## During normal use (in the repo)

| Artifact | Written by | Git status | Lifetime | Kind | Source |
|---|---|---|---|---|---|
| `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` | `brainstorming` (architectural path) | **committed** | permanent | project knowledge: design, decisions, constraints | `skills/brainstorming/SKILL.md` L135, L241 |
| `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` | `writing-plans` | committed in practice (the skill does not say to commit) | permanent; executed task by task | project knowledge: plan | `skills/writing-plans/SKILL.md` L16 |
| `docs/plans/YYYY-MM-DD-<topic>-design.md` and plan files | same skills, v3.2.0 to v4.x | committed | permanent (legacy) | project knowledge | `RELEASE-NOTES.md` v3.2.0, v5.0.0 ("move existing files … if desired") |
| `.superpowers/sdd/<plan-slug>/` (`plan-path`, `progress.md` ledger, `task-<N>-brief.md`, reports, `review-*.diff`) + `.superpowers/sdd/.gitignore` = `*` | `subagent-driven-development`, `executing-plans` via `scripts/sdd-workspace`, `task-brief`, `review-package` | ignored by itself | deleted (`rm -rf`) when the plan's final review is clean; orphaned if a run aborts | scratch | `skills/subagent-driven-development/scripts/sdd-workspace`, `SKILL.md` L138, L483 |
| `.superpowers/brainstorm/<session>/{content,state}`, `.last-port`, `.last-token` | `brainstorming` visual companion with `--project-dir` (the skill tells the agent to pass the project root) | **not ignored**; the skill only tells the agent to *remind the user* to add `.superpowers/` to `.gitignore` | persists; `stop-server.sh` deletes only `/tmp` sessions | scratch (HTML mockups) | `skills/brainstorming/visual-companion.md` L58, `scripts/start-server.sh` L117-121 |
| `.worktrees/<branch>/` (or an existing `worktrees/`) | `using-git-worktrees` fallback when the harness has no native worktree tool | ignored | removed by `finishing-a-development-branch` | scratch | `skills/using-git-worktrees/SKILL.md` L65-86 |
| `.gitignore` line for `.worktrees/`, committed | `using-git-worktrees` if the dir is not ignored yet | committed | permanent | config | same, L86 |
| Tests, code, commits | TDD, SDD, etc. | committed | permanent | product code | n/a |

Since v6.0.0 the old home worktree dir `~/.config/superpowers/worktrees/` is gone (`RELEASE-NOTES.md` v6.0.0).

## Home dir only (never in the repo)

| Artifact | Written by | Source |
|---|---|---|
| `~/.superpowers/diagnosing-superpowers/<session-id>/` (case notes, `report.md`) | `diagnosing-superpowers` | `skills/diagnosing-superpowers/SKILL.md` L33 |
| Personal skills in `~/.claude/skills/` | `writing-skills` | `skills/writing-skills/SKILL.md` L12 |
| `/tmp/…` brainstorm sessions | visual companion without `--project-dir` | `visual-companion.md` L58 |
| Legacy (v2.x/v3.x): `~/.config/superpowers/skills/` clone of `obra/superpowers-skills` | old plugin | `RELEASE-NOTES.md` v2.0.x section |

Other harnesses (Codex, Cursor, Gemini, OpenCode, Hermes, …) also keep the plugin in their own home dirs. None of them writes instruction files into the repo.

## What the migration can detect

A repo "has Superpowers" when any of these hold:

1. `.claude/settings.json` has `enabledPlugins` with a `superpowers@` key (project-scope install only).
2. `docs/superpowers/` exists (specs/plans), or `docs/plans/*-design.md` exists (legacy).
3. `.superpowers/` exists.
4. `.worktrees/` exists or `.gitignore` names it (weak: other tools use this dir too).

A user-scope install leaves no trace in a fresh clone until someone runs `brainstorming` or `writing-plans`.

## Steering vs project knowledge

- **Steering:** the plugin (skills + SessionStart hook) and `enabledPlugins`/`extraKnownMarketplaces`. None of it is repo text. For a project-scope install, migrating means removing one key. For a user-scope install there is nothing in the repo to remove.
- **Project knowledge:** `docs/superpowers/specs/*` hold the design, constraints and rejected approaches. These are ADR and `CONTEXT.md` material. `docs/superpowers/plans/*` are executed task lists: history once done, backlog (issue material) if unfinished.
- **Scratch:** `.superpowers/`, `.worktrees/`. Delete, or leave ignored.

## Precedence note

`using-superpowers/SKILL.md` L65 ranks user instructions (`CLAUDE.md`, `AGENTS.md`) above skills.
The spec and plan location defaults yield to user preference (`brainstorming/SKILL.md` L242, `writing-plans/SKILL.md` L17).
So a Pocock-style `CLAUDE.md` can steer a still-installed Superpowers (e.g. "plans go to GitHub issues") without uninstalling it.
