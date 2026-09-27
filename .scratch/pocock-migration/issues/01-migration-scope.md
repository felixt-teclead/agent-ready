# What migrating the current setup covers

Type: grilling
Status: resolved
Blocked by: 06

## Question

When the migration skill runs, what does "migrate the current setup" cover? For each kind of leftover from the old framework (skills, hooks, plugins, plan and spec folders, sections in `CLAUDE.md`/`AGENTS.md`), decide: delete, fold into `CONTEXT.md` or an ADR, or keep. Also decide how setup detects that a current setup exists before it asks the migration question.

## Answer

Grilled with the owner on 2026-09-27.

**Detection (setup)**: the `measure.md` inventory looks for any agent artifact that setup did not write: a non-plugin `enabledPlugins` entry, repo skills or hooks, dated spec or plan folders, framework sections in `CLAUDE.md`/`AGENTS.md`. Any hit → ask the migration question, listing the hits. No lists of framework names.

**Preflight** runs before `/domain-modeling`. It is housekeeping, not a chain step. It runs first because old plugins and skills would otherwise steer the `/domain-modeling` session.

1. **Push gate (soft)**: list uncommitted changes, unpushed branches and dirty worktrees. Suggest pushing. Continue only after an explicit "continue anyway".
2. **Plugins**: remove framework `enabledPlugins` entries from `.claude/settings.json` and say so in the PR. Tell the user about user-scope installs, which the skill cannot reach.
3. **Skills and hooks**: one table. Per item: what it does, what replaces it (a Pocock step, a plugin skill, or "repo-specific"), what is lost, proposed action. Propose deleting duplicates of a Pocock step and keeping repo-specific items. The user strikes items, then confirms once.
4. **Scratch**: delete what can be recreated: clean, pushed worktrees and self-deleting run state. List other untracked items and ask about them. Remove `.gitignore` lines that point at deleted folders.

**Step 1 (`/domain-modeling`)**: spec and plan folders are input. Terms go to `CONTEXT.md`, hard-to-reverse decisions go to ADRs, unfinished plans become GitHub issues. Then ask to delete the folder, because specs are not needed after the work is built. If the user says no, move it to `docs/archive/<folder>/` with a README: "Historical. Superseded by `CONTEXT.md` and `docs/adr/`. Do not follow."

**Step 2 (doc cleanup)**: delete framework-specific sections of `CLAUDE.md`/`AGENTS.md`. Routing of all other statements: see [How /writing-for-agents shapes the doc-cleanup step](03-doc-cleanup-step.md).
