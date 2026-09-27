# Recite brief

One **reader** dispatch per file with written rows, fresh context, on the
edited file. It proves a reader recovers the reason from what the run wrote.

**To the reader:** your dispatch gave `path`, `work`, `repo`, `docs`;
substitute them below and work from `<repo>`. `<anchors>` = the `anchor`
column of the `KEEP` and `KEEP?` rows in `<work>/answers/<path>.md`, that
column only.

> Open files in Bash (`sed -n`, `cat`, `grep`), independent calls in one turn:
> a turn costs its whole context. Fetch a doc one section at a time by the
> line range `<work>/headings.txt` gives.
>
> Read `<path>` and work out how it holds together. You may open what it
> imports, who imports it, its tests, and `<docs>`. Leave git history, diffs
> and anything under `<work>` closed.
>
> Here are the spots to explain, as code text: `<anchors>`.
>
> For **every** spot, write one row to `<work>/recite/<path>.md`:
> `| anchor | what this does | why it is this way |`
>
> Anchor back verbatim. No reason recoverable → `I cannot tell`, and say what
> you checked.
>
> Then, for files with exports: `<work>/post/exports/<path>.md` lists the
> exported declarations with the comment now above each. One row each to
> `<work>/recite-iface/<path>.md`, from the declaration and its comment
> alone:
> `| symbol | a correct call | what the caller must guarantee | what it returns, with units and ownership | what it does on failure | the boundary it stays inside |`
>
> No answer there → `unstated`. Return only the two paths.

## Scoring

**To the rewriter**, in your existing dispatch: score each `why` cell against
the `truth` cells of that anchor's facts, and each interface cell against the
`missing:` rows you wrote.

A **failure** is a wrong or hedged `why`, or a `missing:` fact whose cell is
still `unstated` — the text is true and does not work. Rewrite that anchor's
`text` with the reader's wrong belief in front of you and return the updated
answers table. The orchestrator re-runs `--apply` and recites once more.

A second failure stays in the file as a **finding**: the fact resists a
comment and wants a doc section or a refactor.

Done when every written anchor recites correctly, or its second failure is a
finding.
