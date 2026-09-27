# Superpowers in this repo

This file overrides Superpowers' skills. When a Superpowers skill names another skill, load the skill that the step below names.

## Flow

1. **Design.** Load `grilling` where Superpowers asks for `superpowers:brainstorming`.
2. **Stop.** Hand over to the human, who runs `/to-spec`, then `/to-tickets`. Continue when the human names a ticket.
3. **Plan, per ticket.** `superpowers:writing-plans` writes the plan to `.superpowers/plans/<n>.md`, with `<n>` the ticket number. Each task is a `### Task N` heading, and its text says "Load `tdd`." `.gitignore` names `.superpowers/`, so the plan stays out of git and dies with the worktree.
4. **Execute.** `superpowers:executing-plans` or `superpowers:subagent-driven-development`, your choice. Load `tdd` where a skill names `superpowers:test-driven-development`. Make worktrees with the harness's native worktree tool where a skill names `superpowers:using-git-worktrees`.
5. **Bugs.** Load `diagnosing-bugs` where a skill names `superpowers:systematic-debugging`.
6. **Commits.** Each commit message references the ticket as `#<n>`. `/code-review` finds the spec through it.
7. **Done check.** Verify as `AGENTS.md` says where a skill names `superpowers:verification-before-completion`. Then run `/code-review` against the ticket, the spec and `docs/CODING_STANDARDS.md`. It is the only reviewer: it takes the place of `superpowers:requesting-code-review`, its `code-reviewer` and the per-task reviewers of `superpowers:subagent-driven-development`.
8. **Finish.** Push the branch and open a pull request with `Closes #<n>`, where a skill names `superpowers:finishing-a-development-branch`. Merge locally only into your own branches; `main` and `develop` receive changes by pull request.
