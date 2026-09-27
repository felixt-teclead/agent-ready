---
name: comment-write
description: "Called by agent-ready:cleanup during a refactor phase: write the comments a file is missing."
---

**Goal: comments where the code cannot say it.** Two kinds of fact go
missing in bare code. A **precision** fact — a unit, a bound, what null means,
a constraint the code answers to — is fixed with the first of these that works:
a better name, a type, a comment, a pointer to a doc. An **intuition** fact —
what a block accomplishes, so a reader can skip it — has no home but a
comment, and a summary above a large block is one of the most common
improvements a codebase can take. How to word a comment:
[`WRITING.md`](WRITING.md). Calibration: [`EXAMPLES.md`](EXAMPLES.md).

## 1. Set up

`<work>` is a scratch directory outside the repository (`mktemp -d`); nothing
in it is committed.

File set = what the conversation names; inferred rather than read → print,
stop for confirmation. One path per line in `<work>/files.txt`.

Docs = the docs the caller names, else those `cleanup`'s
[Comment pass](../cleanup/SKILL.md#5-comment-pass) names. List their
sections once, with line ranges, so you fetch one section at a time:

```bash
grep -nE '^#{1,4} ' <doc> | tee -a <work>/headings.txt
```

Files that already carry comments stay in the set.

## 2. Tag

One pass per file, **before you open a test, a doc or a callee**. Reading those
first hands you the answers, and an agent that knows the answer stops seeing
the question.

Three lenses. Each yields **every** fact that fires, never the first. Two are
gated and one is a checklist. A body reader can see the code, so a body fact
becomes a tag only when you can name the concrete wrong edit a reader makes
while lacking it; the wrong edit stays in the tag file and never enters a
comment. A caller cannot see the body, so every interface slot the signature
leaves open is a tag. The block summary is the one body fact without a wrong
edit; its gate is size.

**Value** — a constant, a field, a parameter, an assignment. Gated. The wrong
edit hides in:

- unit and currency
- inclusive or exclusive bound
- what null means
- who owns the object
- the invariant the value keeps

**Block** — a head plus a body: a branch, a `catch`, an `await`, a function
body, a loop. The head shows mechanics, the body shows steps, the goal lives
in neither. A block under eight lines is skipped unless it does something
uncommon; from eight lines a summary saves the reading. Ask:

- what does it accomplish that the reader learns only by reading it
- what would a reader add, remove or reorder that the code relies on not
  happening
- what elsewhere must change when this changes
- in a loop: does reordering, parallelising or breaking early go wrong

The first is the summary, admitted by size. The rest are gated.

**Interface** — every export, signature alone. Checklist, not gated: each slot
the types do not carry is a tag, **whether or not it would surprise anyone**.
`grep -nE '^export' <file>` lists the anchors. A slot the signature itself
answers is not a tag: `source: X | null | undefined` already says what null
means, and a sentence saying it back restates the parameter list.

- purpose, when the name does not carry it
- unit and currency
- ownership of the return
- ordering
- what null means
- failure behaviour
- side effects and argument mutation
- preconditions

Append to `<work>/tags.txt`, one block per tag:

```
src/cache.ts:4  return stableStringify(req.body);
  Q  why not JSON.stringify? I would swap it.
```

Done when every file is walked once and every `export` line has had the
checklist read against it.

## 3. Judge

Work through the tags. Establish what is true from the code, its tests and the
docs — one doc section at a time, by the line ranges in `headings.txt`.

**An interface tag is answered from the call graph, not from the file.** Before
you word an export's contract, find its callers and its siblings:

```bash
grep -rn '<export>' src tests scripts        # every caller, not just the nearest
```

A caller shows which slot is load-bearing and which is incidental. A sibling —
the type this one mirrors, the SQL predicate that repeats this rule — is the
fact the file cannot state and the reader most needs: two definitions that must
change together. Skip the sweep and the interface block documents the body
instead of the contract.

Two exits first, then the ladder. **First rung that fits wins.**

| exit     | when                                                                                        | reaches the file                 |
| -------- | ------------------------------------------------------------------------------------------- | -------------------------------- |
| `BUG`    | the code contradicts a test, a doc or its own types; a suspicion with no source is `UNSURE` | no — report it                   |
| `UNSURE` | you cannot establish it is true; an interface slot here stays open and the report says so   | no — report it with the question |

| rung    | when                                                                                                                                  | reaches the file                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `DROP`  | the anchor or its existing comment already says it, a zero-hop callee signature or type says it, or a **nameable** convention says it | no                                |
| `NAME`  | a rename or an extracted function says it                                                                                             | step 5 if file-local, else report |
| `TYPE`  | a type carries it **and the change stays inside the file**: brand the unit, narrow the union, make the null impossible                | step 5                            |
| `WRITE` | none of the above, or the type change would ripple beyond the file                                                                    | yes — a line at the anchor        |

**Nameable** means you can cite the framework's documented default or a repo
rule file, and the code follows it. Restating a default turns into a
deliberate-looking exception the day the default moves. Where the code
_departs_ from the default, the same fact is `WRITE`.

**A type change stops at the file.** A brand on an exported signature ripples
into every caller and turns a comment pass into a refactor. When the change
would cross the file, the fact is `WRITE`, one line at the definition of the
value: `// Cents.` above the field or parameter that carries it.

**An interface slot is never `DROP` for being obvious.** A name reduces the
need for an interface comment and never removes it, so `NAME` does not take an
interface tag either. Only `TYPE` or `WRITE`.

**A `WRITE` is local or it is not.** A fact about this code alone is a comment
at the anchor. A rule other files obey, a contract spanning files, a repo-wide
gotcha, or a trap belongs in one of the docs. The sentence goes there and the
anchor keeps `See <doc> §"<anchor>"`. Either way the anchor ends up with a
line; only its shape differs.

**An existing comment at the anchor is joined, not doubled.** A `WRITE` at an
anchor that already has a comment adds its sentence to that block, so the
anchor keeps one comment with one more fact in it. If what you established
contradicts the existing comment, write nothing there and report it as
`MISLEADING` with both versions; correcting a comment is a judgement the
human makes.

**Hard to describe is a design signal.** A fact about this code alone that
you cannot state in a few plain sentences marks a bad abstraction, not a doc
entry. Report it as `REDESIGN` with what you tried to say.

A `WRITE` block carries the line you will write and where you established it:

```
src/cache.ts:4  return stableStringify(req.body);
  Q  why not JSON.stringify? I would swap it.
  →  WRITE  tests/cache.test.ts:41
     Gateway field order varies per request.
```

Done when every tag carries an exit or a rung.

## 4. Write

Edit each file, `WRITE` blocks only, per [`WRITING.md`](WRITING.md). A doc
sentence goes into the doc in the same pass: an unplaced sentence is a dead
pointer.

Then the gates, in this order:

1. Typecheck and lint, by the names the project manifest gives them.
2. Code identity. This prints every removed line and every added line that is
   not a comment. A removed code line or an added one is a code change; revert
   it. A removed comment line means you reshaped an existing block; confirm
   every word of it survives in the added lines.
   ```bash
   git diff -U0 -- $(cat <work>/files.txt) | grep -E '^-[^-]|^\+[^+]' | grep -vE '^\+\s*(//|/\*|\*|\{/\*)'
   ```
   The last pattern knows `//` and `/* */`; add the file's own comment
   marker (`#`, `--`) for another language.
3. **JSX only.** A `//` in JSX child text renders as page text and passes
   typecheck. If the lint config lacks `react/jsx-no-comment-textnodes`, read
   every `//` you placed in a `.tsx` file and confirm it sits in code, not
   between tags.
4. Re-read each line you wrote against the code: a named symbol exists and is
   used as stated, a named key or flag exists, a stated number or direction
   holds. A claim you cannot check now is a claim you invented — delete it.

Done when all four pass with nothing to fix.

## 5. Names and types

Only after step 4 is clean, so its diff stays comments-only. Apply the `NAME`
and `TYPE` blocks: rename, extract, brand. Run typecheck and lint again. A
`NAME` whose symbol is visible outside the file stays in the report.

## Report

Per file: tags → exits and rungs counted → comments written. Then the
exported `NAME` blocks, `BUG`, `MISLEADING`, `REDESIGN` and `UNSURE` blocks as
a to-do list for a human, and any doc sentence you placed.

**Comments written per body tag** is the number to watch. Value tags should
mostly end in a name, a type or `DROP`; a run that writes a comment for nearly
every one of them skipped the ladder. Block summaries and interface slots are
expected to reach the file.
