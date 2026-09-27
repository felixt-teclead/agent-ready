# Confirmed steps

Claude Code's auto mode may deny some agent actions, and a permission prompt
may too. A **confirmed step** is one of these, in every skill:

- a write to `.claude/settings.json` (self-modification);
- a bulk deletion of user content: `git rm -r` of a folder, `rm -rf`, an
  archive `git mv` (spec folders, retired skills, scratch);
- a push, after auto mode denied one in this run.

Exempt, run without asking: routine pushes, and the state files a skill
owns (the worklist, the phase file, the path list, done files, the
proposals file), written or deleted. An unattended `cleanup` phase runs to
its end.

1. **Show** the owner exactly what it does: the command with its paths, or
   the JSON to add or replace, key by key. Several confirmed steps of one
   row go into one view.
2. **Owner at the keyboard:** ask them to confirm, then run it.
3. **Denied, or nobody at the keyboard:** the owner runs the shown command,
   or writes the shown JSON, on the branch before the merge.

A denied or unconfirmed step is a **gap**, named with what it holds:
"<step> not run (<denied or not confirmed>): <command or JSON>". Its
worklist row, or the skill step it belongs to, stays open, and the next run
offers it again; a run alone names the gap and stops. A denied push is the
exception: the row's work is committed, so the row stays ticked and the
push is the gap. The agent reaches the step's effect only through the step
itself and leaves a denied step to the owner.

Done when each confirmed step ran, or stands as a named gap.
