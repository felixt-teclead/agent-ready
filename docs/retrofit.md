# Retrofit an existing repo

This is the procedure for adopting the blueprint conventions in a repo that
already has documentation. A new repo does not need it. Generate from the
template instead, as `README.md` describes.

Point an agent at this file. The target repo needs no blueprint file to start.

## How it runs

Seven stages, in order. Each stage is one pull request, and each one leaves the
repo coherent, so you can stop after any of them. The order starts with
measurement, continues with files that enforce nothing, and ends with the checks
that fail a build.

Record any stage you skip in the baseline report, with the reason.

## What this procedure never does

- It does not overwrite a file that already exists.
- It does not move or rename an existing doc.
- It does not split a doc. A split is a judgment call, and a human confirms it.
- It does not delete `.claude/rules/`. Read "Path-scoped rules" below.

## Stage 1, measure

Write `docs/research/retrofit-baseline.md` before you change anything. Every
later claim is measured against these numbers.

Five measurements, all mechanical:

1. **Citation failures.** Run the doc guard in report mode over the repo. Keep
   the tuned defaults, so bare directory citations stay off.
2. **Line count per doc**, against the 400-line prompt.
3. **Inbound pointers per doc.** Count the files that cite each doc. A doc with
   no inbound pointer is a candidate for deletion. A doc with many is expensive
   to move.
4. **Anchored citations.** Count the lines that carry an anchor, and split the
   count into live docs and dated records. This number sizes Stage 3. Verum has
   1326 such lines in 446 files, and 667 of them in 256 live files.
5. **Rule files without a `paths:` list.** Such a file never loads by itself,
   whatever it says about its own scope.

Also list, and do not act on, the docs that the blueprint taxonomy does not
name, and any steering mechanism the blueprint drops.

## Stage 2, land the inert steering files

These files enforce nothing, so they cannot break a build.

- `docs/agents/coding-standards.md`, `docs/agents/issue-tracker.md`,
  `docs/agents/triage-labels.md`
- The `CLAUDE.md` blocks: the single-source-of-truth rule, the comment rules,
  the code-review pointer, and the skill pointers.

**Merge, do not copy.** Create a file that does not exist from the template
copy. A file that exists keeps its text, and you merge the required block into
it. A repo with 2365 commits holds knowledge in `CLAUDE.md` that nothing else
records.

## Stage 3, strip the anchors

A citation names a file, and the agent searches inside it. `See
docs/architecture/crypto.md §"Key rotation"` becomes
`docs/architecture/crypto.md`.

This is its own pull request, because the edit is mechanical and large. It
touched 256 files in verum. Mixed into Stage 2 it would hide the merge of the
steering blocks.

Skip the dated records. A meeting note or a closed ticket records what someone
wrote then, and the citation style of a record is not a live instruction. Use
the same list of paths that Stage 5 exempts.

## Stage 4, CONTEXT.md

`CONTEXT.md` owns every definition, once. A wrong definition spreads to every
doc that cites it, so a human confirms this file.

Run `/domain-modeling` with a human. That is the best case, because the
interview finds two words for one thing and merges them.

If there is no time for the interview, do this instead:

1. Draft `CONTEXT.md` from `README.md`, the architecture index, and any data
   dictionary the repo carries.
2. Say in the first line that it is a draft.
3. List the synonym pairs you found but could not merge. That list is the agenda
   for the interview, and it is hard to rebuild later.
4. Point at the draft from `CLAUDE.md`.

Put no marker anywhere else.

## Stage 5, guards as a warning

Copy `.github/workflows/doc-guards.yml` and `doc-guards.config.json`. The
workflow calls the published guard package with `npx`. It does not copy the
script into the repo.

Tune the config before you judge the result. Three keys carry the repo's shape:
`scan.exempt` for the dated records, `citations.resolveRoots` for a citation
form the repo writes that is not repo-relative, and `citations.minCitations` for
the vacuity floor, set near the measured count.

Add the repo's dated records to `scan.exempt` with a reason each. Meeting notes,
audits, changelogs, planning docs, and research are records of what was true
then, not live instructions.

Then seed the exemption list from what still fails. Write one entry per failure,
and give every entry the same reason string, `retrofit baseline <date>`. That
string is true, it greps as one group, and it reads as debt. Do not invent a
reason per entry.

Expect a short list, or none. A tuned guard found 1 broken citation in 141 over
verum, a repo with 2365 commits. The seeded list is a safety valve, not the
normal case. If the list runs to hundreds of entries, the config is wrong, not
the repo.

**A repo without Node may skip this stage.** The guard runs by `npx`, so a
Python or Go repo installs Node in CI to get it. There is no second
implementation. You lose the only mechanical check in the payload, so a doc that
moves or is deleted takes its inbound pointers down without warning.

## Stage 6, guards as a blocking check

Make the guard a blocking check in the next pull request. Do not wait for an
empty exemption list. The list is green from its first commit, and the guard
must stop the next broken citation, not the old ones.

Pay the list down by deleting entries. An agent may delete an entry it has
fixed. An agent does not add one.

## Stage 7, architecture docs

Measure and report. Do not split.

`docs/ARCHITECTURE.md` is flat until the first split. If the repo is already
split, the index lists every file under `docs/architecture/` and nothing else.

Report every doc over 400 lines and stop there. The prompt then fires on the
next edit to each file, when someone already reads it. A retrofit that asks for
seven splits at adoption time does not finish.

### If a human confirms a split

Three steps. The first two protect the text, and the third protects the reader.

1. **Line-range manifest.** Name the destination file for every line of the
   source. Every line is covered exactly once.
2. **Line-identical reconstruction.** Concatenate the destinations in manifest
   order and diff against the source. The diff must be empty.
3. **Inbound-pointer census.** Before the split, list every reference into the
   source doc. Record its path, and the subject terms of anything the source is
   cited for. After the split, check that each pointer resolves to a file that
   holds its subject.

Step 3 exists because steps 1 and 2 are not enough. A verum split covered lines
1 to 4770 exactly once and reconstructed line-identical, and it still dropped a
rule that five code comments pointed at. Reconstruction proves that no line left
the union of the parts. It does not prove that a line reached a file someone
reads.

## Path-scoped rules

A repo with `.claude/rules/` keeps them for now. The blueprint ships none in
version 1, but removing a working mechanism from a live repo is a content
decision per file, not a step in a procedure.

Report them in the baseline. List each rule file, its globs, and the files that
cite a rule whose globs miss them. Verum has 20 such files, so the agent that
edits them never loads the rule it is told to follow. Verum also has one rule
file with no `paths:` list at all, which no glob ever loads, and 179 files cite
a rule file by name.

When you retire a rule file, the pointer census from Stage 7 says where its
content must land. Sort by trigger: review guidance to
`docs/agents/coding-standards.md`, mechanism to the matching architecture doc,
and always-true text to `CLAUDE.md`. Content that fits none of the three is
dead.
