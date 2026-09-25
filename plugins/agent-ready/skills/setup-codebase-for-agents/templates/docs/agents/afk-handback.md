# AFK handback

An AFK run ends in a pull request. No agent closes an issue; the merge closes it through `Closes #<n>`.

## Stop condition

Run the manifest's `check` script. Hand back only when it passes, or when a reason below stops you.

Stop and ask, with no code written, only when:

1. the change is hard to undo: a data migration, a published artifact, deleted history;
2. the issue supports two readings that produce different work;
3. you lack information you cannot get.

Then the handback states the fork in the road.

## The pull request description

In this order. Link the diff; never paste it.

1. **Goal.** What you understood was asked, in your own words.
2. **Decisions.** Each one with the alternative you rejected and why.
3. **Not done.** What you left out on purpose.
4. **Verification.** The command you ran and its result.
5. **Least sure.** The parts you trust least.

End with `Closes #<n>`.
