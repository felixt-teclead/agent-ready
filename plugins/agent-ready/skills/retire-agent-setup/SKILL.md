---
name: retire-agent-setup
description: Retire an old agent setup — plugins, repo skills and hooks, scratch — so it stops steering the agent. Use when the user wants a previous agent framework out of the repo, or a migration calls it as its preflight.
---

# Retire an old agent setup

**Goal: every plugin, skill, hook and scratch folder of the old setup is
removed or kept by the owner's choice, and nothing is lost that was not
pushed or named.** Specs, plans and framework sections are not this skill's
job: list them in the hand-over, and leave them in place.

**Alone:** start from a clean tree on a new branch, `retire-agent-setup`; §7
opens the PR. **As a block:** a calling skill names its branch; work on it
and hand §7's summary back instead of opening a PR.

## 1. Inventory

Run §4 of [measure.md](../setup-codebase-for-agents/measure.md). No plugin,
skill, hook or scratch item → say "nothing to retire", name any specs, plans
and framework sections it found, and stop.

## 2. Push gate

List, each with its path or branch:

- uncommitted changes: `git status --porcelain`
- branches with commits no remote has: `git log --branches --not --remotes --oneline --decorate`
- worktrees with uncommitted or unpushed work: `git worktree list`, then the
  two checks above inside each

Empty → go on. Otherwise suggest pushing, and go on only after the owner
answers "continue anyway". Any other answer: run the checks again.

## 3. Plugins

Every plugin hit becomes a removal in `.claude/settings.json`. Drop an
`extraKnownMarketplaces` entry once no remaining `enabledPlugins` key uses
it.

`.claude/settings.local.json` and user-scope installs (`~/.claude/`) are the
owner's, out of this skill's reach. Name the plugins found there and tell the
owner to remove them with `/plugin`.

## 4. Skills and hooks

One table, one row per skill and per hook:

| Item | What it does | Replaced by | Lost | Action |
|---|---|---|---|---|

- **Replaced by:** a Pocock step (a `mattpocock-skills` skill), an
  agent-ready skill, or "repo-specific". Read the item before you fill it.
- **Lost:** what the repo can no longer do once the item is gone. "Nothing"
  only when the replacement covers every branch of the item.
- **Action:** replaced → delete; repo-specific → keep.

A hook in `.claude/settings.local.json` gets a row too; its action is "owner
removes", like §3's personal plugins.

## 5. Scratch

- **Delete:** worktrees that are clean and pushed, and run state its own tool
  deletes when a run ends (a self-ignored run folder).
- **Ask:** every other untracked item. The owner names delete or keep per
  item.
- **`.gitignore`:** remove the lines that name a folder marked delete.

## 6. Confirm once

Show §3's removals, §4's table and §5's list together. The owner strikes the
rows to flip; repeat the edited set until they confirm. That one
confirmation is the only one. Every deletion waits for it.

## 7. Apply

In the order confirmed:

1. Settings: edit `.claude/settings.json` in place, by script. Drop a matcher
   group or object left empty. It must still parse as JSON.
2. Skills and hooks marked delete: `git rm -r` the folder or script.
3. Scratch marked delete: `git worktree remove` for worktrees, `rm -rf` for
   the rest; then the `.gitignore` lines.

One commit, `chore: retire old agent setup`. Its summary lists:

- each removed plugin entry, and the ones the owner removes by hand
- the §4 table with the confirmed actions
- the scratch deleted (outside git, so not in the diff)
- the specs, plans and framework sections §1 found, left in place

**Alone:** open the PR, body = the summary. `.claude/settings.json` and
`.agents/skills/` are steering files: say "steering diff, a human merges".
**As a block:** hand the summary to the caller.
