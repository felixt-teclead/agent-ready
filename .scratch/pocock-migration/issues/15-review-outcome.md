# What the deep review changed

Type: grilling
Status: resolved
Assignee: Efte

## Question

Five reviewers (findings in `/tmp/pocock-review/{A..E}-*.md`, 117 findings, 10 blockers) checked PR #72 against the spec and against the goal: company teams, mostly new to Pocock, move to one methodology so agents work unattended as much as possible. Decide the open questions.

## Answer

Decided with the owner on 2026-09-27.

1. **Split PR #72** by risk: **A** architecture-review hooks, cap, move off the plugin; **B** cleanup cycle; **C** migration skills and `/ask-agent-ready`, merged only after an end-to-end trial.
2. **Old setup = replacement or routing.** A hit is an item that duplicates a Pocock or agent-ready step, or routes the agent through another framework. Repo-specific skills, hooks and tool plugins are never hits. Specs = folders named for specs, plans or designs; `docs/archive/` is excluded. **Context polluters** (old specs, plans, design docs) are *suggested* for removal after folding, never forced.
3. **Accepted deviations** live in a committed `.agents/deviations.md`. The scan skips them; `cleanup` never "fixes" them.
4. **Overridden, not kept.** A framework with an override is listed as `overridden`, report-only in the scan. On migration, retire removes the override and sets the framework `false` in project `enabledPlugins`; the PR tells teammates to uninstall user-scope copies.
5. **Stop and resume after the preflight**, so the retired framework stops steering.
6. **Signal-based blocks.** The migration runs only blocks whose signal is missing. With `CONTEXT.md` present, `model-codebase-domain` checks it for completeness against earlier material (specs, plans, ADRs, prior discussions) and proposes only what is missing.
7. **Framework question**: recommend *migrate*. The alternative is named **Stubborn** (keep Superpowers with the override), described seriously; the text says a full migration serves parallel work best.
8. **Architecture reminder**: the window is a routing row, asked in both channels and by the migration; "No" is `"0"`. Only the `UserPromptSubmit` trigger (the `Skill` entry can never fire). Interactive sessions only. Stamp per clone (`--git-common-dir`). Setup always creates the label.
9. **No double install**: a no-plugin setup sets `agent-ready` `false` in project `enabledPlugins`.
10. **Agents merge their own `cleanup` PRs** when the diff touches no steering file, `comment-review` stamped it and `check` is green.
11. **Comment pass**: writes the review stamp for its own PR; no cap in continuous mode; the phase file records `comments:` and `cap:` as team values.
12. **Comment-pass facts** go to `docs/CODING_STANDARDS.md` (rules, traps) and ADRs (decisions), never `CONTEXT.md` or a deleted `ARCHITECTURE.md`.
13. **#73's escalation accepted**: a one-step `cleanup` may start a phase when a step is too big. Supersedes "only the scan decides" in [Which parts of the migration run on their own](10-building-blocks.md).
14. **Scan report line** `comments  full pass not run: cleanup` on a green repo that never ran a phase. Report only.

15. **Steering rules in fast mode are batched** (decided after PR B's verification): comment-pass PRs never touch steering files; discovered `CODING_STANDARDS.md` rules queue as a checklist in the phase's parent issue and land in one human-merged steering PR every 10 fast steps and at the phase end. Class steps that must edit steering files stay one human-merged PR each.

Plus fixes with no decision: references by heading name, never § or class numbers; deleted paths leave "files left"; `Part of #<parent>` instead of sub-issues (GitHub caps at 100); a sharper dead-pointer rule; `CONTEXT.md` protected when homes are rebuilt; quoted `hooks.json` paths.
