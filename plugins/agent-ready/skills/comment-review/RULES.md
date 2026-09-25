# Comment rules

## The no-op test comes first

Delete the comment. If no reader would now make a different edit, it goes.
Every other rule applies only to a comment that survives this one.

## Two kinds, two defaults

- **Interface comments are owed.** Every export carries one. It holds one plain
  statement per slot its types do not answer. A slot is never dropped for
  being obvious, and a good name does not answer it.
- **Implementation comments default to no.** One earns its place only when it
  says what the code cannot, loses that when deleted, and changes what the
  next reader does.

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
  framework default the code departs from. Name where to verify it.
- **A summary above a large block** (eight lines or more) that says what the
  block accomplishes, so a reader can skip it.
- **A trap**: what breaks when someone changes this. Name the test that pins it.

Try a better name or a narrower type first. Use them only when the change
stays inside the file. A change that would ripple to callers becomes a
one-line comment at the definition instead.

## Cut these

- **History and process**: what the code used to do, how it got here, who
  decided, when.
- **Restates**: every word is readable from the line, its names or its
  signature.
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
  comment and list it in the report as "wants a doc". Never create a doc.

## The five tests for a sentence

1. **Still true after the line is rewritten?** State the constraint, not the
   mechanics.
2. **Names where to verify it?** The gateway, the framework, the test, the
   invariant.
3. **States the constraint alone?** The code's response is visible in the
   code.
4. **A stranger could not write it from the adjacent code?** At an interface,
   the adjacent code is the signature alone.
5. **Stands alone without a tracker?** No ticket, PR, review round or person.
   Keep the reason, drop the id.

```
// Gateway field order varies per request.          passes
// Stable stringify so the cache key stays stable.  fails 1 and 3
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

Something you cannot state in a few plain sentences marks a bad abstraction.
Report it as `REDESIGN`; do not write the paragraph.
