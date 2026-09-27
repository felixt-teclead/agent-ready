# The conversational entry point

Type: grilling
Status: resolved
Assignee: Efte

## Question

Newcomers to Pocock's methodology face setup's framework question, the migration and its blocks, cleanup modes and settings with no one to ask. Decide what helps them and agents find their way.

## Answer

Decided with the owner on 2026-09-27.

**`/ask-agent-ready`**: a conversational starting point, in `/ask-matt` style. The user states a goal ("we want agents to take tickets unattended", "just fix our docs", "what's next?") or asks where the repo stands. The skill:
- **reads state live**, never stores it: setup ran and its framework answer, migration branch and worklist, running phase and files left, last architecture review, the scan's three numbers;
- **answers what happened, what is next and why**, with one recommended next step plus alternatives, each as the command to type;
- **explains tradeoffs**: keep vs migrate vs neither, full migration vs single blocks, wait vs stack, fast vs continuous; costs from the verum trial;
- **routes**: "which skill fits my next task?" → `/ask-matt`; deeper learning → `/teach`.

**Stance it states**: for a team to work best and parallelize the most, a full migration makes the most sense: one methodology, one `CONTEXT.md`, clean docs, so AFK agents can take tickets unattended. A partial start is fine: run single blocks one at a time, compare the scan's numbers before and after, and see how agents perform before doing the rest.

**Homes**: the tradeoffs and the reasons ("why") live only in this skill (a `WHY.md` beside it, since decisions in `.scratch/` never ship). Setup's framework question and the migration point to it ("Unsure? Run `/ask-agent-ready`"). It points at other skills' steps, never restates them.

**Invocation**: users and agents. An agent that meets unfamiliar state (a phase file, a worklist, a kept framework) orients itself without a human.
