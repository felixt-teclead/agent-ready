#!/usr/bin/env sh
# Runs each agent-ready hook on a made-up input in a throwaway repo and prints
# ok or FAIL per check; exits 1 on any FAIL. Setup's Verify section runs it.
# The commands the gates react to live in this file, not on the command line,
# so a gate live in the session neither blocks a check nor fakes its result.
# It tests the hooks beside this skill: .agents/hooks without the plugin, the
# plugin's own with it.
set -u
hooks=$(cd -P "$(dirname "$0")/../../hooks" 2>/dev/null && pwd) || {
  echo "FAIL  no hooks folder beside this skill"
  exit 1
}
fail=0
say() {
  if [ "$1" = 0 ]; then echo "ok    $2"; else echo "FAIL  $2"; fail=1; fi
}

command -v jq >/dev/null 2>&1
say $? "jq is on PATH; the steering gate and the reminder need it"
if git remote -v 2>/dev/null | grep -qi github; then
  gh auth status >/dev/null 2>&1
  say $? "gh is logged in"
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT INT TERM
git init -q "$tmp/repo"
git -C "$tmp/repo" -c user.name=v -c user.email=v@example.com commit -q --allow-empty -m v
cd "$tmp/repo" || exit 1
mkdir "$tmp/bin"
printf '#!/bin/sh\necho 0\n' >"$tmp/bin/gh"
chmod +x "$tmp/bin/gh"

# Each switch is forced on: this checks the scripts, not the team's values.
printf '{"tool_input":{"command":"git push"}}' |
  CLAUDE_PLUGIN_OPTION_COMMENT_REVIEW= "$hooks/comment-review-gate.sh" 2>/dev/null
[ $? = 2 ]
say $? "push gate blocks a push comment-review has not stamped"

printf '{"tool_input":{"command":"gh api -X PUT repos/o/r/pulls/1/merge"}}' |
  CLAUDE_PLUGIN_OPTION_STEERING_GATE= "$hooks/steering-merge-gate.sh" 2>/dev/null
[ $? = 2 ]
say $? "steering gate blocks a merge through gh api"

out=$(printf '{"prompt":"/improve-codebase-architecture"}' |
  AGENT_READY_ARCHITECTURE_REVIEW_DAYS=7 "$hooks/architecture-review-branch.sh")
case $out in *architecture-review/*) r=0 ;; *) r=1 ;; esac
say $r "review branch hook names the branch"

# The stub gh finds no review, so the first PR of the day gets the offer.
in='{"hook_event_name":"PostToolUse","tool_input":{"command":"gh pr create"},"tool_response":{"stdout":"https://github.com/o/r/pull/1"}}'
remind() {
  printf '%s' "$in" |
    PATH="$tmp/bin:$PATH" AGENT_READY_ARCHITECTURE_REVIEW_DAYS=7 "$hooks/architecture-review-reminder.sh"
}
first=$(remind)
second=$(remind)
case $first in *improve-codebase-architecture*) r=0 ;; *) r=1 ;; esac
[ $r = 0 ] && [ -f .git/agent-ready-review-offered ] && [ -z "$second" ]
say $? "PR reminder offers once a day"

"$hooks/refactor-phase.sh" </dev/null >/dev/null 2>&1
say $? "refactor phase hook runs"

exit $fail
