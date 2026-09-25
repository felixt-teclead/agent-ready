---
name: setup-codebase-for-agents
description: "Interview the owner and write the blueprint structure into a codebase."
disable-model-invocation: true
---

<!-- PROTOTYPE for #28, second take. Throwaway. Decisions are in the #28 resolution. -->

# Set up a codebase for agents

Write each row of the [routing table](routing-table.md) from the owner's
answers and the repo's own stack. The file texts are in [templates/](templates/).

**Coherent** means: every pointer resolves, and no file cites a file not yet
written. The repo is coherent after every commit.

The **gap list** holds every row left unwritten, with the reason. An unanswered
row goes there; it never gets a default.

## 1. Measure

On a repo with existing steering content, run the scan steps in
[scan.md](../scan/scan.md) and take its per-row result.
On a fresh repo, read the repo yourself:

- `git remote -v`, the manifest (`package.json`, `pyproject.toml`, ...) and
  its scripts, `README.md`, any architecture doc.
- `AGENTS.md`, `CLAUDE.md`, `.agents/skills/`, `.claude/skills/`,
  `docs/agents/`, `CONTEXT.md`, `docs/adr/`.
- The `userConfig` switches: comments, steering gate.
- Whether the blueprint skills are already available, from the plugin.

Done when every row of the table is marked present, missing, or found elsewhere.

## 2. Interview

Ask only about rows marked missing. One section, one answer, the
recommendation first.

A. **Commands**: which command runs lint, typecheck, test.
B. **README**: does the code need setup before it runs?
C. **Mechanical checks**: for each missing one, report it with the stack's
   usual tool and offer to install it. A decline puts it on the gap list.
D. **Coding conventions**: which mistakes do agents make here?
E. **Tracker**: GitHub (default when the remote is GitHub), local markdown,
   Linear. Triage labels: the five defaults unless the owner overrides them.

Done when every missing row has an answer or a gap-list entry.

## 3. Write

One branch, one pull request, one commit per step. Merge into existing files;
an existing file keeps its text.

1. `AGENTS.md` from its template: single source of truth, the steering rule,
   the agent-skills block. An existing `CLAUDE.md` is renamed to `AGENTS.md`
   and the blocks merged in. `CLAUDE.md` becomes a symlink to it.
2. `.agents/skills/`, with `.claude/skills` as a symlink. Existing
   `.claude/skills/` content moves in unchanged. Without the plugin, copy the
   blueprint skills in from `felixt-teclead/blueprint` and record a hash per
   file in `.agents/skills/.blueprint-manifest.json`.
3. `docs/agents/issue-tracker.md`, `triage-labels.md`, `domain.md` from answer E.
4. `docs/CODING_CONVENTIONS.md`: the header, the lines from answer D, and the
   comment line when the comments switch is off.
5. Commands from answer A into the manifest scripts. `README.md` from answer B.
6. Any tool the owner accepted in answer C: tool, config, script.
7. The architecture pointer line in `AGENTS.md`, when step 1 found an
   architecture doc.
8. `.claude/settings.json`: auto-memory off.
9. Steering gate on: `.github/CODEOWNERS`, `.github/steering-ruleset.json`,
   `.github/bootstrap-steering-ruleset.sh`.

Done when every commit leaves the repo coherent and each written row matches
its answer.

## 4. Verify

- Each command from answer A exits and does not prompt.
- `CLAUDE.md` and `.claude/skills` resolve.

## 5. Hand over

Open the pull request. Its body lists what each commit decides, then the gap
list. The branch touches steering files, so a human merges it.
