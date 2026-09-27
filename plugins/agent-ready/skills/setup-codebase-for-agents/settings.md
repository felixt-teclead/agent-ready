# Settings

What setup writes into `.claude/settings.json`, and the questions behind it.
Setup, update and the migration use it.

## Switches

The [switches](routing-table.md#switches), each with its `description` and
default from agent-ready's `plugin.json`, at `main` unless a step names a
commit:

```sh
gh api -H 'Accept: application/vnd.github.raw' \
  "repos/felixt-teclead/agent-ready/contents/plugins/agent-ready/.claude-plugin/plugin.json?ref=<sha or main>" \
  --jq .userConfig
```

Ask each with its description; recommend its default. A key with no default
has no recommendation.

## Review window

"`/improve-codebase-architecture` scans the code for modules worth deepening
and walks you through one. After a pull request opens, remind the team to run
it when no review merged in the last N days?" Recommend 7. No → `"0"`.

It is written as `env` `AGENT_READY_ARCHITECTURE_REVIEW_DAYS`, days as a
string.

## Settings file

`.claude/settings.json`: `"autoMemoryEnabled": false`, and `env`
`AGENT_READY_ARCHITECTURE_REVIEW_DAYS` from the [Review window](#review-window).
Both channels: `.agents/refactor.local` in `.gitignore`.

No-plugin channel also:

- `hooks`: the `hooks` object of `.agents/hooks/hooks.json`, with every
  `"${CLAUDE_PLUGIN_ROOT}"/hooks/` (quoted or not) changed to
  `"$CLAUDE_PROJECT_DIR"/.agents/hooks/`. Inside a JSON string each `"` is
  `\"`. Merge it into existing `hooks`: append each entry to the group with
  the same event and matcher, or add that group. A group without a matcher
  matches one without.
- `env`: one `CLAUDE_PLUGIN_OPTION_<KEY>` per [switch](#switches) answer, as
  a string.
- `enabledPlugins`: `"agent-ready@teclead": false` and
  `"mattpocock-skills@teclead": false`. The copies in `.agents/` replace both
  plugins; a user-scope install left on loads every skill and hook twice.
