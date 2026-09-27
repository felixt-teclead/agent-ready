#!/usr/bin/env sh
# Creates the five triage labels and `architecture-review` once. A label that
# exists keeps its colour and description.
set -u
repo="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
while IFS='|' read -r name colour desc; do
  gh label create "$name" -R "$repo" --color "$colour" --description "$desc" 2>/dev/null ||
    echo "Kept: $name"
done <<'LABELS'
needs-triage|d4c5f9|Maintainer needs to evaluate this issue
needs-info|fbca04|Waiting on reporter for more information
ready-for-agent|0e8a16|Fully specified, ready for an AFK agent
ready-for-human|1d76db|Requires human implementation
wontfix|ffffff|Will not be actioned
architecture-review|5319e7|An architecture review; merging it resets the reminder
LABELS
