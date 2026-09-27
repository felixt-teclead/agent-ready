---
name: update-codebase-for-agents
description: Refresh the skills and hooks that setup copied into .agents/ to blueprint's current main, and rewire .claude/settings.json. User-invoked, in a repo set up without the plugin.
disable-model-invocation: true
---

# Update a codebase for agents

**Goal: the copied skills and hooks match blueprint's `main`, no local edit is
lost without the owner saying so, and whoever merges knows what changes.**

No `.agents/blueprint-manifest.json`: stop. With the plugin, auto-update
under `/plugin` → Marketplaces does this job. Without the plugin, run
`/setup-codebase-for-agents` first.

## 1. Fetch

Start from a clean tree on a new branch, `update-codebase-for-agents`. From
the repo root:

```sh
sh .agents/skills/setup-codebase-for-agents/fetch.sh --update
```

- **Exit 0, "Up to date"**: tell the owner, delete the branch, stop.
- **Exit 3**: each listed file was edited here and changed or dropped in
  blueprint. Show its diff and ask the owner: keep or replace. One file per
  question. Then run the command again with the printed `--at <sha>` and one
  `--keep <path>` or `--replace <path>` per file.
- **Exit 1**: show the output and stop. A file outside the manifest blocks
  the path blueprint now uses; the owner renames or deletes it.

The last run prints the old and new commits and every file as `written`,
`deleted` or `kept`. Keep that output for step 3. Commit `.agents/`.

## 2. Settings

`.claude/settings.json`, as setup step 9 wrote it.

**Hooks.** Build the entries the old `.agents/hooks/hooks.json` gives
(`git show HEAD~1:.agents/hooks/hooks.json`, the branch's base): its `hooks`
object, every `${CLAUDE_PLUGIN_ROOT}/hooks/` changed to
`"$CLAUDE_PROJECT_DIR"/.agents/hooks/`. Compare them with the entries in
`settings.json` whose command points into `.agents/hooks/`. An entry that
differs was edited by hand: show its diff and ask keep or replace, one entry
per question.

Then remove every `.agents/hooks/` entry except the kept ones, and drop a
matcher group left empty. Merge in the entries the new `hooks.json` gives, as
setup step 9 does, skipping a hook whose kept entry already runs its script.
Leave every other hook alone.

**Switches.** Read `userConfig` from `plugins/agent-ready/.claude-plugin/plugin.json`
at the old and the new commit:

```sh
gh api -H 'Accept: application/vnd.github.raw' \
  "repos/felixt-teclead/blueprint/contents/plugins/agent-ready/.claude-plugin/plugin.json?ref=<sha>" \
  --jq .userConfig
```

Keep every existing `CLAUDE_PLUGIN_OPTION_<KEY>` value. Ask about each new
key with its description and default; a key with no default has no
recommendation. Remove the `env` entry of a key that is gone.

Commit `settings.json` on its own. Skip the commit when nothing changed.

## 3. Pull request

One pull request. The body opens with the impact, in plain words, before any
file list:

- **Behaviour.** Per hook added, removed or changed: what it now blocks or
  allows. Per skill added or removed: what it does, from its description.
- **Switches.** New keys with the chosen value; removed keys.
- **Kept edits.** Every `kept` file and kept hook entry. Each now differs from
  blueprint and is asked about again on the next update.
- **Why.** The blueprint commits that touch `plugins/agent-ready/`, newest
  first; stop at the old commit, which the list also holds:

  ```sh
  gh api --paginate "repos/felixt-teclead/blueprint/commits?sha=<new>&path=plugins/agent-ready" \
    --jq '.[] | "\(.sha[:7]) \(.commit.message | split("\n")[0])"'
  ```

  When the Pocock tag moved: old and new tag, and
  `https://github.com/mattpocock/skills/releases/tag/<new>`.

`.agents/skills/`, `.agents/hooks/` and `.claude/settings.json` are steering
files. Do not merge; tell the owner a human merges it.

Done when the pull request is open, its body names every behaviour change, and
every kept edit was the owner's answer.
