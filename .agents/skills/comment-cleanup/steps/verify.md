# Verifier brief

One dispatch per file. Reads the repository and `headings.txt`, edits nothing,
returns one table. **A pointer inherits its section**: the run vouches for
what it sends a reader to, so a targeted section is verified as hard as the
comment.

**To the verifier:** your dispatch gave `path`, `work`, `repo`, `docs`;
substitute them below and work from `<repo>`.

> Open files in Bash (`sed -n`, `cat`, `grep`), independent calls in one turn, because
> a turn costs its whole context. Fetch a doc one section at a time by the
> line range `<work>/headings.txt` gives.
>
> `<work>/added/<path>.txt` lists the lines just added to `<path>` and to the
> docs, with `file:line`. Each is a factual claim.
>
> Check every one against the repository as it stands: a named symbol exists
> and is used as described, a named key or flag behaves as stated, a named
> test asserts what is claimed, a stated direction, ordering or number holds.
> Every heading named on an added line is in `headings.txt` and its section
> explains the anchored code. A `§` pointer inside comment text is `WRONG`,
> fix "route DOC"; a test path inside comment text is a claim like any other.
>
> Then read every section a pointer targets, whoever wrote it and whenever.
> Same checks, same rows, with the doc's own `file:line`.
>
> Write `<work>/verify/<path>.md`:
> `| file:line | OK / WRONG / MISPLACED / UNVERIFIABLE | what is wrong, one clause | fix: delete / reword to "…" / move above "<code>" |`
>
> `MISPLACED` = true, wrong line. `UNVERIFIABLE` = no source in the
> repository. End with counts. Return only the path.

Done when the table holds one row per added line and per targeted-section
claim, and ends with counts.
