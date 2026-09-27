---
name: setup-codebase-for-agents
description: Interview the owner and write the agent steering structure into a codebase, new or existing.
disable-model-invocation: true
---

# Set up a codebase for agents

Write each row of the [routing table](routing-table.md) from the owner's
answers and the repo's own stack. The file texts are in
[templates/](templates/).

**Coherent** means every pointer resolves, and no file cites a file that is
not written yet. The repo is coherent after every commit.

The **gap list** holds every row left unwritten, with the reason. An
unanswered question puts its row on the gap list. It never gets a default.

This skill writes only rows that are missing, plus the home file of a
`fixed` row that is misplaced, so `cleanup` has somewhere to move its
statements. Changing existing content is the `cleanup` skill's job.

## 1. Measure

Run [measure.md](measure.md). It gives the channel, the switches, one
status per row, and the old setup.

Plugin channel switch values, filled in when the skill loads. A value still
in `${…}` form is unset:

- `comment_review`: `${user_config.comment_review}`
- `steering_gate`: `${user_config.steering_gate}`
- `cleanup_comments`: `${user_config.cleanup_comments}`
- `cleanup_comments_max_files`: `${user_config.cleanup_comments_max_files}`

No-plugin channel with `.agents/agent-ready-manifest.json`: its `"commit"`
differs from agent-ready's `main`
(`gh api repos/felixt-teclead/agent-ready/commits/main --jq .sha`) → the
copies are older than this skill. Stop, and ask the owner to run
`/update-codebase-for-agents` first; it brings the new hooks and settings.

Done when every row and every old file found has a status, and the old
setup is listed.

## 2. Interview

Ask only about rows marked `missing`, and I as it says. One section, one
answer, then the next. Put the recommended answer first, so the owner can
accept it in a word.

- **A. Commands,** also when only the verify row is missing and the
  manifest has no `check` script. Which commands run lint, typecheck and
  test. Then one `check` script in the manifest that runs all three. It
  exits non-zero on a failure, never prompts or watches, and needs no
  service that `docs/agents/environment.md` does not declare.
- **B. README.** Does the code need setup before it runs? No → no
  `README.md` is written.
- **C. Mechanical checks.** For each missing lint, typecheck or test tool:
  name the stack's usual tool and offer to install it. A decline puts it on
  the gap list.
- **D. Coding standards.** Which mistakes do agents make here? One line
  each. None known → the header only.
- **E. Tracker.** GitHub when the remote is GitHub, GitLab when it is GitLab,
  else local markdown. "Other" (Jira, Linear, ...) → the owner describes the
  workflow in one paragraph. Triage labels: defaults, renamed, or none?
  Renamed: the owner names the string per role; a dropped role is `—`.
- **F. AFK environment.** Env vars and where their values come from,
  services and network egress the `check` script needs.
- **G. Switches, no-plugin channel only.** Each of the
  [switches](routing-table.md#switches); recommend its default.
- **H. Steering owner,** when `steering_gate` is on: a GitHub handle or
  `@org/team` with write access to this repo.
- **I. Framework,** always, unless the Superpowers row is `home`. Name the
  hits by the summary in measure.md's [Old setup](measure.md#4-old-setup).
  Row not `missing`: ask first, "Does anyone here run Superpowers? A
  teammate's own install leaves no trace in the repo." No, and no hits →
  I's answer is neither; ask nothing more. Otherwise ask "Migrate, Stubborn
  or neither?", each option with what it does, when it is right and what it
  costs, in the words of
  [Migrate, Stubborn or neither](../ask-agent-ready/TRADEOFFS.md#migrate-stubborn-or-neither).
  - **Migrate** (recommended): `/adopt-pocock-methodology`, typed after this
    pull request merges. With no hits, say what it does here: it builds
    `CONTEXT.md` and routes the docs.
  - **Stubborn**, offered when the row is `missing` or the first answer was
    yes.
  - **Neither.**

  Stubborn: the row counts as `missing`, and [Write](#3-write) writes it.
  Migrate or neither: it counts as `n/a`; no step writes it, and the gap
  list leaves it out.
- **J. Architecture review.** "After a pull request opens, remind the team
  to run `/improve-codebase-architecture` when no review merged in the last
  N days?" Recommend 7. No → `"0"`.

Done when every missing row has an answer or a gap-list entry.

## 3. Write

One branch, one pull request, one commit per step. Skip a step whose rows
are all `home`, `n/a` or on the gap list; in a step that runs, write only
its missing rows. Merge into an existing file at the template's place: it
keeps its text. Placeholders in a template are `<...>`; fill each one, or
leave the file out and put its row on the gap list.

1. **`AGENTS.md`** from [the template](templates/AGENTS.md), without the
   `## Agent skills` block (step 3 adds it) and the `## Verify` section
   (step 4 adds it). An existing `CLAUDE.md` is renamed to `AGENTS.md`
   (`git mv`) and keeps its text. When both exist as files, `CLAUDE.md`'s
   text moves into `AGENTS.md`, each line once. `CLAUDE.md` becomes a
   symlink: `ln -s AGENTS.md CLAUDE.md`.
2. **Skills.** `.agents/skills/`, and `ln -s ../.agents/skills .claude/skills`.
   Existing `.claude/skills/` content moves into `.agents/skills/` unchanged.
   Plugin channel with no skills in the repo: skip this step. No-plugin
   channel: run [fetch.sh](fetch.sh) from the repo root. It copies
   agent-ready's skills and hooks, and Pocock's skills at the tag agent-ready
   pins. If it lists clashing files, show them to the owner, who renames or
   deletes them; then run it again.
3. **`docs/agents/`** from answer E: `issue-tracker.md` from
   `templates/docs/agents/issue-tracker-<github|gitlab|local>.md`, or from the
   owner's paragraph; `triage-labels.md` only for renamed labels. Add the
   `## Agent skills` block from the template to `AGENTS.md`, without the
   `### Superpowers` and `### AFK runs` parts. An existing `## Agent skills`
   block is updated in place.
4. **Commands** from answer A into the manifest scripts, and the
   `## Verify` section into `AGENTS.md`. No `check` script → the verify row
   goes on the gap list. **`README.md`** from answer B.
5. **Each tool** the owner accepted in answer C: the tool, its config, its
   script. One commit per tool.
6. **AFK files** from answer F: `docs/agents/environment.md` and
   `docs/agents/afk-handback.md`, plus the `### AFK runs` part of the block.
7. **`docs/CODING_STANDARDS.md`**:
   [the header](templates/docs/CODING_STANDARDS.md), then
   [the comments section](templates/docs/CODING_STANDARDS.comments.md) when
   `comment_review` is `false`, then the lines from answer D.
8. **Architecture pointer**, when step 1 of measure found an architecture
   doc: one line in `AGENTS.md`, `Architecture: see <path>.`
9. **`.claude/settings.json`**: `"autoMemoryEnabled": false`, and `env`
   `AGENT_READY_ARCHITECTURE_REVIEW_DAYS` from answer J. No-plugin channel
   also:
   - `hooks`: the `hooks` object of `.agents/hooks/hooks.json`, with every
     `"${CLAUDE_PLUGIN_ROOT}"/hooks/` (quoted or not) changed to
     `"$CLAUDE_PROJECT_DIR"/.agents/hooks/`. Inside a JSON string each `"`
     is `\"`. Merge it into existing `hooks`: append each entry to the group
     with the same event and matcher, or add that group. A group without a
     matcher (`SessionStart`, `UserPromptSubmit`) matches one without.
   - `env`: one `CLAUDE_PLUGIN_OPTION_<KEY>` per answer from G, as a string.
   - `enabledPlugins`: `"agent-ready@teclead": false` and
     `"mattpocock-skills@teclead": false`. The copies in `.agents/` replace
     both plugins; a user-scope install left on loads every skill and hook
     twice.
   - `.gitignore`: add `.agents/refactor.local`.
10. **Stubborn: the Superpowers override**, when answer I is Stubborn:
    `docs/agents/superpowers.md` from the template, the `### Superpowers`
    part of the block, `.superpowers/` in `.gitignore`, and the
    `permissions.deny` entries of
    [`settings.superpowers.json`](templates/.claude/settings.superpowers.json)
    merged into `.claude/settings.json`.
11. **Steering gate,** when `steering_gate` is on and answer H exists:
    [`CODEOWNERS`](templates/.github/CODEOWNERS) with the owner,
    [`steering-ruleset.json`](templates/.github/steering-ruleset.json) and
    [`bootstrap-steering-ruleset.sh`](templates/.github/bootstrap-steering-ruleset.sh)
    in `.github/`.

Done when each commit leaves the repo coherent and each written row matches
its answer.

## 4. Verify

- `readlink CLAUDE.md` is `AGENTS.md`; `.claude/skills` resolves.
- Every [pointer](../scan-codebase-for-agents/SKILL.md#pointers) in
  `AGENTS.md` and `docs/agents/*.md` resolves.
- The `check` script finishes with `</dev/null` and exits 0. A red run is a
  finding for the owner, not a reason to change the script.
- `.claude/settings.json` parses as JSON.
- `sh <this skill's folder>/verify-hooks.sh` from the repo root: each line
  reads `ok`. [The script](verify-hooks.sh) runs every hook beside this skill
  (`.agents/hooks/`, or the plugin's) in a throwaway repo, and checks `jq` and,
  on a GitHub remote, `gh auth status`. Each `FAIL` line goes on the gap list.

Done when each check passes or is on the gap list with its output.

## 5. Hand over

- GitHub remote: run [labels.sh](labels.sh), with `--review-only` unless
  answer E is a GitHub tracker with triage labels. It creates the missing
  labels and keeps existing ones.
- Open the pull request. Its body lists what each commit decides, then the
  gap list. The branch touches steering files, so a human merges it.
- Steering gate on: tell the owner to run
  `sh .github/bootstrap-steering-ruleset.sh` once after the merge.
- Answer I is Stubborn: paste [the smoke run](smoke-superpowers.md) into the
  pull request body, and open one tracker issue that links it: "Rerun the
  Superpowers smoke run after each Superpowers update."
- Answer I is migrate: the pull request body and the hand-over say "After
  the merge, type `/adopt-pocock-methodology`
  (`/agent-ready:adopt-pocock-methodology` with the plugin); it runs the
  scan itself." Only a user can invoke it. Neither, and the old setup has
  hits: they say once "Migrate later: run `/adopt-pocock-methodology`."
- Next, unless answer I is migrate: `scan-codebase-for-agents` measures the
  result after the merge.
- No-plugin channel: `update-codebase-for-agents` refreshes the copies later.
- Plugin channel: `/agent-ready:update-codebase-for-agents` moves the repo
  off the plugin at any time. Worth it once someone who works here, a person
  or an AFK runner, has no plugin installed: the copies and the team's switch
  values then come with every clone.
