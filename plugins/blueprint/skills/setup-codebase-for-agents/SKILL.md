---
name: setup-codebase-for-agents
description: "Set a codebase up to the blueprint routing table: interview the owner, then write AGENTS.md, the skills folder, the tracker docs, CODING_CONVENTIONS.md and the switched-on extras. Use on a new repo, or on an existing one after the scan."
disable-model-invocation: true
---

<!-- PROTOTYPE for #28. Throwaway. Rough take to react to, not the shipped skill. -->

# Set up a codebase for agents

Interview, then write. Never copy a payload: the repo's stack decides the
commands, not this skill.

## Rules

- Write only what the owner gave you. A row with no answer stays absent and
  goes on the gap list. A defaulted command is silently wrong.
- Merge, never overwrite. An existing file keeps its text.
- The repo is coherent after every step. One commit per step.
- Every step touches a steering path, so the branch is a steering diff. Open
  the PR, state what it decides, and leave the merge to a human.

## 1. Explore (read-only)

- `git remote -v`: GitHub, GitLab, none.
- `AGENTS.md`, `CLAUDE.md`: which exists, is one a symlink, what they hold.
- The manifest: `package.json`, `pyproject.toml`, `Cargo.toml`, `Makefile`, ...
  Which scripts exist for lint, typecheck, test.
- `README.md`: present, what it says about running the code.
- An architecture doc anywhere (`ARCHITECTURE.md`, `docs/architecture*`).
- `.claude/skills/`, `.agents/skills/`, `docs/agents/`, `CONTEXT.md`,
  `docs/adr/`.
- The `userConfig` switches: `comments`, `steering_gate`.

**Existing steering content found?** Run the scan skill first and write only
the rows it reports missing. Restructuring what exists is cleanup, not setup.
<!-- OPEN Q1: is this the one-command-set seam, and does retrofit.md retire? -->

## 2. Interview

One section, one answer. Lead with the recommendation. Skip a section the
exploration already settled.

A. **Commands.** "Which command runs lint / typecheck / test?" Each must live
   in the manifest. Never restated in prose.
B. **README.** "Does the code need setup before it runs?" Yes: README with
   how to run. No: no README from this skill.
C. **Mechanical rules.** Which of lint, typecheck, test exist. A missing one
   is a gap. <!-- OPEN Q5: report the gap, or propose installing one? -->
D. **CODING_CONVENTIONS.md.** "Which mistakes do agents make here?" One line
   each. <!-- OPEN Q3: what a fresh repo gets when the answer is "none yet" -->
E. **Tracker.** GitHub (default when the remote is GitHub), local markdown,
   Linear. Triage labels: the five defaults unless overridden.
   <!-- OPEN Q2: vendor Pocock's templates into the plugin, or call his skill? -->

## 3. Write, in this order

Each step is one commit and leaves the repo coherent.

1. `AGENTS.md`: single source of truth, the agent-skills block. If a
   `CLAUDE.md` exists, its text moves into `AGENTS.md`. Then `CLAUDE.md`
   becomes a symlink to `AGENTS.md`.
2. `.agents/skills/`: move any `.claude/skills/` content in, then
   `.claude/skills` becomes a symlink.
3. `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`.
4. `docs/CODING_CONVENTIONS.md` from answer D.
5. The manifest scripts from answer A; `README.md` from answer B.
6. The architecture pointer line in `AGENTS.md`, only if exploration found an
   architecture doc.
7. `.claude/settings.json`: auto-memory off.
8. If `steering_gate`: the steering rule in `AGENTS.md`, `.github/CODEOWNERS`,
   `.github/steering-ruleset.json`, `.github/bootstrap-steering-ruleset.sh`.
   Last, because from here on every edit to the files above is a steering diff.
   <!-- `comments` needs no write: the plugin's push hook reads the switch. -->

## 4. Verify

- Run each command from answer A. It exits, it does not prompt.
- `CLAUDE.md` and `.claude/skills` resolve.
- No-op test on every `AGENTS.md` line: delete it; if behaviour does not
  change, it goes.

## 5. Report

What was written, one line per step. The gap list: each row not filled, and
why. Next step: run the scan skill later to measure drift.
<!-- OPEN Q4: one PR with a commit per step, or one PR per step as retrofit.md does? -->
