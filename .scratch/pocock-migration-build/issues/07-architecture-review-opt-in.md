# 07: Opt in to recurring architecture reviews

**What to build:** Setup asks, in both channels, "Remind the team to run an architecture review every N days?", proposing 7, and writes `AGENT_READY_ARCHITECTURE_REVIEW_DAYS` into committed `.claude/settings.json` `env`. `labels.sh` creates `architecture-review`. A skill-start hook (`PreToolUse` on `Skill` for improve-codebase-architecture, plus `UserPromptSubmit` for the typed command) tells the agent: own branch off `origin/<default>`, PR labelled `architecture-review`. Unset/0/non-number → the hook is silent. Decision: [How the PR hook knows the last architecture review](../../pocock-migration/issues/04-architecture-review-marker.md), [PR hook behaviour](../../pocock-migration/issues/05-pr-hook-behaviour.md). Steering diff (hooks), a human merges.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Setup asks once in both channels and writes the env
- [ ] Label created, kept if present
- [ ] Hook adds context on skill call and on typed command
- [ ] Hook silent when setting unset
- [ ] No-plugin wiring in setup step 9 covers the new hook
