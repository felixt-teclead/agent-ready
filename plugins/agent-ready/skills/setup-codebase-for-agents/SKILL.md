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

Run [measure.md](measure.md). It gives the channel, the switches, and one
status per row.

Plugin channel switch values, filled in when the skill loads. A value still
in `${…}` form is unset:

- `comment_review`: `${user_config.comment_review}`
- `steering_gate`: `${user_config.steering_gate}`
- `cleanup_comments`: `${user_config.cleanup_comments}`
- `cleanup_comments_max_files`: `${user_config.cleanup_comments_max_files}`

Done when every row and every old file found has a status.

## 2. Interview

Ask only about rows marked `missing`. One section, one answer, then the
next. Put the recommended answer first, so the owner can accept it in a word.

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
- **I. Framework.** Ask unless the Superpowers row is `home`: keep your
  framework (Superpowers override), migrate to Pocock (when the migration
  skill exists), or neither? Recommend keep when measure found a Superpowers
  trace, else neither. Migrate puts the row on the gap list until
  felixt-teclead/agent-ready#58 ships the skill. Neither leaves the row
  `n/a`.
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
   `### AFK runs` part. An existing `## Agent skills` block is updated in
   place. Answer I is keep: also `superpowers.md` from the template, the
   `### Superpowers` part of the block, and `.superpowers/` in `.gitignore`.
   Any other answer: the block goes without the `### Superpowers` part.
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
   `AGENT_READY_ARCHITECTURE_REVIEW_DAYS` from answer J. Answer I is keep:
   merge the `permissions.deny` entries of
   [`settings.superpowers.json`](templates/.claude/settings.superpowers.json)
   into existing `permissions.deny`. No-plugin channel also:
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
10. **Steering gate,** when `steering_gate` is on and answer H exists:
    [`CODEOWNERS`](templates/.github/CODEOWNERS) with the owner,
    [`steering-ruleset.json`](templates/.github/steering-ruleset.json) and
    [`bootstrap-steering-ruleset.sh`](templates/.github/bootstrap-steering-ruleset.sh)
    in `.github/`.

Done when each commit leaves the repo coherent and each written row matches
its answer.

## 4. Verify

- `readlink CLAUDE.md` is `AGENTS.md`; `.claude/skills` resolves.
- Every path in backticks in `AGENTS.md` and `docs/agents/*.md` exists,
  except the steering list, the ones a template names as examples,
  gitignored paths, and the domain files (`CONTEXT.md`, `CONTEXT-MAP.md`,
  `docs/adr/`), which skills create when a term or decision first needs a
  home.
- The `check` script finishes with `</dev/null` and exits 0. A red run is a
  finding for the owner, not a reason to change the script.
- `.claude/settings.json` parses as JSON.
- `command -v jq` and `gh auth status` succeed: the hooks need both.
- No-plugin channel: each hook script runs, from the repo root.
  - Push gate:
    `echo '{"tool_input":{"command":"git push"}}' | .agents/hooks/comment-review-gate.sh`
    exits 2 until `comment-review` has stamped `HEAD`.
  - Steering gate:
    `echo '{"tool_input":{"command":"gh api -X PUT repos/o/r/pulls/1/merge"}}' | .agents/hooks/steering-merge-gate.sh`
    exits 2, or 0 when `steering_gate` is `false`.
  - Review branch:
    `echo '{"prompt":"/improve-codebase-architecture"}' | AGENT_READY_ARCHITECTURE_REVIEW_DAYS=7 .agents/hooks/architecture-review-branch.sh | grep -q architecture-review/`
    exits 0.
  - PR reminder, against a stub `gh` that finds no review, prints `pass`:

    ```sh
    stamp="$(git rev-parse --git-common-dir)/agent-ready-review-offered"
    stub=$(mktemp -d); printf '#!/bin/sh\necho 0\n' >"$stub/gh"; chmod +x "$stub/gh"
    in='{"hook_event_name":"PostToolUse","tool_input":{"command":"gh pr create"},"tool_response":{"stdout":"https://github.com/o/r/pull/1"}}'
    rem() { echo "$in" | PATH="$stub:$PATH" AGENT_READY_ARCHITECTURE_REVIEW_DAYS=7 .agents/hooks/architecture-review-reminder.sh; }
    rm -f "$stamp"
    rem | grep -q improve-codebase-architecture && [ -f "$stamp" ] && [ -z "$(rem)" ] && echo pass
    rm -f "$stamp"
    ```

Done when each check passes or is on the gap list with its output.

## 5. Hand over

- GitHub remote: run [labels.sh](labels.sh), with `--review-only` unless
  answer E is a GitHub tracker with triage labels. It creates the missing
  labels and keeps existing ones.
- Open the pull request. Its body lists what each commit decides, then the
  gap list. The branch touches steering files, so a human merges it.
- Steering gate on: tell the owner to run
  `sh .github/bootstrap-steering-ruleset.sh` once after the merge.
- Answer I is keep: tell the owner that a Superpowers user runs
  [the smoke run](smoke-superpowers.md) once after the merge, and again
  after each Superpowers update.
- Next: `scan-codebase-for-agents` measures the result after the merge.
- No-plugin channel: `update-codebase-for-agents` refreshes the copies later.
- Plugin channel: `/agent-ready:update-codebase-for-agents` moves the repo
  off the plugin at any time. Worth it once someone who works here, a person
  or an AFK runner, has no plugin installed: the copies and the team's switch
  values then come with every clone.
