# 18: /ask-agent-ready, the conversational entry point

**What to build:** A skill `ask-agent-ready`, per [The conversational entry point](../../pocock-migration/issues/14-ask-agent-ready.md): the user states a goal or asks "what's next?"; it reads the repo's state live, says what happened, what is next and why, recommends one next step with alternatives, explains tradeoffs, and routes to `/ask-matt` or `/teach`. It states the stance: full migration serves team parallelization and automation best; partial, block-by-block starts are fine to measure performance first. A `WHY.md` beside it holds the reasons, condensed from the map's decisions. Setup's framework question and the migration point to it. Content on where newcomers stumble comes from the review's "Against the goal" sections (`/tmp/pocock-review/`) and the verum trial metrics.

**Blocked by:** the fix pass (review findings applied)

**Status:** ready-for-agent

- [ ] Answers "what's next?" from live state on a fresh, a half-migrated and a migrated repo
- [ ] States the full-vs-partial stance with a suggested partial order and how to measure it
- [ ] Tradeoffs and reasons live only here; setup and migration point to it
- [ ] Agent-invokable; restates no other skill's steps
