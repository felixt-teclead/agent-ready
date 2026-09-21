# 1. blueprint stays a private personal repo, so its gates are advisory

Date: 2026-09-21

## Status

Accepted.

## Context

A steering diff changes the rules an agent works by, so a human must decide it.
GitHub can enforce that with a branch ruleset or branch protection, which require
a code-owner approval before a merge.

Neither is available here. `blueprint` is a private repo owned by the Free
personal account `felixt-teclead`. Rulesets, branch protection and required
status checks all answer `403 Upgrade to GitHub Pro or make this repository
public to enable this feature`, on read as well as on write. `.github/CODEOWNERS`
is still parsed, but with no protection rule to consume it, it only requests a
review.

So every GitHub-side gate in this repo is advisory. A red check sits next to a
green merge button, and nothing refuses a merge.

## Decision

Keep the repo private on the personal account, and accept advisory gates.

The gate moves off GitHub. An agent must not merge a steering diff, and must
push the decision to a human by hand. Every real human is a pass — the question
is whether a person approved at all, not which person. The rule is written twice
on purpose: in `CLAUDE.md`, which loads before an agent touches a file, and in
the CI guard, which ships from a published package the agent cannot weaken.

`blueprint` is the payload, not its own first downstream repo. A generated repo
on a capable plan runs `.github/bootstrap-steering-ruleset.sh` and gets the
blocking gate that this repo will never see work.

## Rejected alternatives

- **Move the repo back to the `Teclead-Ventures` organisation.** It is on Team,
  with 16 spare seats, so rulesets, branch protection and required checks would
  all work at no extra cost. Rejected because ownership beat enforcement:
  `blueprint` is personal work and stays personal if the account holder leaves
  Teclead.
- **Upgrade the personal account to Pro.** Buys the same enforcement for a
  monthly fee, on a repo whose job is to hand enforcement to other repos.
- **Make the repo public.** The conventions are shaped by client work.
- **A bot that approves the maintainer's own pull request.** It manufactures the
  look of a review and makes the timeline lie.

## Consequences

- Broken enforcement in this repo is the recorded state, not a bug. Do not
  reopen it as one.
- The guard prints its enforcement status on every run, because a green tick
  looks the same whether a gate passed or no gate exists.
- The guarded path set names the steering files themselves, so a diff that
  disarms the guard is a steering diff.
- The blocking gate is the one part of the payload this repo cannot exercise. It
  is verified in a downstream repo or not at all.
