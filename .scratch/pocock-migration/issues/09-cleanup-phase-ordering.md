# How a running cleanup phase meets the migration

Type: grilling
Status: open

## Question

The migration's comment pass is a `cleanup` fast phase (see [How /writing-for-agents shapes the doc-cleanup step](03-doc-cleanup-step.md)). Decide what happens when the repo already has a phase running (`.agents/refactor.md` exists, continuous or fast, maybe paused): the migration stops, pauses it, or takes over its path list. Also decide whether anything is left for a `cleanup` phase after the migration merges.
