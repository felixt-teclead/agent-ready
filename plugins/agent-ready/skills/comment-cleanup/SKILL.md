---
name: comment-cleanup
description: "Called by agent-ready:cleanup during a refactor phase: prune and improve the comments in a file set."
---

**Goal: single source of truth, reachable when necessary.** Every fact sits in
one place, as a reason. Other places point at it. Flags and routing:
[`steps/judge.md`](steps/judge.md).

## Process

- **Dispatch = brief path + values, nothing else:**
  `Run the brief at <skill>/steps/<brief>. path=<path> work=<work> repo=<repo> docs=<doc>, <doc>`
  You open this file, script output, tables — never a brief, the source file
  or a doc.
- **Bash instead of `Read`** (`sed -n`, `cat`, `grep`). Docs by line range
  from `headings.txt`.
- **Wait, never poll.** Results arrive as notifications.
- **Independent calls in one turn.** A turn costs its whole context.

## Agents

**Orchestrator** — you, or one runner per file, Opus. You and the script are
the only writers into the repository.
**Reader** — Sonnet: blind, sighted+interface, recite.
**Rewriter** — Sonnet: one per file. The only judge.
**Verifier** — Sonnet: one per file, two passes max.

Leave the changes uncommitted; git is the undo. `<work>` =
`$TMPDIR/comment-cleanup/<repo>/<run>/`, `<run>` = first file's
basename. `<skill>` = this directory.

## Steps

### 1. Prepare

File set = what the conversation names; inferred rather than read → print,
stop for confirmation. Paths relative to repo root into `<work>/files.txt`.
Docs = the docs the caller names, else those `cleanup`'s
[Comment pass](../cleanup/SKILL.md#5-comment-pass) names.

```bash
node <skill>/strip-comments.mjs --prepare <work>/files.txt <work> <doc> [<doc> ...]
```

Exit 3 = no comments, stop. Exit 4 = pick a fresh `<run>`.

### 2. Probe

Dispatch `probe.md` §Blind and §Sighted, one turn, neither sees the other.
Done when the counts match:

```bash
for f in $(cat <work>/files.txt); do
  printf '%s anchors=%s blind=%s sighted=%s iface=%s\n' "$f" \
    $(grep -c '^|' <work>/anchors/$f.md) $(grep -c '^|' <work>/blind/$f.md) \
    $(grep -c '^|' <work>/sighted/$f.md) \
    $(grep -c '^|' <work>/iface/$f.md 2>/dev/null || echo -)
done
```

Short table → redispatch, missing anchors quoted.

### 3. Judge

Dispatch `judge.md`. Keep it alive; step 6 sends it the recite tables.

Done when `facts/<path>.md` and `answers/<path>.md` hold every anchor, and no
answers anchor is in `ambiguous.txt`.

### 4. Apply

First, each `DOC` row with a `text` whose doc the caller marks as queued
([`cleanup`, Rule queue](../cleanup/SKILL.md#rule-queue)): make it a
`COMMENT` row with that text, and list it in the report with its anchor.

```bash
node <skill>/strip-comments.mjs <work>/files.txt
node <skill>/strip-comments.mjs --apply <work>/answers
```

Exit 1 prints skipped rows — each goes back to the rewriter. Then the
worklist by hand: `DOC` sentence after the paragraph its `after` names, pasted
unchanged; trap write-ups under their heading; `BUG` rows to the report. An
unplaced sentence is a dead pointer.

### 5. Verify

`git diff -U0` over the file and every doc you edited, added comment and doc
lines only, with `file:line`, into `<work>/added/<path>.txt`. Dispatch
`verify.md`, then apply every row:

- `WRONG` → reword from the fix column, or delete.
- `UNVERIFIABLE` → cut the unsourced clause; anchor is `KEEP?` → report it.
- `MISPLACED` → move to its anchor.
- `WRONG` pointer, or `WRONG` inside a targeted section → fix the doc, keep
  the fact out of the comment.

Redispatch once. A `WRONG` surviving that goes to the report.

### 6. Recite

```bash
node <skill>/strip-comments.mjs --prepare <work>/files.txt <work>/post
```

Dispatch `recite.md`, `SendMessage` both tables to that file's rewriter, which
scores them. A failure → it rewrites that anchor, re-run `--apply`, recite
once more. A second failure stays in the file as a finding: the fact wants a
doc section or a refactor.

### 7. Finish

```bash
node <skill>/strip-comments.mjs --finish <work>/files.txt <work>
```

Code hunk → revert. Lost marker → restore its original words. Then the
repository's typecheck and lint, by the names the project manifest gives
them. Tests only on request.

### 8. Report

Per file: blocks → facts → cut per flag → `MISLEADING` → `CUT` anchors →
`KEEP` verbatim → `KEEP` reworded → `KEEP?` → `missing:` added → interface
facts added → `DOC` → verify fixes → recite failures.

Then: doc sentences added; `KEEP?` rows with `file:line` and their words;
`BUG` and `HARD-TO-DESCRIBE` rows; findings (no doc named, no heading fit,
`doc-refs.txt` entries, surviving `WRONG`).

Ask whether to delete `<work>`.
