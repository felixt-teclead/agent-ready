# Measure a repo against the routing table

Read [routing-table.md](routing-table.md) first. Edit nothing.
Other skills run §4 alone.

## 1. Channel and switches

- **Channel.** This skill's folder sits inside the repo (`.agents/skills/` or
  `.claude/skills/`) → no plugin. Anywhere else → plugin.
- **Switches.** Plugin: the values the calling skill lists. No plugin: the
  `env` block of `.claude/settings.json`, then `.claude/settings.local.json`.
  Not there → unset.

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
and §4 lists no Superpowers trace: `docs/superpowers/`, `.superpowers/`, or a
`superpowers@` key in `enabledPlugins`.

Each old file in the routing table that exists gets the status its row
names.

Done when every row and every old file found has a status.

## 4. Old setup

List every agent artifact setup did not write. Setup wrote the `agent-ready`
and `mattpocock-skills` plugin entries, the files in
`.agents/agent-ready-manifest.json`, the hooks that run
`.agents/hooks/` scripts, and the template files. Judge each artifact by what
it does, never by which framework it names.

A **hit** is any of these:

- **Plugin:** an `enabledPlugins` or `extraKnownMarketplaces` entry in
  `.claude/settings.json` or `.claude/settings.local.json` that is neither
  setup's.
- **Skill:** a folder in `.agents/skills/` or `.claude/skills/` the manifest
  does not list, and any file in `.claude/commands/` or `.claude/agents/`.
- **Hook:** a `hooks` entry in either settings file whose command runs
  anything other than a `.agents/hooks/` script, and the script it runs.
- **Specs and plans:** a folder of dated documents (`YYYY-MM-DD-*.md`) or a
  folder named for specs, plans or designs, outside `docs/adr/`.
- **Framework section:** a section of `AGENTS.md` or `CLAUDE.md` that routes
  the agent through another hit ("use skill X first", "plans go to
  `docs/plans/`").

**Scratch** is listed too, but is not a hit on its own: a top-level dot folder
that holds agent run state or worktrees, tracked or gitignored, plus the
`.gitignore` lines that name it. For each: tracked or not, and whether any
file in it is modified or unpushed.

Per item: its path, and for a hook its event and matcher. Done when every
settings file, skill folder and top-level folder is checked.
