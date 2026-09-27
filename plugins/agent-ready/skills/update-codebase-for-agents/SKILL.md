---
name: update-codebase-for-agents
description: Refresh the skills and hooks that setup copied into .agents/ to agent-ready's current main, and rewire .claude/settings.json. For a repo set up without the plugin, or to move a repo off the plugin.
disable-model-invocation: true
---

# Update a codebase for agents

**Goal: the copied skills and hooks match agent-ready's `main`, the owner
decides every local edit, and whoever merges knows what changes.**

No `.agents/agent-ready-manifest.json` (or `.agents/blueprint-manifest.json`,
its old name):

- With the plugin (measure.md's
  [Channel](../setup-codebase-for-agents/measure.md#1-channel-and-switches)
  says plugin): ask "Move this repo off the plugin? The skills, hooks and
  the team's switch values then come with every clone, for teammates and AFK
  runners without the plugin."
  Yes → [Move this repo off the plugin](#4-move-this-repo-off-the-plugin).
  No → stop, and tell the owner the plugin stays current only while
  auto-update is on under `/plugin` → Marketplaces.
- Without the plugin: stop, and tell the owner to run
  `/setup-codebase-for-agents` first.

Setup's Skills step and Verify section are in
[its SKILL.md](../setup-codebase-for-agents/SKILL.md); what it writes into
`.claude/settings.json` is in
[settings.md](../setup-codebase-for-agents/settings.md).

## 1. Fetch

Start from a clean tree on a new branch, `update-codebase-for-agents`, off
`origin/<default>`. From the repo root:

```sh
sh .agents/skills/setup-codebase-for-agents/fetch.sh
```

fetch.sh deletes only manifest copies agent-ready dropped, file by file:
no [confirmed step](../setup-codebase-for-agents/confirmed-steps.md).

- **Exit 0, "Up to date"**: do only **Newer setup writes** in
  [Settings](#2-settings). Nothing to write → tell the owner, delete the
  branch, stop.
- **Exit 3**: each listed file was edited here and changed or dropped in
  agent-ready. Show its diff and ask the owner: keep or replace. One file per
  question. Then run it again with the printed `AGENT_READY_REF=<sha>` in front
  and one `--keep <path>` or `--replace <path>` per file.
- **Exit 1** with files not in the manifest: each blocks a path agent-ready
  now uses; the owner renames or deletes it, then run it again. Any other
  exit 1 is agent-ready's bug or the network: show the output and stop.

`.claude/skills` is a folder (setup kept runtime skills out): link each new
`.agents/skills/<name>` into it as setup's Skills step does, and remove each
link whose target is gone. Keep the last run's output for the pull request.
Commit `.agents/` and `.claude/skills`.

Fetch wrote `.agents/skills/update-codebase-for-agents/SKILL.md` → read that
file now, and go on after its Fetch section: this session loaded the old
text.

Done when a run exits 0 and its changes are committed.

## 2. Settings

`.claude/settings.json`, as
[Settings file](../setup-codebase-for-agents/settings.md#settings-file) says,
written as
[Writing the file](../setup-codebase-for-agents/settings.md#writing-the-file)
says; a gap-list entry goes into the pull request body.

**Hooks.** An entry is one hook. Its key is its event, its matcher and its
script, the file name after `.agents/hooks/` in its command. Build the entries
the old `.agents/hooks/hooks.json` gives, from the branch's base
(`git show $(git merge-base HEAD origin/<default>):.agents/hooks/hooks.json`),
with the rewrite in
[Settings file](../setup-codebase-for-agents/settings.md#settings-file).
Compare each with the `settings.json` entry of the same key. One that differs
was edited by hand: show its diff and ask keep or replace, one entry per question.

Then build the new entries the same way from the working tree's `hooks.json`
and edit `settings.json` in place, by key:

- in both old and new: replace the entry where it stands, unless kept;
- only in old: remove it, and drop a matcher group left empty;
- only in new: append it to the group with the same event and matcher, or add
  that group.

Leave every other hook alone.

**Switches.** Read `userConfig` at the old and the new commit, as
[Switches](../setup-codebase-for-agents/settings.md#switches) says. Keep every
existing `CLAUDE_PLUGIN_OPTION_<KEY>` value. Ask about each new key as that
section says. Remove the `env` entry of a key that is gone.

**Newer setup writes.** Write each key
[Settings file](../setup-codebase-for-agents/settings.md#settings-file) lists
that `settings.json` lacks, as it says; ask the window as
[Review window](../setup-codebase-for-agents/settings.md#review-window) says.
A window above 0 on a GitHub remote: also run
`sh .agents/skills/setup-codebase-for-agents/labels.sh --review-only`; a
`Failed` line goes into the pull request body.

Commit `settings.json` on its own. Skip the commit when nothing changed. Then
run `sh .agents/skills/setup-codebase-for-agents/verify-hooks.sh`; each `FAIL`
line goes into the pull request body.

Done when every hook entry of the old and new `hooks.json` is replaced, kept,
removed or appended, every `userConfig` key has its `env` value, no key that
Settings file lists is missing, and verify-hooks.sh ran.

## 3. Pull request

One pull request. The body opens with the impact, in plain words, before any
file list:

- **Behaviour.** Per hook added, removed or changed: what it now blocks or
  allows. Per skill added or removed: what it does, from its description.
- **Switches.** New keys with the chosen value; removed keys; the review
  window when it was asked.
- **Kept edits.** Every `kept` file and kept hook entry. Each now differs from
  agent-ready and is asked about again when agent-ready changes it again.
- **Why.** The agent-ready commits that touch `plugins/agent-ready/` after
  the old commit, newest first:

  ```sh
  since=$(gh api repos/felixt-teclead/agent-ready/commits/<old> --jq .commit.committer.date)
  gh api --paginate "repos/felixt-teclead/agent-ready/commits?sha=<new>&path=plugins/agent-ready&since=$since" \
    --jq '.[] | select(.sha != "<old>") | "\(.sha[:7]) \(.commit.message | split("\n")[0])"'
  ```

  When the Pocock tag moved: old and new tag, and
  `https://github.com/mattpocock/skills/releases/tag/<new>`.

It touches steering files (the list in `AGENTS.md`): tell the owner a human
merges it.

Done when the pull request is open, its body has a Behaviour line for each
hook changed and each skill added or removed, and every kept edit was the
owner's answer.

## 4. Move this repo off the plugin

The repo gets its own copies of the skills and hooks, and both plugins are
switched off for this project. Any repo set up with the plugin can run this,
at any time.

Start from a clean tree on a new branch, `move-off-plugin`, off
`origin/<default>`.

1. **Copies.** Run setup's Skills step as the no-plugin channel does, with
   the plugin's copy of the script:

   ```sh
   sh "${CLAUDE_PLUGIN_ROOT}/skills/setup-codebase-for-agents/fetch.sh"
   ```

   Commit `.agents/` and `.claude/skills`.
2. **Settings.** Write `.claude/settings.json` as
   [Settings file](../setup-codebase-for-agents/settings.md#settings-file)
   says for the no-plugin channel, written as
   [Writing the file](../setup-codebase-for-agents/settings.md#writing-the-file)
   says. The switch values in `env` are this
   user's plugin values:

   - `comment_review`: `${user_config.comment_review}`
   - `steering_gate`: `${user_config.steering_gate}`
   - `cleanup_comments`: `${user_config.cleanup_comments}`
   - `cleanup_comments_max_files`: `${user_config.cleanup_comments_max_files}`

   A value still in `${…}` form is unset: ask it as
   [Switches](../setup-codebase-for-agents/settings.md#switches) says. Tell
   the owner these values now hold for everyone who clones the repo. The
   review window, when `env` lacks it: ask and write it as under **Newer
   setup writes** in [Settings](#2-settings).
   Commit `.claude/settings.json` and `.gitignore`.
3. **Verify.** Run setup's Verify checks for `settings.json` and the hooks,
   the hooks with the copy,
   `sh .agents/skills/setup-codebase-for-agents/verify-hooks.sh`.

Open one pull request. Its body names the switch values and says both plugins
are off for this repo; `/update-codebase-for-agents` refreshes the copies from
now on. It touches steering files: a human merges it.

Done when the pull request is open, every agent-ready hook in `settings.json`
points into `.agents/hooks/`, and each switch has an `env` value.
