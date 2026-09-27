# Smoke run: the Superpowers override

A Superpowers user runs this once after setup writes the override, and again
after each Superpowers update. It shows whether the override still wins.

On a feature branch, take one small ticket through the full Superpowers flow.
Then check each line. Every red line is a finding: report it on the tracker.

- [ ] The agent reads `docs/agents/superpowers.md` before its first
      `superpowers:` skill.
- [ ] `grilling` loads, not `superpowers:brainstorming`.
- [ ] The agent stops for `/to-spec` and `/to-tickets`.
- [ ] The plan lands in `.superpowers/plans/<n>.md`, is gitignored, and each
      task says "Load `tdd`".
- [ ] `tdd` loads, not `superpowers:test-driven-development`.
- [ ] Each commit message references `#<n>`.
- [ ] `/code-review` is the only reviewer. No `code-reviewer` subagent runs.
- [ ] The branch ends in a pull request with `Closes #<n>`. No local merge
      into `main` or `develop`.
- [ ] No spec or plan is committed.
