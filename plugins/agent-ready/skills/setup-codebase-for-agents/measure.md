# Measure a repo against the routing table

Shared by `setup-codebase-for-agents` and `scan-codebase-for-agents`. Read
[routing-table.md](routing-table.md) first. You read; you do not edit.

## 1. Channel and switches

- **Channel.** This skill's folder sits inside the repo (`.agents/skills/` or
  `.claude/skills/`) → no plugin. Anywhere else → plugin.
- **Switches.** Plugin: the values the calling skill lists; only a skill's
  own `SKILL.md` gets `${user_config.<key>}` filled in. No plugin: the `env` block of
  `.claude/settings.json`, then `.claude/settings.local.json`. Not there →
  unset.

## 2. Inventory

List every file an agent loads or is pointed at. Skip gitignored paths.

- **Always loaded:** `AGENTS.md`, `CLAUDE.md`, nested `AGENTS.md` or
  `CLAUDE.md`, `.claude/rules/*.md` without a `paths:` list.
- **Loaded on a trigger:** `.claude/rules/*.md` with a `paths:` list,
  `.agents/skills/`, `.claude/skills/`, `docs/agents/`, the review-rules doc.
- **Pointed at:** every doc an always-loaded file cites.
- **Repo facts:** `git remote -v`; the manifest and its scripts; `README.md`;
  any architecture doc; `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/`;
  `.claude/settings.json`; `.gitignore`.

For each file: its line count, and whether an always-loaded file cites it.

## 3. One status per row

- **home**: the statements of this kind live in their home.
- **misplaced**: some live elsewhere. Give up to three examples,
  `file:line`.
- **missing**: the row has no home, and no statement of its kind exists
  anywhere. If one exists elsewhere, the row is **misplaced**.
- **n/a**: a row behind a switch that is `false`, a `lazy` row the repo does
  not need, or a no-plugin row in the plugin channel.
- **not measured**: the comments row. Reading every comment is costly; a
  cleanup phase does it.

The Superpowers row is **n/a** when `docs/agents/superpowers.md` is absent
and the repo shows no Superpowers trace: no `docs/superpowers/`, no
`.superpowers/`, no `superpowers@` key in the `enabledPlugins` of
`.claude/settings.json`.

Each old file in the routing table that exists gets the status its row
names.

Done when every row and every old file found has a status.
