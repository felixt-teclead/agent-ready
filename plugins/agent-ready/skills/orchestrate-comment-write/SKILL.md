---
name: orchestrate-comment-write
description: "Called by agent-ready:cleanup during a refactor phase: write missing comments over a set of files, one subagent per file."
---

You hold the repo docs; the subagents hold one file each and never open a
doc. They return every tag whose answer may sit in a doc, you judge those in
one batch, write each doc sentence once, and place the pointers.

Leave the changes uncommitted; git is the undo.

## 1. Set up

`<work>` is a scratch directory outside the repository (`mktemp -d`); nothing
in it is committed.

File set = what the conversation names; inferred rather than read → print,
stop for confirmation. One path per line in `<work>/files.txt`.

Docs = the architecture doc `CLAUDE.md` names (else `docs/ARCHITECTURE.md`).
List their sections once, with line ranges, so you fetch one section at a time:

```bash
grep -nE '^#{2,4} ' <doc> | tee -a <work>/headings.txt
```

Done when `files.txt` is confirmed and `headings.txt` covers every doc.

## 2. Dispatch

One subagent per file, all in one message so they run in parallel. Keep each
alive; step 5 sends it a second message. The brief is the path to the skill
plus values, nothing else:

> Read `<this skill>/subagent.md` and run it. `path` = `<file>`,
> `work` = `<work>`.

Done when every subagent has returned.

## 3. Judge `DOC?`

Collect every `DOC?` block. Group by fact, not by file: two blocks that state
the same rule are one group. For each group, find the section that states it,
by the line ranges in `headings.txt`, one section at a time.

**Judge a block that names a sibling first.** A sibling is a second definition
of the same rule: a type this one mirrors, a SQL predicate that repeats it in a
migration, another reader of the same column. One file cannot state this fact.
A reader who changes one definition and leaves the other breaks the pair. Write
a doc sentence that names both definitions and says they change together. Place
the pointer at every anchor in the group, the sibling's own file included.

A subagent sees one file and cannot find these. When a group has one member and
the fact smells cross-file — a predicate, an enum, a column, a shape another
writer also produces — sweep for the sibling yourself before you judge:

```bash
grep -rn '<symbol>' src tests scripts
```

| outcome                        | when                                                                      | you do                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `DROP`                         | a repo rule file states it and the code follows it                        | nothing                                                                                             |
| pointer                        | a doc section states it, or the fact is a rule, contract, gotcha or trap  | write the sentence into the section if absent; place `See <doc> §"<anchor>"` at every anchor in the group |
| `WRITE`                        | no doc states it and it is true of that one file alone                    | send the block back to its subagent as `WRITE`                                                      |

Pointer rules and doc-entry form: [`WRITING.md`](../comment-write/WRITING.md) §"Pointers".

Done when every `DOC?` block has an outcome.

## 4. Gates

Run once, over the whole set, after step 3 has placed its lines:

1. Typecheck and lint, by the names `package.json` gives them.
2. Code identity. This prints every removed line and every added line that is
   not a comment. A removed code line or an added one is a code change; revert
   it. A removed comment line means a block was reshaped; confirm every word of
   it survives in the added lines.
   ```bash
   git diff -U0 -- $(cat <work>/files.txt) | grep -E '^-[^-]|^\+[^+]' | grep -vE '^\+\s*(//|/\*|\*|\{/\*)'
   ```
3. **JSX only.** A `//` in JSX child text renders as page text and passes
   typecheck. If the lint config lacks `react/jsx-no-comment-textnodes`, read
   every added `//` in a `.tsx` file and confirm it sits in code, not between
   tags.

Done when all three pass with nothing to fix.

## 5. Names and types

Send every subagent with file-local `NAME` or `TYPE` blocks one message:
apply them. Then typecheck and lint again.

## Report

Per file: tags → exits and rungs counted → comments written. Then the doc
sentences you placed with their sections, the exported `NAME` blocks, and
every `BUG`, `MISLEADING`, `REDESIGN` and `UNSURE` block as a to-do list for
a human.

**Comments written per body tag** is the number to watch. Value tags should
mostly end in a name, a type or `DROP`; a run that writes a comment for nearly
every one of them skipped the ladder. Block summaries and interface slots are
expected to reach the file.
