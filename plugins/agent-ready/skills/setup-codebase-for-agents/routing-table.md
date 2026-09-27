# Routing table

Which file owns which statement. `setup-codebase-for-agents` writes the rows,
`scan-codebase-for-agents` measures them, `cleanup` moves statements into
them.

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
| Overview, how to run | `README.md`, only if the code needs setup before it runs. Agents find the stack themselves. | interviewed |
| Why code is this way, locally | a comment, checked by `comment-review` | switch `comment_review` |
| Formatting, layout | config files and the tree; never restated | fixed |
| Procedures with a predictable trigger | `.agents/skills/`; `.claude/skills` is a symlink to it | fixed |
| A skill that production code loads at runtime | a tooling folder in the source tree, not `.agents/` or `.claude/` | lazy |
| Steps for one topic | `docs/<topic>.md` plus a pointer line in `AGENTS.md` | lazy |
| Review rules, universal and scoped | `docs/CODING_STANDARDS.md` | fixed; content interviewed |
| Mechanical rules | lint, typecheck, tests | interviewed |
| Architecture | no architecture doc is written. If one exists, one pointer line in `AGENTS.md`. Architecture rules are scoped sections in `docs/CODING_STANDARDS.md`. | lazy |
| Domain definitions | `CONTEXT.md`, written by `/domain-modeling` | lazy |
| Decisions and rejected alternatives | `docs/adr/` | lazy |
| Specs | issues, closed once shipped; never kept in the repo | fixed |
| Tracker, triage labels, domain-doc read rules | `docs/agents/issue-tracker.md`, `triage-labels.md`, `domain.md` | interviewed |
| What an AFK run needs: env vars, services, egress, token scopes | `docs/agents/environment.md` | interviewed |
| What an AFK run hands back | `docs/agents/afk-handback.md` | fixed |
| Steering approval | `.github/CODEOWNERS`, `.github/steering-ruleset.json`, `.github/bootstrap-steering-ruleset.sh` | switch `steering_gate` |
| Hooks and switch values, no-plugin channel only | `.agents/hooks/`; `.claude/settings.json` `hooks` and `env` | fixed |
| Auto-memory | off: `"autoMemoryEnabled": false` in `.claude/settings.json` | fixed |

## `docs/CODING_STANDARDS.md`

- One line per mistake an agent made here. A rule a tool can check goes to
  lint, typecheck or a test.
- A rule for part of the code is a section that names its scope in prose.
  Not `.claude/rules/`: a glob can miss a file, prose cannot.
- Only review reads it, so it may grow. `AGENTS.md` carries no pointer to it:
  Pocock's `code-review` finds it by this name.

## Switches

`comment_review`, `steering_gate`, `cleanup_comments`,
`cleanup_comments_max_files`.

- **Plugin:** each user answers them at install. Skills read
  `${user_config.<key>}`, hooks read `CLAUDE_PLUGIN_OPTION_<KEY>`.
- **No plugin:** `CLAUDE_PLUGIN_OPTION_<KEY>` in the `env` block of
  `.claude/settings.json` is the team value. `.claude/settings.local.json`
  overrides it for one person.
- An unset switch is on. Only `false` switches a safeguard off.
