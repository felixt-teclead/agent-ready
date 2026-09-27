# Subagent brief: one file

**Goal: comments where the code cannot say it.** Two kinds of fact go missing
in bare code. A **precision** fact — a unit, a bound, what null means, a
constraint the code answers to — is fixed with the first of these that works:
a better name, a type, a comment. An **intuition** fact — what a block
accomplishes, so a reader can skip it — has no home but a comment, and a
summary above a large block is one of the most common improvements a codebase
can take. How to word a comment:
[`WRITING.md`](WRITING.md). Calibration:
[`EXAMPLES.md`](EXAMPLES.md).

Input: one `path`, one scratch directory `work`. Sources: the file, its tests,
the callees it imports, the framework's own docs under `node_modules`. Repo
docs are not a source here; a tag that needs one is returned as `DOC?`.

Existing comments stay. An existing comment is a fact the reader already has:
it feeds `DROP`, and a new sentence at the same anchor joins its block rather
than opening a second one.

## 1. Tag

One pass over the file, **before you open a test or a callee**. Reading those
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
of [`interface-slots.md`](../comment-review/interface-slots.md) the types do
not carry is a tag, **whether or not it would surprise anyone**.
`grep -nE '^export' <path>` lists the anchors.

Append to `<work>/tags/<path>.txt`, one block per tag:

```
src/cache.ts:4  return stableStringify(req.body);
  Q  why not JSON.stringify? I would swap it.
```

Done when the file is walked once and every `export` line has had the
checklist read against it.

## 2. Judge

Work through the tags. Establish what is true from the code, its tests and
its callees.

**An interface tag is answered from the call graph, not from the file.** Before
you word an export's contract, find its callers and its siblings:

```bash
grep -rn '<export>' src tests scripts        # every caller, not just the nearest
```

A caller shows which slot is load-bearing and which is incidental. A sibling —
the type this one mirrors, the SQL predicate that repeats this rule — is the
fact the file cannot state: two definitions that must change together. Skip the sweep and the interface block documents the body
instead of the contract. Return a fact that spans files this way as a `DOC?`
block, with the sibling named.

Two exits first, then the ladder. **First rung that fits wins.** Value tags
mostly end in `NAME`, `TYPE` or `DROP`; a comment for nearly every one means
the ladder was skipped.

| exit     | when                                                                                        | reaches the file                 |
| -------- | ------------------------------------------------------------------------------------------- | -------------------------------- |
| `BUG`    | the code contradicts a test, a doc or its own types; a suspicion with no source is `UNSURE` | no — report it                   |
| `UNSURE` | you cannot establish it is true; an interface slot here stays open and the report says so   | no — report it with the question |

| rung    | when                                                                                                                                                        | reaches the file                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `DROP`  | the anchor or its existing comment already says it, a zero-hop callee signature or type says it, or a **framework** default says it and the code follows it | no                                |
| `NAME`  | a rename or an extracted function says it                                                                                                                   | step 4 if file-local, else report |
| `TYPE`  | a type carries it **and the change stays inside the file**: brand the unit, narrow the union, make the null impossible                                      | step 4                            |
| `DOC?`  | the answer may sit in a repo doc: a **shared fact** (a rule other files obey, a contract spanning files, a repo-wide gotcha or trap)                         | no — returned, see below          |
| `WRITE` | none of the above, or the type change would ripple beyond the file                                                                                          | yes — a line at the anchor        |

**Framework default** means you can cite the framework's documented behaviour
and the code follows it. Restating a default turns into a deliberate-looking
exception the day the default moves. Where the code _departs_ from the
default, the same fact is `WRITE`.

**A type change stops at the file.** A brand on an exported signature ripples
into every caller and turns a comment pass into a refactor. When the change
would cross the file, the fact is `WRITE`, one line at the definition of the
value: `// Cents.` above the field or parameter that carries it.

**An interface slot is never `DROP` for being obvious.** A name reduces the
need for an interface comment and never removes it, so `NAME` does not take an
interface tag either. Only `TYPE`, `DOC?` or `WRITE`.

**`DOC?` is judged by whoever holds the docs.** You return it with the fact
you would write and the anchor. It comes back as `DROP` (a repo rule already
states it), as a pointer line to place, or as `WRITE` for you to word.

**An existing comment at the anchor is joined, not doubled.** A `WRITE` at an
anchor that already has a comment adds its sentence to that block. If what you
established contradicts the existing comment, write nothing there and report
it as `MISLEADING` with both versions; correcting a comment is a judgement the
human makes.

**Hard to describe is a design signal.** A fact about this code alone that
you cannot state in a few plain sentences marks a bad abstraction. Report it
as `REDESIGN` with what you tried to say.

A `WRITE` block carries the line you will write and where you established it:

```
src/cache.ts:4  return stableStringify(req.body);
  Q  why not JSON.stringify? I would swap it.
  →  WRITE  tests/cache.test.ts:41
     Gateway field order varies per request.
```

Done when every tag carries an exit or a rung.

## 3. Write

Edit the file, `WRITE` blocks only, per
[`WRITING.md`](WRITING.md). Then re-read each line you wrote
against the code: a named symbol exists and is used as stated, a named key or
flag exists, a stated number or direction holds. A claim you cannot check now is a claim you invented — delete it.

Return, in this order: the tags file path; counts per exit and rung; every
`DOC?` block; every `BUG`, `MISLEADING`, `REDESIGN` and `UNSURE` block; the
`NAME` and `TYPE` blocks, file-local ones marked. Then stop and wait.

## 4. Names and types

On the message that releases it, and not before, so the earlier diff stays
comments-only. Apply the file-local `NAME` and `TYPE` blocks: rename, extract,
brand. Return the list applied.
