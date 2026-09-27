# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps each role to the label string in this repo's tracker.

| Role              | Label in our tracker | Meaning                                  |
| ----------------- | -------------------- | ---------------------------------------- |
| `needs-triage`    | <label, or —>        | Maintainer needs to evaluate this issue  |
| `needs-info`      | <label, or —>        | Waiting on reporter for more information |
| `ready-for-agent` | <label, or —>        | Fully specified, ready for an AFK agent  |
| `ready-for-human` | <label, or —>        | Requires human implementation            |
| `wontfix`         | <label, or —>        | Will not be actioned                     |

When a skill applies a role, use its label string. A role marked `—` has no label: skip that labeling step.
