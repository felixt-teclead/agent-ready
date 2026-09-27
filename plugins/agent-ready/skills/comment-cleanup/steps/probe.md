# Probe briefs

Two dispatches per file. The reader measures; nothing it returns cuts on its
own.

**To the reader:** your dispatch named the section and gave `path`, `work`,
`repo`, `docs`. Substitute them below. `<anchors>` = the anchor column of
`<work>/anchors/<path>.md`, via `cut -d'|' -f2` — the comment column is the
one thing you must not see. Work from `<repo>`, open files in Bash (`sed -n`,
`cat`, `grep`), fetch a doc one section at a time by the line range
`<work>/headings.txt` gives. Independent calls in one turn: a turn costs its
whole context.

## Blind

The stripped copy. Never sees a comment.

> Read `<work>/stripped/<path>` and work out how it holds together. You may
> open what it imports, who imports it, its tests, and `<docs>`. Leave the
> repository's own copy of this file, git history, diffs and the rest of
> `<work>` closed.
>
> Here are the spots to explain, as code text: `<anchors>`.
>
> For **every** spot, write one row to `<work>/blind/<path>.md`:
> `| anchor | what this does | why it is this way |`
>
> Anchor back verbatim. No reason recoverable → `I cannot tell`, and say what
> you checked. Return only the path.

## Sighted + interface

The original copy and the exports table.

> Read `<work>/pre/<path>` and work out how it holds together. You may open
> what it imports, who imports it, its tests, and `<docs>`. Leave the
> repository's own copy of this file, git history, diffs and the rest of
> `<work>` closed.
>
> Here are the spots to explain, as code text: `<anchors>`.
>
> For **every** spot, write one row to `<work>/sighted/<path>.md`:
> `| anchor | what this does | why it is this way |`
>
> Anchor back verbatim. No reason recoverable → `I cannot tell`, and say what
> you checked.
>
> Then, **before opening anything else**: `<work>/exports/<path>.md` lists the
> exported declarations, each once `bare` and once `commented` where a comment
> stands above it. Per declaration, per pass, one row to
> `<work>/iface/<path>.md`:
> `| symbol | pass: bare / commented | a correct call | what the caller must guarantee | what it returns, with units and ownership | what it does on failure | the boundary it stays inside |`
>
> Answer these from the declaration and its comment alone, as a caller who
> will never open the body. No answer there → `unstated`. Return only the two
> paths.

Done when `blind` and `sighted` have one row per anchor, and `iface` two rows
per commented export, one per bare export.
