---
name: setup-codebase-for-agents
description: Interview the owner and write the agent steering structure into a codebase, new or existing.
disable-model-invocation: true
---

# Set up a codebase for agents

Write each row of the [routing table](routing-table.md) from the owner's
answers and the repo's own stack. The file texts are in
[templates/](templates/).

**Coherent**: every [pointer](pointers.md) resolves, after every commit.

The **gap list** holds every row left unwritten, with the reason. An
unanswered question puts its row on the gap list. It never gets a default.

Changing existing content is the `cleanup` skill's job; this skill writes
what [Write](#3-write) lists.

## 1. Measure

Run [measure.md](measure.md). It gives the channel, the switches, and one
status per row.

Plugin channel switch values, filled in when the skill loads. A value still
in `${…}` form is unset:

- `comment_review`: `${user_config.comment_review}`
- `steering_gate`: `${user_config.steering_gate}`

No-plugin channel with `.agents/agent-ready-manifest.json`: the copies,
this skill among them, are behind when fetch.sh would change them. That is
when a skill or hook file changed on agent-ready's `main` since the
manifest's `"commit"`:

```sh
gh api "repos/felixt-teclead/agent-ready/compare/<commit>...main" \
  --jq '[.files[].filename | select(test("^plugins/agent-ready/(skills|hooks)/"))] | length'
```

prints more than 0, or when the `mattpocock-skills` `ref` in agent-ready's
`.claude-plugin/marketplace.json` differs from the manifest's. Then stop, and
ask the owner to run `/update-codebase-for-agents` first; it brings the new
hooks and settings.

Done when measure.md's Done holds.

## 2. Interview

Ask the section of each `missing` row, and I on its own condition. One
section, one answer, then the next. Put the recommended answer first, so the
owner can accept it in a word.

- **A. Commands.** Which commands run lint, typecheck and test. Then one
  `check` command in the stack's manifest or task runner that runs all
  three. It runs unattended to an exit code, non-zero on a failure, and uses
  only services `docs/agents/environment.md` declares.
- **B. README.** Does the code need setup before it runs? No → no
  `README.md` is written.
- **C. Mechanical checks.** For each missing lint, typecheck or test tool:
  name the stack's usual tool and offer to install it. A decline puts it on
  the gap list.
- **D. Coding standards.** Which mistakes do agents make here? One line
  each. None known → the header only.
- **E. Tracker,** where `/to-tickets` and `/triage` file work: GitHub when
  the remote is GitHub, GitLab when it is GitLab, else local markdown.
  "Other" (Jira, Linear, ...) → the owner describes the workflow in one
  paragraph. Then: "`/triage` sorts issues by five labels, and agents take
  the `ready-for-agent` ones: keep the default names, rename them, or no
  labels?" Recommend the defaults. Renamed: the owner names the string per
  role of [the label table](templates/docs/agents/triage-labels.md); a
  dropped role is `—`.
- **F. AFK environment.** "What does `check` need on a machine with nobody
  at the keyboard (an AFK run): env vars and where their values come from,
  services, hosts it must reach?" Recommend what CI config, `.env.example`
  and compose files show; none found → "none".
- **G. Switches, no-plugin channel only.** Ask [Switches](settings.md#switches).
- **H. Steering owner,** when `steering_gate` is on and the remote is
  GitHub: "Who approves changes to the files that steer agents? A GitHub
  handle or `@org/team` with write access to this repo." Recommend a team,
  or a person other than whoever opens the steering pull requests: GitHub
  never lets an author approve their own pull request. A user handle:
  `gh api repos/<repo>/collaborators/<handle>/permission --jq .permission`
  reads `write` or `admin`; otherwise ask again.
- **I. Framework.** Ask unless the Superpowers row is `home`: keep your
  framework (Superpowers override), migrate to Pocock (when the migration
  skill exists), or neither? Recommend keep when measure found a Superpowers
  trace, else neither. Migrate puts the row on the gap list until
  felixt-teclead/agent-ready#58 ships the skill. Neither leaves the row
  `n/a`.
- **J. Architecture review.** Ask [Review window](settings.md#review-window).

Done when every missing row has an answer or a gap-list entry, and I has an
answer unless the Superpowers row is `home`.

## 3. Write

One branch, `setup-codebase-for-agents`, off `origin/<default>`; one pull
request, one commit per step. Skip a step whose rows are all `home`, `n/a`
or on the gap list. In a step that runs, write its `missing` rows, and, from
its template, the home file of each `misplaced` `fixed` row that has none
yet, so `cleanup` has somewhere to move the statements. Merge into an
existing file at the template's place: it keeps its text. Placeholders in a
template are `<...>`; fill each one, or leave the file out and put its row on
the gap list.

1. **`AGENTS.md`** from [the template](templates/AGENTS.md), without the
   `## Agent skills` block (step 3 adds it) and the `## Verify` section
   (step 4 adds it). An existing `CLAUDE.md` is renamed to `AGENTS.md`
   (`git mv`) and keeps its text. When both exist as files, `CLAUDE.md`'s
   text moves into `AGENTS.md`, each line once. `CLAUDE.md` becomes a
   symlink: `ln -s AGENTS.md CLAUDE.md`.
2. **Skills.** `.agents/skills/`, and `ln -s ../.agents/skills .claude/skills`.
   Existing `.claude/skills/` content moves into `.agents/skills/` unchanged.
   Plugin channel with no skills in the repo: skip this step. No-plugin
   channel: run [fetch.sh](fetch.sh) from the repo root. If it lists
   clashing files, show them to the owner, who renames or deletes them; then
   run it again.
3. **`docs/agents/`** from answer E: `issue-tracker.md` from
   `templates/docs/agents/issue-tracker-<github|gitlab|local>.md`, or from the
   owner's paragraph; `triage-labels.md` only for renamed labels. Add the
   `## Agent skills` block from the template to `AGENTS.md`, without the
   `### AFK runs` part. An existing `## Agent skills` block is updated in
   place. Answer I is keep: also `superpowers.md` from the template, the
   `### Superpowers` part of the block, and `.superpowers/` in `.gitignore`.
   Any other answer: the block goes without the `### Superpowers` part.
4. **Commands** from answer A into the manifest or task runner, and the
   `## Verify` section into `AGENTS.md`. No `check` command → the verify row
   goes on the gap list. **`README.md`** from answer B.
5. **Each tool** the owner accepted in answer C: the tool, its config, its
   script. One commit per tool.
6. **AFK files** from answer F: `docs/agents/environment.md` and
   `docs/agents/afk-handback.md`, plus the `### AFK runs` part of the block.
7. **`docs/CODING_STANDARDS.md`**:
   [the header](templates/docs/CODING_STANDARDS.md), then
   [the comments section](templates/docs/CODING_STANDARDS.comments.md) when
   `comment_review` is `false`, then the lines from answer D.
8. **Architecture pointer**, when measure.md's
   [Inventory](measure.md#2-inventory) lists an architecture doc: one line in
   `AGENTS.md`, `Architecture: see <path>.`
9. **`.claude/settings.json`** as [Settings file](settings.md#settings-file)
   says. Answer I is keep: merge the `permissions.deny` entries of
   [`settings.superpowers.json`](templates/.claude/settings.superpowers.json)
   into existing `permissions.deny`.
10. **Steering gate,** on a GitHub remote, when `steering_gate` is on and
    answer H exists: [`CODEOWNERS`](templates/.github/CODEOWNERS) with
    answer H's handle,
    [`steering-ruleset.json`](templates/.github/steering-ruleset.json) and
    [`bootstrap-steering-ruleset.sh`](templates/.github/bootstrap-steering-ruleset.sh)
    in `.github/`. Other remotes: the Steering approval row goes on the gap
    list; its files are GitHub's, and the `AGENTS.md` rule still holds.

Done when every row left `missing` by the interview is written or on the gap
list with its reason, each commit leaves the repo coherent, and each written
row matches its answer.

## 4. Verify

- `readlink CLAUDE.md` is `AGENTS.md`; `.claude/skills` resolves when
  the Skills step ran.
- Every [pointer](pointers.md) in `AGENTS.md` and `docs/agents/*.md`
  resolves.
- The `check` command finishes with `</dev/null` and exits 0. A red run is a
  finding for the owner, not a reason to change the command.
- `.claude/settings.json` parses as JSON.
- `sh <this skill's folder>/verify-hooks.sh` from the repo root: each line
  reads `ok`. Each `FAIL` line goes on the gap list.

Done when each check passes or is on the gap list with its output.

## 5. Hand over

- GitHub remote: run [labels.sh](labels.sh), with `--review-only` unless
  answer E is a GitHub tracker with triage labels. Each `Failed` line goes
  on the gap list.
- Open the pull request. Its body lists what each commit decides, then the
  gap list. The branch touches steering files, so a human merges it.
- The Steering gate step wrote its files: tell the owner to run
  `sh .github/bootstrap-steering-ruleset.sh` once after the merge.
- Answer I is keep: tell the owner that a Superpowers user runs
  [the smoke run](smoke-superpowers.md) once after the merge, and again
  after each Superpowers update.
- Tell the owner: "After the merge, ask for a scan;
  `scan-codebase-for-agents` names the next change."
- No-plugin channel, tell the owner: "`/update-codebase-for-agents`
  refreshes the copies."
- Plugin channel: `/agent-ready:update-codebase-for-agents` moves the repo
  off the plugin at any time. Worth it once someone who works here, a person
  or an AFK runner, has no plugin installed: the copies and the team's switch
  values then come with every clone.

Done when the pull request is open, and the owner has every line above that
applies, in the pull request body where a line says so.
