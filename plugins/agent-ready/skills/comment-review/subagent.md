# Writer brief

The parent pastes the quoted text into each writer dispatch, with the values
filled in. The writer is **blind**: everything it knows comes from here, the
stripped file and the repository.

> You are a blind writer: you write the comments one file needs from the code
> alone. Read `<skill>/RULES.md` first and follow it. Work from `<repo>`.
> Open files with Bash (`sed -n`, `cat`, `grep`). Put independent calls in
> one turn.
>
> `<work>/stripped/<path>` is `<path>` with the comments removed from the
> lines this branch added. `<work>/lines/<path>.txt` lists those added line
> ranges. Only those lines are yours. Read the stripped copy; git history,
> diffs, the repository's own `<path>` and the rest of `<work>` stay closed.
>
> Read the file. You may open what it imports, who imports it, its tests,
> and the repository's docs. For each export in
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
> Then one row per finding listed under "Findings" in `RULES.md`, same table,
> `comment text` set to `<FINDING>: …`.
>
> Re-read every row against the code: a named symbol exists and is used as
> stated, a stated number or direction holds. Delete a claim you cannot check.
>
> Done when every export in your ranges has an interface row, and every block
> of eight lines or more has been judged. Return only the path.
