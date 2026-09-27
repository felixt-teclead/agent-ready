---
name: setup-codebase-for-agents
description: Interview the owner and write the agent steering structure into a codebase, new or existing. User-invoked, once per repo.
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

Done when every row is `home`, `misplaced`, `missing`, `n/a` or
`not measured`.

## 2. Interview

Ask only about rows marked `missing`. One section, one answer, then the
next. Put the recommended answer first, so the owner can accept it in a word.

- **A. Commands.** Which commands run lint, typecheck and test. Then one
  `check` script in the manifest that runs all three. It exits non-zero on a
  failure, never prompts or watches, and needs no service that
  `docs/agents/environment.md` does not declare.
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
- **G. Switches, no-plugin channel only.** `comment_review` (recommend on),
  `steering_gate` (no recommendation: the owner decides), `cleanup_comments`
  (on), `cleanup_comments_max_files` (10). In the plugin channel each user
  set them at install; do not ask.
  Both channels, unless `env` already sets it: "Remind the team to run an
  architecture review every N days?" (7). The cadence is a team decision, so
  it lives in `env`, not `userConfig`. No → leave it unset.
- **H. Steering owner,** when `steering_gate` is on: a GitHub handle or
  `@org/team` with write access to this repo.
- **I. Migration,** when measure.md §4 lists hits: "Migrate your current
  setup to Pocock's methodology?", listing the hits.

Done when every missing row has an answer or a gap-list entry.

## 3. Write

One branch, one pull request, one commit per step. Skip a step whose rows
are all `home`, `n/a` or on the gap list. Merge into an existing file: it
keeps its text. Placeholders in a template are `<...>`; fill each one, or
leave the file out and put its row on the gap list.

1. **`AGENTS.md`** from [the template](templates/AGENTS.md), without the
   `## Agent skills` block (step 3 adds it) and the `## Verify` section
   (step 4 adds it). An existing `CLAUDE.md` is renamed to `AGENTS.md`
   (`git mv`) and keeps its text. `CLAUDE.md` becomes a symlink:
   `ln -s AGENTS.md CLAUDE.md`.
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
   place.
4. **Commands** from answer A into the manifest scripts, and the
   `## Verify` section into `AGENTS.md`. **`README.md`** from answer B.
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
   `AGENT_READY_ARCHITECTURE_REVIEW_DAYS` from answer G as a string. No-plugin
   channel also:
   - `hooks`: the `hooks` object of `.agents/hooks/hooks.json`, with every
     `${CLAUDE_PLUGIN_ROOT}/hooks/` changed to
     `"$CLAUDE_PROJECT_DIR"/.agents/hooks/`, which is
     `\"$CLAUDE_PROJECT_DIR\"/.agents/hooks/` inside the JSON string. Merge
     it into existing `hooks`: append each entry to the group with the same
     event and matcher, or add that group. A group without a matcher
     (`SessionStart`, `UserPromptSubmit`) matches one without.
     With the plugin, write none: each hook would fire twice.
   - `env`: one `CLAUDE_PLUGIN_OPTION_<KEY>` per switch answer from G, as a
     string.
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
  except the steering list, the ones a template names as examples, and the
  domain files (`CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/`), which skills
  create when a term or decision first needs a home.
- The `check` script finishes with `</dev/null` and exits 0. A red run is a
  finding for the owner, not a reason to change the script.
- `.claude/settings.json` parses as JSON.
- No-plugin channel: each hook script runs. For the push gate:
  `echo '{"tool_input":{"command":"git push"}}' | .agents/hooks/comment-review-gate.sh`
  exits 2 until `comment-review` has stamped `HEAD`. For the review branch:
  `echo '{"prompt":"/improve-codebase-architecture"}' | AGENT_READY_ARCHITECTURE_REVIEW_DAYS=7 .agents/hooks/architecture-review-branch.sh`
  prints the branch and label instruction. For the PR reminder:
  `echo '{"hook_event_name":"PostToolUse","tool_input":{"command":"gh pr create"},"tool_response":{"stdout":"https://github.com/o/r/pull/1"}}' | AGENT_READY_ARCHITECTURE_REVIEW_DAYS=7 .agents/hooks/architecture-review-reminder.sh`
  prints the offer, or nothing when a review PR merged in the last 7 days.
  A second run prints nothing. Then
  `rm "$(git rev-parse --git-dir)/agent-ready-review-offered"`.

Done when each check passes or is on the gap list with its output.

## 5. Hand over

- GitHub tracker with triage labels: run [labels.sh](labels.sh). It
  creates the labels that are missing, with the strings from
  `triage-labels.md` when that file exists, and keeps existing ones.
- Open the pull request. Its body lists what each commit decides, then the
  gap list. The branch touches steering files, so a human merges it.
- Steering gate on: tell the owner to run
  `sh .github/bootstrap-steering-ruleset.sh` once after the merge.
- Scan: ask the owner to say when the pull request is merged. Then update
  the default branch and run `scan-codebase-for-agents` on it.
- No-plugin channel: `update-codebase-for-agents` refreshes the copies later.
- Answer I yes: after the merge, ask the owner to type
  `/adopt-pocock-methodology`. No: the pull request body and the hand-over
  say once "Migrate later: run `/adopt-pocock-methodology`."
