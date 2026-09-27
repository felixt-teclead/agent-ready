# What each block does when run alone

Type: grilling
Status: resolved
Assignee: Efte

## Question

Walk the five paths (full migration, cleanup while staying on Superpowers, docs only, domain modeling only, architecture only) and fix what breaks when a block runs alone. Also: are the `migrate-*` copies still needed?

## Answer

Grilled with the owner on 2026-09-27.

**"Old setup found" is a report line, not a scan class.** A class would make "run the migration" the next step forever for a repo that stays on Superpowers, and the phase offer would never come. The line names the hits and the migration skill. Replaces the class in [How a user starts the migration later](08-later-entry-point.md).

**`route-codebase-docs` alone**: domain terms always go to `CONTEXT.md`. Framework sections are routed like any statement and never deleted by default; deleting them is the migration's job after the preflight.

**`model-codebase-domain` with an active framework** (the inventory still finds it): fold only finished specs and plans. Each unfinished plan stays in place and gets a `needs-triage` issue "Fold and remove `<plan>` once it finishes". Nothing is written into the plan file.

**Commits**: a block commits per worklist row on its own branch, so a session can resume. Replaces "one commit per step" in [What /domain-modeling produces during migration](02-domain-modeling-step.md).

**No `migrate-*` copies.** At the pin v1.2.3 only `improve-codebase-architecture` and `ask-matt` set `disable-model-invocation`; `domain-modeling` and `writing-for-agents` are agent-callable. Step 3 is only offered: on a yes the agent opens the worktree and the user types `/improve-codebase-architecture` (the skill-start hook covers typed commands). Same for the PR reminder's yes. Replaces the copy mechanism in [What /domain-modeling produces during migration](02-domain-modeling-step.md). Risk: a later pin adds the flag; the pin moves only through `update-codebase-for-agents`, whose PR shows it.
