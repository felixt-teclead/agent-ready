# Measure a repo against the routing table

Read [routing-table.md](routing-table.md) first. Edit nothing.

## 1. Channel and switches

- **Channel.** This skill's folder sits inside the repo (`.agents/skills/` or
  `.claude/skills/`) → no plugin. Anywhere else → plugin.
- **Switches.** Plugin: the values the calling skill lists. No plugin:
  `CLAUDE_PLUGIN_OPTION_<KEY>` in the `env` of `.claude/settings.local.json`,
  else of `.claude/settings.json`. Not there → unset.

## 2. Inventory

List every file an agent loads or is pointed at. Skip gitignored paths.

- **Always loaded:** `AGENTS.md`, `CLAUDE.md`, `.claude/rules/*.md` without
  a `paths:` list.
- **Loaded on a trigger:** nested `AGENTS.md` or `CLAUDE.md` (when a file in
  its folder is read), `.claude/rules/*.md` with a `paths:` list,
  `.agents/skills/`, `.claude/skills/`, `docs/agents/`, the review-rules doc.
- **Pointed at:** every doc an always-loaded file cites. A cited folder
  pulls in its `README.md` or index file only.
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
and nothing shows Superpowers in use: no `.superpowers/`, and no enabled
`superpowers@` plugin ([Old setup](#4-old-setup) says when a plugin is
enabled). A `docs/superpowers/` folder holds past work, not use.

The verify row is **n/a** while the stack's manifest or task runner has no
`check` command: the `## Verify` line points at it. The Commands row carries
the gap: it is **missing** until `check` exists.

The Procedures row is **n/a** in the plugin channel while no skill lives in
the repo; setup writes its home with the first one.

The AFK hand-back row and the `### AFK runs` row are **n/a** while
`docs/agents/environment.md` is absent. The AFK environment row carries the
gap: it is **missing** until `docs/agents/environment.md` exists.

A skill that production code loads at runtime (a source file reads the
skill folder) is not an agent procedure: its row is **misplaced** while it
sits in `.agents/` or `.claude/`. A repo's own consent rule ("change this
file only with approval") belongs to the steering-approval row.

A Specs row made `misplaced` by a specs and plans hit of
[Old setup](#4-old-setup): its change is `model-codebase-domain`, as the
scan's `old` line names; `cleanup` never moves it.

Statuses skip `docs/archive/`, which holds history, and a path
`.agents/deviations.md` keeps whole: its quoted text is the path itself.

Each old file in the routing table that exists makes the row it names
`misplaced`; it is one of that row's examples. It adds no row of its own.

Done when every row has a status and every old file found has its row.

## 4. Old setup

List what another agent setup left in the repo. A **hit** is an agent
artifact that duplicates a Pocock or agent-ready step, or routes the agent
through another framework. A repo-specific item is never a hit. Judge each
artifact by what it does, never by which framework it names. These are not
the routing table's old files, which earlier agent-ready setups wrote.

**Setup's own** are no hit: the `agent-ready` and `mattpocock-skills` plugin
keys and the marketplace entry they use, agent-ready's skill folders, the
files `.agents/agent-ready-manifest.json` lists, the hooks that run
agent-ready's scripts, and the template files. An item
`.agents/deviations.md` lists is no hit either: the user kept it.

Hits by kind:

- **Plugin:** an enabled plugin whose skills, agents or hooks are hits
  (design, plan, test first, review, debug, finish a branch). **Enabled**:
  its `enabledPlugins` key is `true` in the first of
  `.claude/settings.local.json`, `.claude/settings.json` and
  `~/.claude/settings.json` that names it. A tool plugin (language server,
  MCP server, formatter) is no hit.
- **Skill:** a folder in `.agents/skills/` or `.claude/skills/`, or a file in
  `.claude/commands/` or `.claude/agents/`. A procedure only this repo has
  is the Procedures row, and a skill production code loads has its own row.
- **Hook:** a `hooks` entry in either repo settings file, and the script it
  runs. A hook that runs a repo tool (lint, format, test) or guards this
  repo's own rules is no hit.
- **Specs and plans:** a tracked folder named for specs, plans or designs,
  outside `docs/adr/` and `docs/archive/`; a folder inside Scratch is no
  hit. Meeting notes, changelogs, incident
  reports and research are no hit, dated or not.
- **Framework section:** a section of `AGENTS.md` or `CLAUDE.md` that routes
  the agent through another hit ("use skill X first", "plans go to
  `docs/plans/`").

**Overridden:** Superpowers, while `docs/agents/superpowers.md` exists. Its
override is every home of the Superpowers row in the
[routing table](routing-table.md); the `### Superpowers` part of `AGENTS.md`
is no framework section. List it apart, with each enabled `superpowers@`
plugin. They are no hit. Its specs and plans folders stay hits.

**Retired:** a framework none of whose plugins, skills or hooks Old setup
lists or `.agents/deviations.md` keeps with class `old setup`. An overridden
framework counts as retired for its committed specs and plans.

**Scratch** is listed too, but is not a hit on its own: a top-level dot folder
that holds agent run state or worktrees, tracked or gitignored, plus the
`.gitignore` lines that name it. For each: tracked or not, and whether any
file in it is modified or unpushed.

Per item: its path; for a plugin, the settings file; for a hook, its event
and matcher. **Summary**, for setup's framework question and the scan's
`old` line: per kind, the count and up to three paths. A folder whose
subfolders are hits counts once.

Done when each kind is searched in full: the three settings files and their
hooks, every skill folder and every `.claude/commands/` or `.claude/agents/`
file, every tracked folder name at any depth, every section of `AGENTS.md`
and `CLAUDE.md`, and every top-level dot folder.
