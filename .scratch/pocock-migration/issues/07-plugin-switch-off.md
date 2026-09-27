# What the repo keeps so the plugin can be switched off

Type: grilling
Status: resolved
Assignee: Efte

## Question

Once setup and migration are done, the user must be able to switch the `agent-ready` plugin off and keep a working repo. Decide what the plugin copies into the repo for that: skills (Pocock's and the plugin's own), hooks, settings. The PR hook is planned for `plugins/agent-ready/hooks/`, which stops working when the plugin is off. Decide where it lives instead, and how copies stay current (`fetch.sh` manifest or something else).

## Answer

Grilled with the owner on 2026-09-27.

**Switch-off = move to the no-plugin channel.** No new mechanism. `fetch.sh` already copies agent-ready's skills and hooks and Pocock's pinned skills into `.agents/`, with hashes in `.agents/agent-ready-manifest.json`. Setup step 9 wires `.agents/hooks/hooks.json` into `.claude/settings.json` and writes the switches as `env`. `update-codebase-for-agents` keeps the copies current.

**Who moves it**: a new step in `update-codebase-for-agents`, "move this repo off the plugin": run `fetch.sh`, wire hooks and switches into `.claude/settings.json`, then disable the plugin. The user runs it any time. Setup and the migration point to it. It is not a migration step: a repo set up with the plugin and never migrated needs it too.

**Hooks**: the PR hook and the skill-start hook stay in `plugins/agent-ready/hooks/`. `fetch.sh` copies that folder, so both work without the plugin.

**`migrate-*` copies** (see [What /domain-modeling produces during migration](02-domain-modeling-step.md)): copied from wherever the skill resolves, the plugin cache or `.agents/skills/`.

**Window setting**: the grilling reopened [How the PR hook knows the last architecture review](04-architecture-review-marker.md). The marker file is gone; opt-in and N now live in committed `.claude/settings.json` `env`. Detail lives in 04.

Rejected: the plugin channel always writing copies too (each hook fires twice); a switch-off step only at the end of migration.
