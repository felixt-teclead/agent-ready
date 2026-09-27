# Writing the line

## The five tests

Every sentence passes all five or goes. Length is the count of sentences that
passed.

1. **Still true after this line is rewritten?** Write the constraint the code
   answers to, not the code's mechanics.
2. **Names where to verify it?** The gateway, the framework, the rule file,
   the invariant.
3. **States the constraint alone?** The code's response to it is visible in
   the code. The wrong edit that earned the tag stays in the tag file.
4. **A stranger could not write it from the adjacent code?** At an interface
   the adjacent code is the signature alone.
5. **Stands alone without a tracker?** Name no ticket, PR, review round or
   person. Keep the reason, drop the id.

```
// Gateway field order varies per request.          passes
// Stable stringify so the cache key stays stable.  fails 1 and 3
```

## Form, by scope

- **Value** — the fact, present tense, one sentence, `//` above.
- **Block** — a verb phrase at the level of intent, `//` above the block.
- **Interface** — one plain statement per slot, in a `/** */` block. The
  caller reads it instead of the body.
- **Private function** — what it accomplishes, briefly.
- **Group** — a fact true of every member of a group (fields of a type,
  branches of an `if`) sits once at the group's anchor. A member carries only
  what is true of it alone.

## Voice

Common words, active voice, one idea per sentence, under twenty words. Use the
term the codebase already uses. State the target, not the prohibition:
"Amounts are `Cents`", not "don't pass euros". Write what holds now; git holds
how it got here.
