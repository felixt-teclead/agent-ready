#!/usr/bin/env sh
# Optional. Adds a branch ruleset that makes the steering gate blocking: a pull
# request with a code-owner approval, and no bypass actor.
#
# The gate works without it. CLAUDE.md §"Steering files" stops the agent, and a
# human merges by hand. This step adds the GitHub half, which needs a plan that
# sells it: a public repo, or Pro, Team or Enterprise. On a private repo owned by
# a Free account the API answers 403. That is a plan, not a fault, so the script
# says so and exits 0.
#
# Run it once per repo:  sh .github/bootstrap-steering-ruleset.sh

set -eu

repo="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
out="$(mktemp)"

if gh api --method POST "repos/$repo/rulesets" \
     --input "$(dirname "$0")/steering-ruleset.json" >"$out" 2>&1; then
  echo "Steering ruleset active on $repo."
  rm -f "$out"
  exit 0
fi

if grep -q '"status": *"403"' "$out"; then
  echo "Skipped: $repo cannot hold a ruleset on its plan."
  echo "Make the repo public, or move it to Pro, Team or Enterprise, then run this again."
  echo "Until then the gate is advisory: a human merges every steering diff by hand."
  rm -f "$out"
  exit 0
fi

echo "Failed to create the steering ruleset on $repo:" >&2
cat "$out" >&2
rm -f "$out"
exit 1
