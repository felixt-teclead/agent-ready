# Comment rules

## The no-op test comes first

Delete the comment. If no reader would now make a different edit, it goes.
Every other rule applies only to a comment that survives this one.

## Two kinds, two defaults

- **Interface comments are owed.** Every export carries one. It holds one plain
  statement per slot its types do not answer. A slot is never dropped for
  being obvious, and a good name does not answer it.
- **Implementation comments default to no.** Each one must pass the no-op
  test.

## Interface slots

Ask each one against the signature alone. The caller never opens the body.

- purpose, when the name does not carry it
- unit and currency
- who owns the returned value
- ordering
- what null or empty means
- failure behaviour
- side effects and argument mutation
- preconditions

A slot the types answer gets no sentence. `x: T | null` already says null is
allowed; say what null *means*, or nothing.

## What an implementation comment may say

- **A constraint the code answers to**: a unit, a bound, a gateway quirk, a
  framework default the code departs from.
- **A summary above a large block** (eight lines or more) that says what the
  block accomplishes, so a reader can skip it.
- **A trap**: what breaks when someone changes this. Name the test that pins it.

A better name beats a comment. A rename changes the name and every reference
to it, nothing else; propose it as `RENAME`. A fact a narrower type would
carry is a `TYPE` finding and gets a one-line comment at the definition.

## Cut these

- **History**: what the code used to do, how it got here, who decided, when,
  or which ticket, PR or review round. Keep the reason, drop the id.
- **Restates**: every word is readable from the line, its names or its
  signature. A sentence that describes the code's response to a constraint,
  rather than the constraint, restates.
- **Derivable**: a type, a callee signature or a test states it. A fact hidden
  inside a callee body is not derivable.
- **How, at an interface**: implementation steps a caller must not depend on.
- **Duplicate**: another comment or doc already states it. Keep one copy. A
  fact true of a whole group (the fields of a type, the branches of an `if`)
  sits once at the group.
- **Wrong**: the code contradicts it.

## Where a fact lives

- **Local to this code**: a comment at the line.
- **Shared** (a rule other files obey, a contract across files, a repo-wide
  trap): one existing doc owns it. The comment is `See <doc path>`, no
  anchor. `docs/adr/` is never a pointer target. No doc fits → keep it as a
  comment and file `WANTS DOC`. Never create a doc.

## Two tests for a sentence

1. **Names where to verify it?** The gateway, the framework, the test, the
   invariant.
2. **A stranger could not write it from the adjacent code?** At an interface,
   the adjacent code is the signature alone.

```
// Gateway field order varies per request.          passes
// Stable stringify so the cache key stays stable.  restates
```

## Voice and form

Common words, active voice, one idea per sentence, under twenty words. Use the
term the codebase uses. State the target, not the prohibition: "Amounts are
cents", not "don't pass euros". Present tense.

- **Value**: one sentence above it.
- **Block**: a verb phrase at the level of intent, above the block.
- **Interface**: the language's doc-comment form, one statement per slot.
- **Private function**: what it accomplishes, briefly.
- **More than three lines** is a doc section, not a comment.

## Findings

Reported in the pull request body, never fixed by this review.

- `BUG`: the code contradicts its test, a doc or its own types.
- `UNSURE`: the fact could not be established.
- `REDESIGN`: it resists a statement of a few plain sentences, which marks a
  bad abstraction. Say what you tried to state.
- `WANTS DOC`: a shared fact with no doc to own it.
- `TYPE`: a narrower type would carry the fact.
- `RENAME`: a name that would carry the fact, with every reference to change.
  The one finding the parent applies.
