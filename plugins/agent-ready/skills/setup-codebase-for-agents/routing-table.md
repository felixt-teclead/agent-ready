# Routing table

Which file owns which statement.

Every line in a steering file passes two tests:

- **Single source of truth.** No other file says it. Point at the home
  instead.
- **No-op.** Delete the line. If an agent acts the same, the line goes.

Kinds: `fixed` is the same in every repo. `interviewed` is asked by setup.
`switch` is a yes/no answer at install. `lazy` is created only when needed.

| Statement | Home | Kind |
|---|---|---|
| Steering index: single source of truth, the steering rule, the skills block | `AGENTS.md`; `CLAUDE.md` is a symlink to it | fixed |
| Commands, including the `check` script | the stack's manifest (`package.json`, `pyproject.toml`, ...); never restated in prose | interviewed |
| How to verify a change | the `## Verify` line in `AGENTS.md` | fixed |
| Overview, how to run | `README.md`, only if the code needs setup before it runs. Agents find the stack themselves. | interviewed |
| Why code is this way, locally | a comment, checked by `comment-review` | switch `comment_review` |
| Formatting, layout | config files and the tree; never restated | fixed |
| Procedures with a predictable trigger | `.agents/skills/`; `.claude/skills` is a symlink to it | fixed |
| A skill that production code loads at runtime | a tooling folder in the source tree, not `.agents/` or `.claude/` | lazy |
| Steps for one topic | `docs/<topic>.md` plus a pointer line in `AGENTS.md` | lazy |
| Review rules, universal and scoped | `docs/CODING_STANDARDS.md` | fixed; content interviewed |
| Mechanical rules | lint, typecheck, tests | interviewed |
| Architecture | no architecture doc is written. If one exists, one pointer line in `AGENTS.md`. Architecture rules are scoped sections in `docs/CODING_STANDARDS.md`. | lazy |
| Domain definitions | `CONTEXT.md`, written by `/domain-modeling`; multi-context: `CONTEXT-MAP.md`, which also says which `CONTEXT.md` to read | lazy |
| Decisions and rejected alternatives | `docs/adr/` | lazy |
| Specs | issues, closed once shipped; never kept in the repo | fixed |
| Tracker | `docs/agents/issue-tracker.md` | interviewed |
| Triage labels | the `### Triage labels` line in `AGENTS.md`; renamed labels also `docs/agents/triage-labels.md` | interviewed |
| Which skill runs each step while Superpowers is installed | `docs/agents/superpowers.md`, its pointer line in `AGENTS.md`, `.superpowers/` in `.gitignore`, `Skill(superpowers:…)` entries in `permissions.deny` of `.claude/settings.json` | interviewed |
| What an AFK run needs: env vars, services, egress, token scopes | `docs/agents/environment.md` | interviewed |
| What an AFK run hands back | `docs/agents/afk-handback.md` | fixed |
| When to read the AFK files | the `### AFK runs` line in `AGENTS.md` | fixed |
| Steering approval | `.github/CODEOWNERS`, `.github/steering-ruleset.json`, `.github/bootstrap-steering-ruleset.sh` | switch `steering_gate` |
| Hooks and switch values, no-plugin channel only | `.agents/hooks/`; `.claude/settings.json` `hooks` and `env` | fixed |
| The plugins the copies replace are off, no-plugin channel only | `.claude/settings.json` `enabledPlugins` | fixed |
| How often the team runs an architecture review | `.claude/settings.json` `env` `AGENT_READY_ARCHITECTURE_REVIEW_DAYS`: days as a string, `"0"` for never | interviewed |
| Auto-memory | off: `"autoMemoryEnabled": false` in `.claude/settings.json` | fixed |

## Old files

Earlier setups wrote these.

| Old file | Row | Action |
|---|---|---|
| `docs/CODING_CONVENTIONS.md` | Review rules | `git mv` it to `docs/CODING_STANDARDS.md`, or move its lines there when that file exists. Rename it in the steering list and in `.github/CODEOWNERS`. |
| `docs/agents/domain.md` | Domain definitions | Delete it. Write the `### Domain docs` line from [templates/AGENTS.md](templates/AGENTS.md). |
| A `### Domain docs` line other than the template's, such as `<single-context or multi-context>. See docs/agents/domain.md.` | Domain definitions | Replace it with the line from [templates/AGENTS.md](templates/AGENTS.md). |
| `docs/agents/triage-labels.md` with each string equal to its role | Triage labels | Delete it. Write the defaults line from [templates/AGENTS.md](templates/AGENTS.md). |
| CLI commands in `docs/agents/issue-tracker.md` outside `## Wayfinding operations` | Tracker | Cut them, as the tracker template in [templates/docs/agents/](templates/docs/agents/) does. |

## `docs/CODING_STANDARDS.md`

- What goes in it: [its header](templates/docs/CODING_STANDARDS.md).
- A scoped rule is a prose section, not `.claude/rules/`: a glob can miss a
  file, prose cannot.
- Only review reads it, so it may grow. `AGENTS.md` carries no pointer to it:
  Pocock's `code-review` finds it by this name.

## Switches

| Switch | Default |
|---|---|
| `comment_review` | on |
| `steering_gate` | none: the owner decides |
| `cleanup_comments` | on |
| `cleanup_comments_max_files` | 10 |

- **Plugin:** each user answers them at install. Skills read
  `${user_config.<key>}`, hooks read `CLAUDE_PLUGIN_OPTION_<KEY>`.
- **No plugin:** `CLAUDE_PLUGIN_OPTION_<KEY>` in the `env` block of
  `.claude/settings.json` is the team value. `.claude/settings.local.json`
  overrides it for one person.
- An unset switch takes its default; an unset `steering_gate` is on. Only
  `false` switches a safeguard off.
