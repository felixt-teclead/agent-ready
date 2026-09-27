---
name: update-codebase-for-agents
description: Refresh the skills and hooks that setup copied into .agents/ to agent-ready's current main, and rewire .claude/settings.json. For a repo set up without the plugin, or to move a repo off the plugin.
disable-model-invocation: true
---

# Update a codebase for agents

**Goal: the copied skills and hooks match agent-ready's `main`, no local edit is
lost without the owner saying so, and whoever merges knows what changes.**

No `.agents/agent-ready-manifest.json` (or `.agents/blueprint-manifest.json`,
its old name): stop. With the plugin, auto-update under `/plugin` →
Marketplaces does this job. Without the plugin, run
`/setup-codebase-for-agents` first. Exception: the owner wants this repo off
the plugin → step 4.

## 1. Fetch

Start from a clean tree on a new branch, `update-codebase-for-agents`. From
the repo root:

```sh
sh .agents/skills/setup-codebase-for-agents/fetch.sh
```

- **Exit 0, "Up to date"**: tell the owner, delete the branch, stop.
- **Exit 3**: each listed file was edited here and changed or dropped in
  agent-ready. Show its diff and ask the owner: keep or replace. One file per
  question. Then run it again with the printed `AGENT_READY_REF=<sha>` in front
  and one `--keep <path>` or `--replace <path>` per file.
- **Exit 1**: show the output and stop. A file outside the manifest blocks
  the path agent-ready now uses; the owner renames or deletes it.

The last run prints the old and new commits and every file as `written`,
`deleted` or `kept`. Keep that output for step 3. Commit `.agents/`.

## 2. Settings

`.claude/settings.json`, as setup step 9 wrote it.

**Hooks.** An entry is one hook; its script is the file name after
`.agents/hooks/` in its command. Build the entries the old
`.agents/hooks/hooks.json` gives, from the branch's base
(`git show $(git merge-base HEAD <default branch>):.agents/hooks/hooks.json`),
with setup step 9's rewrite. Compare each with the `settings.json` entry for
the same script. One that differs was edited by hand: show its diff and ask
keep or replace, one entry per question.

Then build the new entries the same way from the working tree's `hooks.json`
and edit `settings.json` in place, by script:

- in both old and new: replace the entry where it stands, unless kept;
- only in old: remove it, and drop a matcher group left empty;
- only in new: append it to the group with the same event and matcher, or add
  that group.

Leave every other hook alone.

**Switches.** Read `userConfig` from `plugins/agent-ready/.claude-plugin/plugin.json`
at the old and the new commit:

```sh
gh api -H 'Accept: application/vnd.github.raw' \
  "repos/felixt-teclead/agent-ready/contents/plugins/agent-ready/.claude-plugin/plugin.json?ref=<sha>" \
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
  agent-ready and is asked about again when agent-ready changes it again.
- **Why.** The agent-ready commits that touch `plugins/agent-ready/`, newest
  first; stop at the old commit, which the list also holds:

  ```sh
  gh api --paginate "repos/felixt-teclead/agent-ready/commits?sha=<new>&path=plugins/agent-ready" \
    --jq '.[] | "\(.sha[:7]) \(.commit.message | split("\n")[0])"'
  ```

  When the Pocock tag moved: old and new tag, and
  `https://github.com/mattpocock/skills/releases/tag/<new>`.

`.agents/skills/`, `.agents/hooks/` and `.claude/settings.json` are steering
files: tell the owner a human merges it.

Done when the pull request is open, its body names every behaviour change, and
every kept edit was the owner's answer.

Then ask the owner to say when it is merged. Update the default branch and run
`scan-codebase-for-agents` on it.

## 4. Move this repo off the plugin

The repo gets its own copies of the skills and hooks, and the plugin is
switched off for this project. Any repo set up with the plugin can run this,
at any time.

Start from a clean tree on a new branch, `move-off-plugin`.

1. **Copies.** Run setup step 2 as the no-plugin channel does, with the
   plugin's copy of the script:

   ```sh
   sh "${CLAUDE_PLUGIN_ROOT}/skills/setup-codebase-for-agents/fetch.sh"
   ```

   Commit `.agents/` and `.claude/skills`.
2. **Settings.** Write `.claude/settings.json` as setup step 9 does for the
   no-plugin channel. The `env` values come from this user's plugin config:

   ```sh
   jq '.pluginConfigs["agent-ready@teclead"]' ~/.claude/settings.json
   ```

   A key with no value there is asked as under **Switches** in step 2 above.
   Tell the owner these values now hold for everyone who clones the repo.
3. **Switch off.** In the same file, set `enabledPlugins` to
   `"agent-ready@teclead": false` and `"mattpocock-skills@teclead": false`.
   The repo now holds both plugins' skills and hooks; left on, each loads
   twice.
   Commit `.claude/settings.json` and `.gitignore`.
4. **Verify.** Run setup step 4's `settings.json` and no-plugin checks.

Open one pull request. Its body names the switch values and says the plugin
is off for this repo; `/update-codebase-for-agents` refreshes the copies from
now on. It touches steering files: a human merges it.

Done when the pull request is open, every hook in `settings.json` points into
`.agents/hooks/`, and each switch has an `env` value.
