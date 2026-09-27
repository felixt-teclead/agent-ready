#!/usr/bin/env sh
# Creates agent-ready's labels once: `architecture-review` always, the triage
# labels unless --review-only. A label that exists keeps its colour and
# description. With docs/agents/triage-labels.md, each role gets the label
# string that file maps it to, and a role mapped to — gets no label.
# Prints Created, Kept or Failed per label; exits 1 when any failed.
# Usage: labels.sh [--review-only] [owner/repo]
set -u
failed=0
review_only=
[ "${1:-}" = --review-only ] && { review_only=1; shift; }
repo="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
map=docs/agents/triage-labels.md

create() {
  if err=$(gh label create "$1" -R "$repo" --color "$2" --description "$3" 2>&1); then
    echo "Created: $1"
  elif gh label list -R "$repo" --limit 1000 --json name --jq '.[].name' 2>/dev/null |
    grep -qxF "$1"; then
    echo "Kept: $1"
  else
    echo "Failed: $1: $err"
    failed=1
  fi
}

# Not a triage role, so the mapping file never renames or skips it.
create architecture-review 5319e7 "An architecture review; merging it resets the reminder"
[ -n "$review_only" ] && exit "$failed"

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
  create "$name" "$colour" "$desc"
done <<'LABELS'
needs-triage|d4c5f9|Maintainer needs to evaluate this issue
needs-info|fbca04|Waiting on reporter for more information
ready-for-agent|0e8a16|Fully specified, ready for an AFK agent
ready-for-human|1d76db|Requires human implementation
wontfix|ffffff|Will not be actioned
LABELS
exit "$failed"
