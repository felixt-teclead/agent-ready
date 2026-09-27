#!/usr/bin/env sh
# Creates the triage labels and `architecture-review` once. A label that
# exists keeps its colour and description. With docs/agents/triage-labels.md,
# each role gets the label string that file maps it to, and a role mapped to
# — gets no label.
set -u
repo="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
map=docs/agents/triage-labels.md

label_for() {
  [ -f "$map" ] || { echo "$1"; return; }
  awk -F'|' -v role="$1" '
    { r = $2; l = $3; gsub(/[ `]/, "", r); gsub(/[ `]/, "", l) }
    r == role { print l; exit }
  ' "$map"
}

while IFS='|' read -r role colour desc; do
  name=$(label_for "$role")
  case "$name" in
    "" | "—") echo "Skipped: $role"; continue ;;
  esac
  gh label create "$name" -R "$repo" --color "$colour" --description "$desc" 2>/dev/null ||
    echo "Kept: $name"
done <<'LABELS'
needs-triage|d4c5f9|Maintainer needs to evaluate this issue
needs-info|fbca04|Waiting on reporter for more information
ready-for-agent|0e8a16|Fully specified, ready for an AFK agent
ready-for-human|1d76db|Requires human implementation
wontfix|ffffff|Will not be actioned
LABELS

# Not a triage role, so the mapping file never renames or skips it.
gh label create architecture-review -R "$repo" --color 5319e7 \
  --description "An architecture review; merging it resets the reminder" 2>/dev/null ||
  echo "Kept: architecture-review"
