# Map: pocock-migration

Migrate a repo's agent setup to Pocock's methodology.

## Destination

A spec for a migration skill in the `agent-ready` plugin, ready for `/to-tickets`. The skill moves a repo from its current agent setup (Superpowers or any other) to Pocock's methodology in three steps: `/domain-modeling` → doc cleanup → `/improve-codebase-architecture` (optional). The spec also covers a PR hook that keeps the architecture review recurring, and ends with an overview of every migration stage and every setting the user can choose.

## Notes

**Tracker**: local markdown, this effort only. Map and tickets live in `.scratch/pocock-migration/` on branch `pocock-migration`, never merged to `main`. Operations follow the "Wayfinding operations" section of Pocock's local-markdown tracker doc. The rest of the repo stays on GitHub issues. Moved from GitHub map #58 on 2026-09-27.

**Domain**: agent steering and documentation. Parent effort: [Map: blueprint](https://github.com/felixt-teclead/agent-ready/issues/1).

**Skills every session should consult**: `/grilling` and `/domain-modeling` for decisions, `/research` for facts, `/prototype` for artifacts, `/unslop` for prose that ships. Read `/writing-for-agents` before any skill text is drafted.

**Settled while charting (2026-09-27)**
- **Entry points**: `/setup-codebase-for-agents` asks "migrate your current setup to Pocock's methodology?". Yes starts the migration skill. The user can also start it later by hand. Without it, a framework such as Superpowers can still run on top of a set-up repo.
- **Framework-agnostic**: no framework-specific logic. Pocock's methodology shapes a repo from any earlier setup.
- **The chain**: `/domain-modeling` → doc cleanup (with `/writing-for-agents`) → `/improve-codebase-architecture`. Always in this order; step 3 is offered, not forced. Each step is a block that runs alone (see [Which parts of the migration run on their own](issues/10-building-blocks.md)). A housekeeping preflight runs before it (see [What migrating the current setup covers](issues/01-migration-scope.md)).
- **Allowed Pocock skills**: `/domain-modeling`, `/writing-for-agents`, `/improve-codebase-architecture`, `/ask-matt`. The plugin's own skills stay usable.
- **`/ask-matt` is not a step.** The skill points the user to it when they are unsure what comes next, why a step comes next, or where they are in the migration.
- **Recurring architecture review**: a Claude Code hook on `gh pr create` checks whether `/improve-codebase-architecture` ran in the last N days. If not, it offers to run it. No CI job: map #1 decided "no doc CI", and CI cannot run an interactive skill. Setup proposes N = 7; unset means off. Where N lives: see [How the PR hook knows the last architecture review](issues/04-architecture-review-marker.md).
- **Steering paths**: the hook lands in `plugins/agent-ready/hooks/`, so a human merges it.
- **Parallel AFK agents**: one git worktree each.

## Decisions so far

- [What Superpowers leaves in a repo](issues/06-superpowers-footprint.md) — no repo steering: install touches at most `enabledPlugins` in `.claude/settings.json`, never `CLAUDE.md`/`AGENTS.md`; use leaves committed specs and plans in `docs/superpowers/` (project knowledge) plus `.superpowers/` and `.worktrees/` scratch
- [What migrating the current setup covers](issues/01-migration-scope.md) — soft push gate + retire plugins/skills/hooks/scratch in a preflight; specs fold into `CONTEXT.md`/ADRs/issues, then delete (archive if declined); detection by generic inventory, listing hits
- [What /domain-modeling produces during migration](issues/02-domain-modeling-step.md) — agent-invokable `migrate-*` skill copies on the migration branch; code is truth, old docs give language only; `CONTEXT.md` entries approved by topic; gitignored `CONTEXT.local.md` for personal wording; settings asked at start and end
- [How the PR hook knows the last architecture review](issues/04-architecture-review-marker.md) — `gh pr list` for a merged PR labelled `architecture-review` in the last N days; N and opt-in in committed `.claude/settings.json` `env`; a skill-start hook tells the agent to label (reopened by 07, marker file dropped)
- [What the repo keeps so the plugin can be switched off](issues/07-plugin-switch-off.md) — reuse the no-plugin channel (`fetch.sh` + settings wiring); a new `update-codebase-for-agents` step moves a repo off the plugin; hooks stay in `plugins/agent-ready/hooks/`
- [PR hook behaviour](issues/05-pr-hook-behaviour.md) — `PostToolUse` after `gh pr create`, blocks nothing; skips the review PR and any merged or fresh open review PR in N days; offers once per clone per day; no 14-day default
- [How /writing-for-agents shapes the doc-cleanup step](issues/03-doc-cleanup-step.md) — statements extracted, grouped by topic, routed with per-topic approval; lever verdicts plus scan green = done; comment pass moved to a normal `cleanup` phase after the steering PR (09); cap 10; migration answers status itself, `/ask-matt` only for next-task routing
- [How a user starts the migration later](issues/08-later-entry-point.md) — user-invoked skill named in setup's hand-over; scan names it as next step when an old setup remains; start checks setup ran, branch (resume), old setup, in shape (`CONTEXT.md` + scan green); no marker or label
- [How a running cleanup phase meets the migration](issues/09-cleanup-phase-ordering.md) — steering PR, then a normal `cleanup` phase (takes over a running one), then an optional architecture PR; wait for merge by default, ask in chat; pauses lifted only on a yes; open `cleanup` PRs soft-gated (reopened once)
- [Which parts of the migration run on their own](issues/10-building-blocks.md) — preflight, step 1, step 2a as own skills; comment pass = `cleanup` cycle; migration only orchestrates; step 3 offered at the end; scan decides when a gap is a phase
- [Where cleanup keeps its state and which files it skips](issues/11-cleanup-state-and-open-branches.md) — write-once path list plus one done file per PR; fast steps skip files in open PRs; agent-ready #46 keeps points 4–8
- [Who fixes pointers when a statement moves](issues/12-pointer-updates.md) — the moving PR rewrites pointers; the scan flags dead paths and anchors in its own class after "Setup regressed"

## Not yet specified

## Out of scope

- Running `/writing-for-agents` over the `agent-ready` plugin's own skills — plugin work in `blueprint`, not a migration step; the migration never edits fetched plugin skills (see [How /writing-for-agents shapes the doc-cleanup step](issues/03-doc-cleanup-step.md))
