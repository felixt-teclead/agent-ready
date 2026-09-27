# Judge: the rules and the rewriter brief

The rewriter reads this file and [`EXAMPLES.md`](../EXAMPLES.md), which works
one comment through every flag and both tables. Nothing else in the skill is
its concern.

## What a comment says

- **Comments describe unintuitive behaviour.**
- **Concise, simple technical terms.** Common words, active voice, one idea
  per sentence, under twenty words. Verbs stay verbs ("when it retries", not
  "on retry"). No hedges, no emphasis, no narrative.
- **More than three lines is a doc section**, and the code gets the pointer.
  Long text at the code means the fact is a rule, a trap or design reasoning —
  none of them local.

## Red flags

The unit of judgement is a **fact**, not a comment block. Its **scope**
decides which flags fire and what form the survivor takes:

- **body** — inside a function, or above a statement, block or field.
- **interface** — above an exported declaration. The caller reads it instead
  of the body: a contract, not a reason.
- **private** — above a non-exported function. Callers sit in the same file
  and can read the body, so the bar for any comment is high.

A fact is cut when any flag fires:

| flag               | scope     | test                                                                                                                                                                                                                                                                                                                        |
| ------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HISTORY`          | all       | it says what the code used to do, when, or by which ticket; or it names the ticket, date, meeting or person a fact came from. Judge the fact on its own row; the provenance is cut, and if the decision record matters the backlog file that holds it is the `source`                                                       |
| `PROCESS`          | all       | it narrates how the code got here ("after we hit X we chose Y") rather than why it is right now                                                                                                                                                                                                                             |
| `RESTATES`         | all       | every word of it is readable from the anchor line, the names it uses, or its signature                                                                                                                                                                                                                                      |
| `MISLEADING`       | all       | the sighted reader's `why` is wrong at this anchor, its wrong belief is what this fact says or implies, and the truth is established: the comment made a correct reader wrong                                                                                                                                               |
| `WRONG`            | all       | the code contradicts it; cut first, then decide whether the corrected fact is worth a row                                                                                                                                                                                                                                   |
| `DUPLICATE`        | all       | a doc, rule file or another comment already states it, so this copy is not the single source. Name that place in `source`: a `DUPLICATE` whose `source` is empty is an unbacked cut, and the flag does not fire. The other comment is often in this same file — a sibling field of one type, or the next branch of one `if` |
| `DERIVABLE`        | body      | the callee's signature, the type, or the test that pins it states the fact itself. A fact the reader must find inside a callee's body, however near, is not derivable; nor is a unit, bound or null meaning the type leaves as a bare `number` or `string \| null`                                                          |
| `DERIVABLE`        | interface | the signature's types state the fact itself. A fact that lives in the body, a callee or a test is _not_ derivable here: the comment exists so the caller never opens those                                                                                                                                                  |
| `HOW-IN-INTERFACE` | interface | it describes implementation steps a caller must not depend on                                                                                                                                                                                                                                                               |
| `UNEARNED`         | private   | the function is short, or its name and parameters say what it does, or it follows a convention of the codebase                                                                                                                                                                                                              |

A fact surviving every flag is `KEEP`. Doubt keeps it: truth you cannot
establish is `KEEP?` — original words back into the file, listed for the
human, who has the code. Two flags point at the code instead: an interface
needing a paragraph per parameter is `HARD-TO-DESCRIBE`; a comment right where
the code is wrong is `BUG`. Both are report rows, never edits.

**Interface completeness** is the second judgement, interfaces only. The flags
cut; this adds. The exported surface carries the highest bar. A caller must
find at the signature: units and currency, who owns the returned value,
ordering and lifecycle, what null means, failure behaviour, the boundary it
stays inside. Each one the types do not carry and the comment does
not state is a missing fact.

## The rewriter brief

One dispatch per file. **To the rewriter:** your dispatch gave `path`,
`work`, `repo` and `docs`; substitute them for the `<…>` below and work from
`<repo>`.

> Read `EXAMPLES.md` beside this file first. Open every other file with Bash
> (`sed -n`, `cat`, `grep`); a doc is fetched one **section** at a time, by
> the line range `<work>/headings.txt` gives (`doc:start-end  heading`), as
> `sed -n 'start,endp' <doc>`. A test is fetched as the `grep -n` hit plus its
> surrounding lines. Independent calls go in one turn: a turn costs its whole
> context. The whole doc and the whole test file stay out of your context: one
> fact needs one section.
>
> Every row in `<work>/anchors/<path>.md` is a comment in `<path>` with the
> code it describes. `<work>/doc-refs.txt` lists doc lines that name this file:
> a comment the doc points at is owned by the doc, and its reason moves there.
> `<work>/ambiguous.txt` lists anchors that occur twice in the file: give each
> such row a unique anchor from the same statement before you write it into
> either table, or `--apply` skips it.
>
> **First table, `<work>/facts/<path>.md`, one row per fact:**
> `| anchor | scope | fact | source | flag | truth |`
>
> - Split each comment into its facts: one claim per row, in the comment's own
>   words. A pointer ("see doc §W", a test name) is not a fact: it goes in the
>   `source` cell of the fact it backs. A comment that says one thing is one
>   row. `EXAMPLES.md` 1, 2 and 9 show the splits.
> - `scope` is body, interface or private, once per anchor.
> - Establish from the code, its tests and the docs whether the fact is true,
>   and write what is true in `truth`. Where you cannot, write `unknown`.
> - `flag` is the first red flag that fires for this scope, or `KEEP` when none
>   does. Doubt is `KEEP`. A fact that is `unknown` and fires no flag is
>   `KEEP?`.
> - Read `<work>/sighted/<path>.md` and `<work>/blind/<path>.md` per anchor
>   after you have the truth. Sighted wrong where the truth is established: the
>   fact carrying that belief is `MISLEADING`. Blind wrong or hedged: the reason
>   is load-bearing; it confirms `KEEP` and never cuts. Blind wrong or hedged at
>   an anchor whose every fact is cut: the reason was never written; add a row
>   `fact` = `missing: reason`, `flag` = `KEEP`, `truth` = the reason, and
>   compose it in the anchor's scope form. Blind right at an anchor with `KEEP`
>   facts changes nothing: a reader who worked it out this time is not the rule.
> - For every exported declaration, read `<work>/iface/<path>.md`. A cell the
>   reader filled from the bare pass is a fact the types state: the comment's
>   matching fact is `DERIVABLE`. A cell filled only in the commented pass is
>   what the comment earns: `KEEP`. A cell `unstated` in both passes that a
>   caller must know gets a row with `fact` = `missing: <units | ownership |
>   ordering | null | failure | boundary>`, `flag` = `KEEP`, and the answer in
>   `truth`. A cell the reader filled _wrongly_ from the comment is that fact's
>   `WRONG`. Your own reading of the signature never replaces the reader's row.
> - `BUG` and `HARD-TO-DESCRIBE` are flags too: the fact is right and the code
>   is wrong, or the export's contract needs a paragraph per parameter.
> - **Sibling pass, once the whole table stands.** Read your own `KEEP` rows
>   against each other, grouped by the code they sit in: the fields of one type,
>   the branches of one `if`, the steps of one loop. A rule that holds for the
>   whole group is one fact, not one per member. Keep it once, `DUPLICATE` the
>   copies with the first row as their `source`, and route the survivor to the
>   group's own anchor — the type, the function, the loop — so the reader meets
>   it before the members. What stays on a member is only what is true of that
>   member alone: its unit, its key format, its own branch.
>
> **Second table, `<work>/answers/<path>.md`, one row per anchor:**
> `| anchor | verdict | text | source | route | after |`
>
> - `verdict` is `CUT` when the anchor has no `KEEP` or `KEEP?` fact, otherwise
>   `KEEP`; `KEEP?` when any surviving fact is. `BUG` and `HARD-TO-DESCRIBE`
>   rows carry the observation as `text` and go to the report.
> - `text` is composed from the surviving facts. Where the surviving words are
>   already right, keep them. Otherwise reword by scope. **Body**: one reason,
>   `X because Y: consequence`. **Interface**: a contract in plain statements,
>   one per fact, no because; the script writes it as a `/** */` block.
>   **Private**: what the function accomplishes, briefly. Word it per "What a
>   comment says" above. Length is whatever the facts need and nothing more;
>   break lines with `<br>`, and each break lands as a line in the file. A doc
>   pointer never goes in `text`: the route and `source` carry it, and the
>   script writes it. A test is the exception: when the fact is a trap ("loosen
>   X and Y breaks") and a test pins it, the test path stays in `text`, so the
>   reader about to change the code meets the test before the change. A `KEEP?`
>   fact keeps its original words: an unverified claim is never reworded.
> - `route` answers one question: _where does this reader reach the reason in
>   time?_ A reason local to this code → `COMMENT`. A rule other files must
>   obey, a contract spanning files, a repo-wide gotcha, a trap → `DOC` into the
>   design doc. Where a control sits or what a pixel value is stays `COMMENT`. An
>   anchor whose facts split across routes gets two rows (`EXAMPLES.md` 10).
> - On a `COMMENT` row `text` is the comment line. On a `DOC` row it is the doc
>   sentence, and the code gets only the pointer; leave it empty when the
>   section already states the fact. For a trap it is the full write-up: the
>   wrong shape, the right shape, the consequence, one example. Write it to be
>   pasted unchanged.
> - `source` comes from the facts' `source` cells where they had one, else a
>   heading from `headings.txt`, a test path, the original comment, or a code
>   location. On a `DOC` row it is exactly `<doc> §"<anchor>"`: the anchor
>   quoted verbatim, on one line, quote closed. The anchor is a heading **or a
>   bold lead-in** — the bold sentence that opens a bullet or paragraph, which
>   `headings.txt` does not list, so read it from the section itself. A pointer
>   is all the reader sees at the code, so the anchor names the paragraph that
>   states the fact, never the chapter that contains it: a section over about
>   sixty lines is not a target. Write a bold lead-in into the doc and point at
>   that, or route `COMMENT` and say so in `source`. One `source` never serves
>   two anchors in a file — the second reader arrives at a paragraph that
>   answers someone else's question.
> - `after` is empty except on a `DOC` row with a non-empty `text`: the first
>   words of the paragraph the sentence extends.
>
> Before you return, re-read every `text` cell against its facts' `truth` cells
> and the current code: a named symbol exists and is used as stated, a named
> key or flag exists, and a stated direction matches the code. Return only the
> two paths. Stay available: the orchestrator sends you the recite tables for
> this file later in this same dispatch.

Done when: both tables exist, every inventoried anchor appears in both, every
fact row has a flag, every `text` cell traces to `KEEP` rows of the same
anchor, and no answers anchor is in `ambiguous.txt`.
