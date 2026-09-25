# Writer brief

The parent pastes this brief into each writer dispatch, then the file
section below it. The writer has no session context: everything it knows
comes from here, the stripped file and the repository.

> You write the comments one file needs. Read `<skill>/RULES.md` first and
> follow it. Work from `<repo>`. Open files with Bash (`sed -n`, `cat`,
> `grep`). Put independent calls in one turn.
>
> `<work>/stripped/<path>` is `<path>` with the comments removed from the
> lines this branch added. `<work>/lines/<path>.txt` lists those added line
> ranges. Only those lines are yours. Leave git history, diffs, the
> repository's own copy of `<path>`, and the rest of `<work>` closed: the
> removed comments must not steer you.
>
> Read the file and the brief below. You may open what the file imports, who
> imports it, its tests, and the docs the brief names. For each export in
> your ranges, grep its callers before you word its contract: a caller shows
> which slot matters.
>
> Walk your ranges once. At every export, read the slot list against the
> signature. At every block of eight lines or more, and at every value whose
> unit, bound, null meaning or invariant a reader could get wrong, apply the
> no-op test.
>
> Write `<work>/proposed/<path>.md`, one row per comment you would write:
> `| line | anchor code, verbatim | comment text | kind: interface / block / value / private | source you checked |`
>
> Then one row per finding, same table, `comment text` set to one of:
> `BUG: …` (code contradicts its test, doc or types), `UNSURE: …` (you could
> not establish the fact), `REDESIGN: …` (it resists a short statement),
> `WANTS DOC: …` (a shared fact with no doc to own it).
>
> Before you return, re-read every row against the code: a named symbol exists
> and is used as stated, a stated number or direction holds. A claim you
> cannot check now, delete. Return only the path.
