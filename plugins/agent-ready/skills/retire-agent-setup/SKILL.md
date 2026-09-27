---
name: retire-agent-setup
description: Retire an old agent setup — switch off another framework's plugins and remove its skills, hooks, scratch and override. Use when the user wants a previous agent framework out of the repo.
---

# Retire an old agent setup

**Goal: every hit of the old setup, and the override of an overridden
framework, is removed or kept by the user's choice; each retired plugin is
off in this repo for everyone; whatever goes was pushed or named first.**
Specs, plans and framework sections stay in place for
`model-codebase-domain` and `route-codebase-docs`: list them in the summary.
The override's part of `AGENTS.md` is no framework section; it goes with the
override.

**Alone:** the worklist's
[Start or resume](../adopt-pocock-methodology/worklist.md#start-or-resume)
for the branch `retire-agent-setup`; its Start opens the branch without a
worklist. [Apply](#8-apply)'s one commit is the run, its message the pull
request body, and Apply opens the PR.
**As a block:** a calling skill names its branch; work on it and hand the
summary back instead of opening a PR.

## 1. Inventory

Run [measure.md](../setup-codebase-for-agents/measure.md)'s
[Old setup](../setup-codebase-for-agents/measure.md#4-old-setup). No plugin,
skill or hook hit, no scratch, and no overridden framework that
`.agents/deviations.md` does not list → say "nothing to retire", name any
specs, plans and framework sections it found, and stop. As a block, hand
back an empty summary.

## 2. Unpushed work

List, each with its path or branch:

- uncommitted changes: `git status --porcelain`
- branches with commits no remote has, apart from the caller's branch:
  `git log --branches --not --remotes --oneline --decorate`
- worktrees with uncommitted or unpushed work: `git worktree list`, then the
  two checks above inside each

Empty → go on. Otherwise suggest pushing. "continue anyway" → go on;
"stop" → stop, and a calling skill stops too; any other answer: run the
checks again.

## 3. Plugins

Ask once: "Does anyone here run another agent framework plugin, installed
only for themselves? Name its key." Each named key is a plugin hit too.

Per plugin hit, its key goes `false` in the `enabledPlugins` of
`.claude/settings.json`: the plugin is then off in this repo for everyone,
whatever scope installed it. Drop an `extraKnownMarketplaces` entry of that
file once no `true` key uses it.

A key in `.claude/settings.local.json` outranks that `false`: tell the user
to remove it with `/plugin`. A user-scope install stays on in other repos:
the summary tells every teammate to uninstall it with `/plugin`.

## 4. Override

An overridden framework (Old setup) is one line with its plugins: they go
together. Removing it removes every home of its row in the
[routing table](../setup-codebase-for-agents/routing-table.md), each edited in
place; drop a `deny` or `permissions` left empty. The `.gitignore` line goes
only when [Scratch](#6-scratch) deletes the folder it names. The framework's
key goes `false` as under [Plugins](#3-plugins); no settings file names one →
ask the user for it.

## 5. Skills and hooks

One table, one row per skill hit and per hook hit:

| Item | What it does | Replaced by | Lost | Action |
|---|---|---|---|---|

- **Replaced by:** the Pocock step (a `mattpocock-skills` skill) or the
  agent-ready skill it duplicates. Read the item before you fill it. An item
  that does only what this repo needs is no hit: move it below the table as
  "repo-specific".
- **Lost:** what the repo can no longer do once the item is gone. "Nothing"
  only when the replacement covers every branch of the item.
- **Action:** delete.

A hook in `.claude/settings.local.json` gets a row too; its action is "user
removes", like a personal plugin.

## 6. Scratch

The worktree this run works in is never scratch.

- **Delete:** worktrees that are clean, pushed and hold no ignored file in a
  scratch folder (`git status --porcelain --ignored` inside each: an
  in-flight plan in `.superpowers/plans/` shows there), and run state its own
  tool deletes when a run ends (a self-ignored run folder).
- **Ask:** every other scratch item, tracked or not. The user names delete
  or keep per item.
- **`.gitignore`:** remove the lines that name a folder marked delete.

## 7. Confirm once

Show [Plugins](#3-plugins), [Override](#4-override), the table with its
repo-specific items, and the scratch list together. The user strikes each
row that stays; repeat the edited set until they confirm. That one
confirmation is the only one. Every change waits for it: Plugins through
Scratch build the list, [Apply](#8-apply) changes the repo.

A struck plugin, override, skill or hook stays: its line goes into
`.agents/deviations.md`, as the scan's
[Accepted deviations](../scan-codebase-for-agents/SKILL.md#accepted-deviations)
says, class `old setup`. A repo-specific item gets a line with class
`repo-specific`. Later runs skip both.

## 8. Apply

Once confirmed, in this order:

1. Settings: edit `.claude/settings.json` in place, by script. A hook entry's
   key is its event, its matcher and its script, as in
   [update's Settings](../update-codebase-for-agents/SKILL.md#2-settings).
   Drop a matcher group or object left empty. It must still parse as JSON.
2. Override: `git rm` its file, and cut its part from `AGENTS.md`.
3. Skills and hooks marked delete: `git rm -r` the folder or script.
4. Scratch marked delete: `git worktree remove` for worktrees, `git rm -r`
   for tracked items, `rm -rf` for the rest; then the `.gitignore` lines.
5. Struck rows and repo-specific items: their `.agents/deviations.md`
   lines.

One commit, `chore: retire old agent setup`. Its message is the summary:

- each plugin switched off, and the ones the user removes by hand
- "Teammates: uninstall `<plugin>` with `/plugin`; it is already off in this
  repo." for each retired plugin
- the override removed
- the table with the confirmed actions
- the scratch deleted; untracked items were outside git, so not in the diff
- the specs, plans and framework sections [Inventory](#1-inventory) found,
  left in place

**Alone:** push and open the PR, body = the summary; who merges: the
worklist's [End](../adopt-pocock-methodology/worklist.md#end). Tell the
user: "Start a fresh session: this one still carries the retired setup.
Unsure what's next? Run `/ask-agent-ready`."
**As a block:** hand the summary to the caller.
