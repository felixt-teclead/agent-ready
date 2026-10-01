# Phase files

The state of a refactor phase. `cleanup` writes it; `comment-review` and the
SessionStart hook read it, and grep `mode:`, `comments:` and `paused:`, so
each key starts a line.

`.agents/refactor.md`, the phase file, one `key: value` per line:

```
mode: continuous | fast
goal: <the gap the scan called a phase, or: comment pass>
parent: #<issue>
comments: true | false
cap: <files per fast step>
paused: <reason>     (only while paused)
```

`comments:` and `cap:` are the team's values. `comments: false` → no
comment pass: a task gets no cleanup PR, and a fast phase ends when there is
no next step. `cap:` bounds a fast step's comment pass; a continuous step
passes all its files.

`.agents/refactor.local`: same format, gitignored, holds `paused:` for one
person.

`.agents/refactor-paths.txt`, the path list: every path the phase cleans, one
per line, written once when the phase starts.

`.agents/refactor-done/<branch>.txt`, a done file: one per cleanup PR that
ran the comment pass, the files it covered, one per line. `/` in the branch
name becomes `-`.

`.agents/refactor-log.md`, the log: append-only, for agents to read. One
line per open `KEEP?` row a pass left: `- [ ] <file>:<line> "<the words>"`.
A decision turns `[ ]` into `[x] keep` or `[x] cut`. The SessionStart hook
does not print it.

**Files left** = the path list, minus every done file, minus paths no longer
in the tree.

**Held**: changed by an open PR other than this branch's own. Read them with
`gh pr list --state open --limit 1000 --json number,headRefName,changedFiles,files`.
`files` stops at 100; a PR with more `changedFiles` →
`gh api repos/{owner}/{repo}/pulls/<n>/files --paginate`. No `gh` → the
tracker's list of open merge requests; none → nothing is held, and the human
hears once that open branches go unchecked.
