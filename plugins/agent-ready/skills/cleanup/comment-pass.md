# Comment pass

One full comment pass over a step's files, run by `cleanup`'s continuous
and fast steps. Whether it runs and how many files it takes:
[phase-files.md](phase-files.md).

## Docs

The docs for the pass, given to both skills below:
`docs/CODING_STANDARDS.md`, marked queued, and each file in `docs/adr/`.

A **shared fact** (a rule other files obey, a contract across files, a
repo-wide gotcha or trap) goes into a scoped section of
`docs/CODING_STANDARDS.md` through the [Rule queue](#rule-queue). A decision
goes into an ADR, a new one in `/domain-modeling`'s ADR format. `CONTEXT.md`
holds domain terms only. No fitting home → the fact stays a comment at its
anchor.

## Steps

In this order, over the step's files: Strip and Merge back per file, Write
and Prune once over the whole set.

1. **Strip.** Remove every comment. Keep tool directives (lint, type checker,
   formatter, coverage, licence) and tracked markers (`TODO:`, `FIXME(`). A
   line that held only a comment becomes an empty line. `git show HEAD:<path>`
   keeps the originals.
2. **Write.** Run `orchestrate-comment-write`: file set = the stripped files,
   docs = the [Docs](#docs). Keep its report.
3. **Merge back.** `git diff HEAD -- <path>`: each original comment whose fact
   no written comment carries goes back at its anchor, in its own words.
   Additive only. Then delete each line Strip emptied that is still empty.
   Done when every original comment in the diff is carried by a written
   comment or back at its anchor.
4. **Prune.** Run `comment-cleanup`: file set = the files its script parses,
   docs = the [Docs](#docs), applied = the `NAME` and `TYPE` changes Write
   applied. Keep its report. The script parses `.ts`, `.tsx`, `.js`, `.mjs`
   and `.css` only, and needs `typescript` resolvable from the repo. Other
   files, or no `typescript`: they skip this step and go into the PR body as
   "not pruned".
5. **Gate.** `git diff HEAD` changes only comment lines, the doc sentences
   the pass placed, and lines that differ only by an applied `NAME` or `TYPE`
   that passes the no-op test, as `comment-review`'s
   [Gates](../comment-review/SKILL.md#6-gates) allow. Revert any other code
   line.
6. **Commit** as `docs: comment pass`, with the step's done file
   ([phase-files.md](phase-files.md)): the files the pass covered. A file the
   pass cannot handle (a skill fails on it, or the gate reverts all of it)
   goes into the done file too, and into the PR body as "not passed".
7. **Stamp.** The pass stands in for `comment-review` steps 1 to 6 on these
   files: after the step's last commit, run the command in its
   [Stamp](../comment-review/SKILL.md#7-stamp).
8. **Report.** For the PR body: both skills' to-do lists for a human, the
   `KEEP?` rows, "not pruned" and "not passed". Each sentence Write or Prune
   held back for the queued doc, with its section and anchors, waits for the
   PR number and then becomes a [Rule queue](#rule-queue) item.

Done when every file of the step is in the done file, the stamp is on HEAD,
and the report is ready for the PR body.

## Rule queue

Comment-pass PRs touch no steering file. A shared fact for
`docs/CODING_STANDARDS.md` that has no section yet stays a comment at its
anchors for now. It goes into the parent issue as a checklist item (local
tracker: the parent's ticket file):

```
- [ ] <section>: <the sentence> (<file>, …; #<PR>)
```

A pointer to a section that already exists needs no queue.

**The rule-queue PR**: one `cleanup` PR over the unticked items: each
sentence into its section, the comments at its anchors turned into pointers.
Tick the items with that PR's number (`→ #<PR>`); closed unmerged, it
unticks them. It is a steering diff, so a human merges it; the steps go on
meanwhile. It opens when a merge brings the done files to a multiple of 10;
at End, the End PR carries the items.
