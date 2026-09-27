# The migration worklist

`.agents/migration.md` carries a run of `adopt-pocock-methodology`,
`model-codebase-domain` or `route-codebase-docs` across sessions. It lives
only on the run's branch: the run commits it after each row, pushes, and
deletes it in the commit before its pull request. A row is sized to fit one
commit and one session. A denied push becomes a
[confirmed step](../setup-codebase-for-agents/confirmed-steps.md): the row
stays ticked in the local commit, and the push is its gap.

```
owner: <the skill that opened the branch>
specs: delete | archive
architecture: delete | keep

## <skill>
- [ ] <row>
```

The **owner** holds the branch, the settings and the pull request. A block
under another owner works on the owner's branch, adds its own section and
works its rows (`retire-agent-setup` adds none; the owner puts its summary
under its row), and hands back instead of opening a pull request. The
owner's row for a block stays open until the block hands back; a resume
mid-block finds its place in the block's own section.

**Settings**, asked at the start with the default shown, only by the runs
that need them, and shown again where they act, open to change:

- `specs:` `delete` or `archive`, default `delete`: what happens to a spec
  or plan folder once `model-codebase-domain` has folded it. Ask: "Once
  their content is in `CONTEXT.md` and ADRs, delete or archive the spec and
  plan folders? Default: delete."
- `architecture:` `delete` or `keep`, default `delete`: once its statements
  have homes, an architecture doc goes, or stays behind one pointer line in
  `AGENTS.md`. Ask: "Once its statements have homes, delete the
  architecture doc, or keep it behind one pointer line in `AGENTS.md`?
  Default: delete."

## Fix-or-keep

For a check's findings: propose a fix for each, apply the ones
the user accepts, then ask fix or keep for each remaining one. A kept one
gets its line in `.agents/deviations.md`, as
[Accepted deviations](../setup-codebase-for-agents/accepted-deviations.md)
says, with the check's class.

## Start or resume

Every run starts here, before it asks anything. Uncommitted work in the
checkout: show it and ask commit or discard. Untracked paths inside a
scratch folder (measure.md's
[Old setup](../setup-codebase-for-agents/measure.md#4-old-setup)) are no
uncommitted work: `retire-agent-setup` judges them. The run's branch is the
owner's name. **Merged**: the branch's tip is an ancestor of
`origin/<default>`, or a merged pull request's `headRefOid` equals the tip
(`gh pr list --head <branch> --state merged --json headRefOid`). An older
pull request of the same branch name says nothing about this tip.

- **The worklist is in the checkout, with your section:** `git fetch`;
  behind the branch on `origin` → `git pull --ff-only`; diverged → stop and
  show both tips. Ahead → push. Then resume at your first open row.
- **In the checkout, without your section:** `owner:` names
  `adopt-pocock-methodology` or your own skill → add your section and go
  on. Another owner → stop and name the run to finish first.
- **Not in the checkout:** look for the run's branch, local and on
  `origin`, and its pull request (`gh pr list --head <branch> --state all`),
  first match:
  - holds a worklist → offer to resume on it, or a fresh start: after the
    user confirms, close its pull request, delete the branch local and on
    `origin`, then Other runs, then Start;
  - merged → check out `<default>`, `git pull --ff-only`, delete the branch
    local and on `origin`; then Other runs, then Start;
  - no worklist, pull request open → the run is past its pull request: the
    owner's skill says where it goes on; a block says so and stops;
  - no worklist, no pull request → the run stopped before its pull request:
    check the branch out and go to [End](#end), the body from
    `git show HEAD^:.agents/migration.md`, or from the last commit's message
    when that has no worklist;
  - absent → Other runs, then Start.

**Other runs:** another of these runs, or `retire-agent-setup`, has a
branch that is not merged, local or on `origin` → stop: "Finish or close
`<branch>` first."

**Start:** from a clean tree, a new branch off `origin/<default>`. Write the
worklist with `owner:`, the settings your run asks and your section, plus
whatever your skill puts into its first commit; make that one commit, and
`git push -u origin <branch>`, so other clones see the run.

## End

The owner's last commit deletes the worklist. Push the branch and open the
pull request; its body comes from the worklist as it was before that
commit. A human merges it. It touches a steering file (the list in
`AGENTS.md`) or `.agents/deviations.md` → the body says "steering diff, a
human merges".
