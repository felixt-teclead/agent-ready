# Comment pass

One comment cleanup over a step's files, run by `cleanup`'s continuous and
fast steps. Whether it runs and how many files it takes:
[phase-files.md](phase-files.md).

1. **Prune.** Run `comment-cleanup` over the files its script parses: `.ts`,
   `.tsx`, `.js`, `.mjs`, `.css`, with `typescript` resolvable from the repo.
   Other files skip it. A `DOCFIX_BLOCK` for a steering file is not applied.
2. **Log.** Append each `KEEP?` row to the log
   ([phase-files.md](phase-files.md)).
3. **Commit** as `docs: comment pass`, with the log and the step's done file:
   the files the pass covered, plus any it could not handle.
4. **Stamp.** The pass stands in for `comment-review` steps 1 to 6 on these
   files: run the command in its
   [Stamp](../comment-review/SKILL.md#7-stamp).
5. **Report** for the PR body, one block:
   - `KEPT`, `CUT` and `FINDINGS` counts.
   - `KEEP?` rows with `file:line`.
   - Skipped files ("not pruned"), files it could not handle ("not passed"),
     and doc fixes left for a human.

Done when every file of the step is in the done file, the stamp is on HEAD,
and the report is ready.
