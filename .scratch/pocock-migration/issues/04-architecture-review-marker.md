# How the PR hook knows the last architecture review

Type: grilling
Status: resolved

## Question

How does the PR hook know when `/improve-codebase-architecture` last ran? The skill writes its report to `$TMPDIR` and leaves nothing in the repo. It is pinned, so we cannot change it. Decide what leaves the marker (our wrapper, the user, a commit trailer, an ADR date, a file) and where it lives.

## Answer

Grilled with the owner on 2026-09-27.

**Marker**: `.agents/architecture-review`, a committed file holding one date. It is per team, not per clone: one review resets it for everyone.

**"Ran" means the review PR is merged.** A review is its own PR. The stamp commit and the tickets or ADRs spun out of the review ride in it. An abandoned review leaves no PR and no stamp, so it counts as not run.

**Opt-in**: setup (or the migration) asks once: "Remind the team to run an architecture review every N days?" Yes writes the file with an empty date. The file's existence on `origin/<default>` is the opt-in. There is no second setting. If the file is absent, both hooks exit silently.

**Hooks** (in `plugins/agent-ready/hooks/`, a steering path):
- **Skill-start hook**: `PreToolUse` on `Skill` (`mattpocock-skills:improve-codebase-architecture`) plus `UserPromptSubmit` for the typed slash command. It writes nothing. It adds context: work on its own branch off `origin/<default>`, commit `.agents/architecture-review` with today's date. It covers manual and hook-offered runs alike.
- **PR hook** check: reads only `origin/<default>:.agents/architecture-review`, from the last fetch. No `git fetch` in the hook: a stale date costs one extra offer at most.

**When the user accepts the PR hook's offer**: the current PR goes through. The agent then opens a fresh worktree off `origin/<default>` and runs the review there, on branch `architecture-review/<date>`.

**Merge conflict** on the file: keep the newer date.

Rejected: a per-clone marker in `.git/` (every dev gets nagged, one review per dev per window); a commit trailer (a squash merge can drop it); an uncommitted stamp (it never reaches the team); a question to the user on each run.
