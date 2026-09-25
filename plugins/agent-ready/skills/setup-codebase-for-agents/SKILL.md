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

This skill writes only rows that are missing. Changing existing content is
the `cleanup` skill's job.

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
- **D. Coding conventions.** Which mistakes do agents make here? One line
  each. None known → the header only.
- **E. Tracker.** GitHub when the remote is GitHub, GitLab when it is GitLab,
  else local markdown. "Other" (Jira, Linear, ...) → the owner describes the
  workflow in one paragraph. Triage labels: the five defaults unless the owner
  names others. Domain docs: single-context, unless the repo is a monorepo.
- **F. AFK environment.** Env vars and where their values come from,
  services and network egress the `check` script needs.
- **G. Switches, no-plugin channel only.** `comment_review` (recommend on),
  `steering_gate` (no recommendation: the owner decides), `cleanup_comments`
  (on), `cleanup_comments_max_files` (20). In the plugin channel each user
  set them at install; do not ask.
- **H. Steering owner,** when `steering_gate` is on: a GitHub handle or
  `@org/team` with write access to this repo.

Done when every missing row has an answer or a gap-list entry.

## 3. Write

One branch, one pull request, one commit per step. Skip a step whose rows
are all `home`, `n/a` or on the gap list. Merge into an existing file: it
keeps its text. Placeholders in a template are `<...>`; fill each one, or
leave the file out and put its row on the gap list.

1. **`AGENTS.md`** from [the template](templates/AGENTS.md), without the
   `## Agent skills` block; step 3 adds it. An existing `CLAUDE.md` is
   renamed to `AGENTS.md` (`git mv`) and keeps its text. `CLAUDE.md` becomes
   a symlink: `ln -s AGENTS.md CLAUDE.md`.
2. **Skills.** `.agents/skills/`, and `ln -s ../.agents/skills .claude/skills`.
   Existing `.claude/skills/` content moves into `.agents/skills/` unchanged.
   Plugin channel with no skills in the repo: skip this step. No-plugin
   channel: run [fetch.sh](fetch.sh) from the repo root. If it
   lists clashing files, show them to the owner, who renames or deletes
   them; then run it again.
3. **`docs/agents/`** from answer E: `issue-tracker.md` from
   `templates/docs/agents/issue-tracker-<github|gitlab|local>.md`, or from the
   owner's paragraph; `triage-labels.md`; `domain.md`. Add the
   `## Agent skills` block from the template to `AGENTS.md`, without the
   `### AFK runs` part. An existing `## Agent skills` block is updated in
   place.
4. **AFK files** from answer F: `docs/agents/environment.md` and
   `docs/agents/afk-handback.md`, plus the `### AFK runs` part of the block.
5. **`docs/CODING_CONVENTIONS.md`**:
   [the header](templates/docs/CODING_CONVENTIONS.md), then
   [the comments section](templates/docs/CODING_CONVENTIONS.comments.md) when
   `comment_review` is `false`, then the lines from answer D.
6. **Commands** from answer A into the manifest scripts. **`README.md`** from
   answer B.
7. **Each tool** the owner accepted in answer C: the tool, its config, its
   script. One commit per tool.
8. **Architecture pointer**, when step 1 of measure found an architecture
   doc: one line in `AGENTS.md`, `Architecture: see <path>.`
9. **`.claude/settings.json`**: `"autoMemoryEnabled": false`. No-plugin
   channel also:
   - `hooks`: the `hooks` object of `.agents/hooks/hooks.json`, with every
     `${CLAUDE_PLUGIN_ROOT}/hooks/` changed to
     `"$CLAUDE_PROJECT_DIR"/.agents/hooks/`. Merge it into existing `hooks`.
     With the plugin, write none: each hook would fire twice.
   - `env`: one `CLAUDE_PLUGIN_OPTION_<KEY>` per answer from G, as a string.
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
  except the steering list and the ones a template names as examples.
- The `check` script finishes with `</dev/null` and exits 0. A red run is a
  finding for the owner, not a reason to change the script.
- `.claude/settings.json` parses as JSON.
- No-plugin channel: each hook script runs. For the push gate:
  `echo '{"tool_input":{"command":"git push"}}' | .agents/hooks/comment-review-gate.sh`
  exits 2 until `comment-review` has stamped `HEAD`.

Done when each check passes or is on the gap list with its output.

## 5. Hand over

- GitHub tracker: run [labels.sh](labels.sh). It creates the
  labels that are missing and keeps existing ones.
- Open the pull request. Its body lists what each commit decides, then the
  gap list. The branch touches steering files, so a human merges it.
- Steering gate on: tell the owner to run
  `sh .github/bootstrap-steering-ruleset.sh` once after the merge.
- Next: `scan-codebase-for-agents` measures the result after the merge.
