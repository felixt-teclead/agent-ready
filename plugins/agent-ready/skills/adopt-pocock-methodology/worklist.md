# The migration worklist

`.agents/migration.md` carries a run of `adopt-pocock-methodology`,
`model-codebase-domain` or `route-codebase-docs` across sessions. It lives
only on the run's branch: the run commits it after each row and deletes it
in the commit before its pull request.

```
owner: <the skill that opened the branch>
specs: delete | archive
architecture: delete | keep

## <skill>
- [ ] <row>
```

The **owner** holds the branch, the settings and the pull request. A block
under another owner adds its own section, works its rows, and hands back
when they are ticked.

**Settings**, asked once with the default shown, and only by the runs that
need them:

- `specs:` `delete` or `archive`, default `delete`: what happens to a spec
  or plan folder once `model-codebase-domain` has folded it.
- `architecture:` `delete` or `keep`, default `delete`: once its statements
  have homes, an architecture doc goes, or stays behind one pointer line in
  `AGENTS.md`.

## Start or resume

Every run starts here, before it asks anything. The run's branch is the
owner's name. **Merged**: the branch is an ancestor of `origin/<default>`,
or `gh pr list --head <branch> --state merged` lists its pull request.

- **The worklist is in the checkout, with your section:** `git status`
  first; show uncommitted work and ask commit or discard. Then resume at
  your first open row.
- **In the checkout, without your section:** `owner:
  adopt-pocock-methodology` → add your section and go on. Another owner →
  stop and name the run to finish first.
- **Not in the checkout:** look for the run's branch, local and on
  `origin`, and its pull request (`gh pr list --head <branch> --state all`):
  - merged → check out `<default>`, `git pull --ff-only`, delete the branch
    local and on `origin`; then start;
  - holds a worklist → offer to resume on it, or a fresh start: after the
    user confirms, close its pull request, delete the branch local and on
    `origin`, and start;
  - no worklist, pull request open → the run is past its pull request:
    `adopt-pocock-methodology` goes on at its hand-off to `cleanup`; a block
    says so and stops;
  - no worklist, no pull request → the run stopped before its pull request:
    check the branch out and go to [End](#end), the body from
    `git show HEAD^:.agents/migration.md`, or from the last commit's message
    when that has no worklist;
  - absent → start.

**Start:** another of these runs, or `retire-agent-setup`, has a branch
that is not merged, local or on `origin` → stop: "Finish or close
`<branch>` first." Otherwise, from a clean tree, a new branch off
`origin/<default>`. Write the worklist with `owner:` and the settings your
run asks, then commit.

## End

The owner's last commit deletes the worklist. Push the branch and open the
pull request; its body comes from the worklist as it was before that
commit. A human merges it. It touches a steering file (the list in
`AGENTS.md`) or `.agents/deviations.md` → the body says "steering diff, a
human merges".
