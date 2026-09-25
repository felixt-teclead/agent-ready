---
name: update-matt-pocock-skills
description: Refresh the skills and hooks in .agents/ from blueprint, with Pocock's skills at the tag blueprint pins. User-invoked, repos without the plugin.
disable-model-invocation: true
---

# Update the copied skills

Plugin channel (see step 1 of
[measure.md](../setup-codebase-for-agents/measure.md)): stop. Updating the
marketplace under `/plugin` does this.

## 1. Fetch

Clean working tree, new branch. From the repo root run
[fetch.sh](../setup-codebase-for-agents/fetch.sh). Its header gives the rule
for each file.

Exit 1 with diffs: show the owner each diff, one file at a time, and ask keep
or replace. Rerun with the `BLUEPRINT_REF` it printed and one `--keep` or
`--replace` per file.

Done when it exits 0.

## 2. Hooks

Re-derive the `hooks` block of `.claude/settings.json` as step 9 of
[setup](../setup-codebase-for-agents/SKILL.md) says. First drop every hook
whose command starts with `"$CLAUDE_PROJECT_DIR"/.agents/hooks/`, so a hook
blueprint removed leaves too. Keep all other hooks.

Done when `.claude/settings.json` parses and each hook script it names exists.

## 3. Hand over

One commit, one pull request. The body gives the blueprint commit and the tag
before and after, from the manifest diff, and each file kept against upstream.
The diff touches `.agents/skills/`, so a human merges it.
