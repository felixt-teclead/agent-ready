# Pointers

What a pointer is, when it resolves, how to write one in code, and how a
move keeps pointers alive.

## What a pointer is

A **pointer** is one of:

- a markdown link target without a URL scheme, in a doc of the
  [inventory](measure.md#2-inventory);
- a path in inline backticks, outside fenced code blocks, in a doc of the
  inventory;
- a **code pointer**: `See <path> §"<heading>"` in a code comment anywhere
  in the repo (`git grep -n 'See [^ ]* §"'`).

Skip pointers inside the files `.agents/agent-ready-manifest.json` lists:
they are fetched, not written here.

Drop a `:line`, `:line-line` or `#L…` suffix first. Then a token in
backticks is a **path** when it has no space, `<`, `*`, `{`, `$`, `…` or URL
scheme, and it ends in a file name whose extension some tracked file has
(`x.md`; `.md` alone, `router.push` and `v1.2` are none), or has a `/` after
a first segment that names a folder in the tree. `EUR/USDT`, `n/a` and
`Cmd/Ctrl+Enter` are no paths.

## When it resolves

A path in backticks or in a code pointer **resolves** when it exists from
the repo root or from the doc's folder, or matches the last whole segments
of at least one `git ls-files` path (`accounts/aggregate.ts` for
`src/lib/accounts/aggregate.ts`; `gate.ts` does not match it).

A markdown link target resolves as GitHub renders it: from the doc's folder,
or from the repo root when it starts with `/`.

A folder pointer resolves when the folder exists. An `#anchor` resolves when
a heading's GitHub slug matches: lowercase, punctuation dropped except `-`
and `_`, spaces as `-`, a repeated heading gets `-1`, `-2`. A `§"<heading>"`
resolves when a heading or bold lead-in in the target matches it verbatim;
a bold lead-in's closing punctuation does not count.

A code pointer resolves by the repo's own convention too. A repo with its
own pointer check (a test or script that resolves pointers): run it; what it
accepts resolves, and its failures are the dead code pointers. Without one, a
code pointer also resolves when its path uses a path alias the repo's config
defines (`@/` in `tsconfig.json` `paths`) or names a folder, and when its
`§"…"` starts a heading or names a symbol defined in the target.

Skip:

- gitignored paths;
- a domain file (`CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/`) or a path on
  the steering list that does not exist yet: skills create these when first
  needed. An `#anchor` or `§"…"` into one that exists resolves or fails like
  any other;
- a path the sentence names as former, old, moved or removed;
- a package or product name (`Next.js`);
- a name a doc uses as an example, a placeholder or a stand-in for the
  repo's own file.

A pointer that neither resolves nor is skipped is **dead**.

Done when every pointer in every inventory doc and every code pointer has a
verdict: resolves, skipped, or dead with its `file:line`.

## Writing a code pointer

`See <doc> §"<anchor>"` alone on its line, after the comment marker. The
anchor is a heading or a bold lead-in, quoted verbatim, and names the
paragraph that states the fact, never the chapter. A section over about
sixty lines is not a target: write a bold lead-in into the doc and point at
that.

## Moving a statement

A PR that moves a statement fixes its pointers. Before the commit, search
the repo for the old spot: its file path, its heading anchor and its heading
text. Point each hit at the new home; a gist clause beside the pointer moves
with it and still names what the target covers. A hit in a steering file
makes the PR a steering diff.

Done when a repeat search finds no pointer to the old spot.
