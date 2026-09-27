# How the PR hook knows the last architecture review

Type: grilling
Status: resolved

## Question

How does the PR hook know when `/improve-codebase-architecture` last ran? The skill writes its report to `$TMPDIR` and leaves nothing in the repo. It is pinned, so we cannot change it. Decide what leaves the marker (our wrapper, the user, a commit trailer, an ADR date, a file) and where it lives.

## Answer

Grilled with the owner on 2026-09-27. Reopened and rewritten the same day by [What the repo keeps so the plugin can be switched off](07-plugin-switch-off.md): the PR list replaces the marker file.

**"Ran" means a review PR is merged.** A review is its own PR, labelled `architecture-review`. The tickets or ADRs spun out of the review ride in it. An abandoned review leaves no merged PR, so it counts as not run. A review PR opened without the label does not count. `labels.sh` creates the label.

**Check**: the PR hook runs `gh pr list --state merged --label architecture-review --search "merged:>=<today-N>" --limit 1`. A hit means the team is inside the window. The result is per team: one review resets it for everyone. The query fails (offline, no `gh` auth) → the hook exits silently. The hook fires on `gh pr create`, so it needs GitHub and network anyway.

**Opt-in and window**: committed `.claude/settings.json` `env` `AGENT_READY_ARCHITECTURE_REVIEW_DAYS`, the same in both channels. Unset means off: both hooks exit silently. Setup (or the migration) asks once: "Remind the team to run an architecture review every N days?" It is the one switch outside `userConfig`, because the cadence is a team decision. Setup interview G says so.

**Hooks** (in `plugins/agent-ready/hooks/`, a steering path):
- **Skill-start hook**: `PreToolUse` on `Skill` (`mattpocock-skills:improve-codebase-architecture`) plus `UserPromptSubmit` for the typed slash command. It writes nothing. It adds context: work on its own branch off `origin/<default>`, open the PR with label `architecture-review`. It covers manual and hook-offered runs alike.
- **PR hook**: the check above.

**When the user accepts the PR hook's offer**: the current PR goes through. The agent then opens a fresh worktree off `origin/<default>` and runs the review there, on branch `architecture-review/<date>`.

Rejected: a committed marker file `.agents/architecture-review` (a stamp commit, merge conflicts, and its opt-in role; the PR list already holds the fact); a branch-prefix match (GitHub search cannot match a prefix); a title convention (fragile); `userConfig` for N (per user, against a per-team fact); a per-clone marker in `.git/` (every dev gets nagged); a commit trailer (a squash merge can drop it); a question to the user on each run.
