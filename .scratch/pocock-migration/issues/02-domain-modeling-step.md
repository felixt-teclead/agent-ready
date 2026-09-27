# What /domain-modeling produces during migration

Type: grilling
Status: resolved
Blocked by: 01

## Question

What does `/domain-modeling` produce as the first migration step? Decide its inputs (the old framework's plans, specs, docs), its outputs (`CONTEXT.md`, ADRs), and when the step counts as done so doc cleanup can start.

## Answer

Grilled with the owner on 2026-09-27.

**Invocation**: all four Pocock skills set `disable-model-invocation: true`. At migration start the skill copies three of them without the flag (not `/ask-matt`, which only the user runs, see [How /writing-for-agents shapes the doc-cleanup step](03-doc-cleanup-step.md)) into `.claude/skills/migrate-<name>/`, so agents can invoke them. The pinned files stay unchanged. The plugin copies because the repo must keep working when the plugin is switched off (see [What the repo keeps so the plugin can be switched off](07-plugin-switch-off.md)). The last commit deletes the copies, so the skills become human-only again.

**Branch and state**: one migration branch, one PR (the steering PR, see [How a running cleanup phase meets the migration](09-cleanup-phase-ordering.md)), one commit per step. The worklist and the `migrate-*` copies are committed on the branch and removed before the PR. An abandoned branch keeps its state and never touches `main`, so there is nothing to clean up.

**Inputs**, by rank:
1. Code: the truth for behaviour and decisions.
2. Existing `CONTEXT.md` and ADRs, checked against the code.
3. Specs, plans, architecture docs: mined for language only, how people inside and outside the code name things.

A behaviour conflict between a spec and the code: the code wins, no question. A naming conflict: the user decides. The step always runs, even without specs.

**Worklist**: one row per source doc plus one per top-level code area. It can span several sessions.

**Outputs**:
- `CONTEXT.md` terms. The agent groups proposed entries by domain topic. Per topic, the user approves, edits or strikes each entry. Nothing unapproved is written.
- ADRs, with `/domain-modeling`'s three-part bar unchanged. A spec decision that fails the bar is dropped. It becomes an ADR only if the code still shows it.
- Unfinished plans: the agent proposes candidates from unchecked plan items, checked against the code. The user confirms. They are filed in the repo's tracker, labelled `needs-triage`, not via `/to-tickets`.

**Local wording**: a developer can override terms in a gitignored `CONTEXT.local.md` (canonical term → personal term). The agent uses the personal term only when talking to that developer. Code, commits, issues, PRs and ADRs keep the canonical term. Step 1 does not create the file.

**Fit check**: step 1 flags `CONTEXT.md` entries with implementation detail, ADRs that fail the bar, and terms defined twice. It proposes a fix for each, then asks fix-or-keep for what remains. Kept items are listed in the PR as known deviations.

**Done**: every worklist row is done, the fit check is answered, and the user has answered delete-or-archive for each folder.

**Settings**: asked once at the start, with defaults shown. Shown again at the end, where the user can still change them, with emphasis on choices that only make sense after the work: delete or archive specs, scratch or keep architecture docs. Architecture docs default to scratch: step 1 mines them, step 2 deletes them. Settings live in the worklist, not `userConfig`, which is kept for recurring settings.
