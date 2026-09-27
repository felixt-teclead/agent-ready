#!/bin/sh
# After `gh pr create` opens a PR, offers an architecture review when no PR
# labelled architecture-review merged in the last N days. Blocks nothing.
# PostToolUse on Bash. Off unless the team set a window in days.
days=$AGENT_READY_ARCHITECTURE_REVIEW_DAYS
case $days in ''|*[!0-9]*|0) exit 0 ;; esac

input=$(cat)
command -v jq >/dev/null 2>&1 || exit 0
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_-])gh pr create([^[:alnum:]_-]|$)' || exit 0
# The review PR itself must not trigger the offer.
printf '%s' "$cmd" | grep -q 'architecture-review' && exit 0
# PostToolUse fires only when the command exited 0, and `|| true` fakes that.
# gh prints the new PR's URL, so no URL means no PR.
printf '%s' "$input" |
  jq -e '.hook_event_name == "PostToolUse" and (.tool_response.interrupted | not) and
    ((.tool_response.stdout // "") | test("/pull/[0-9]+"))' >/dev/null 2>&1 ||
  exit 0

# Offer at most once per clone per day, whatever the answer. The common git
# dir is shared by every worktree of the clone.
git_dir=$(git rev-parse --git-common-dir 2>/dev/null) || exit 0
today=$(date +%Y-%m-%d)
[ "$(cat "$git_dir/agent-ready-review-offered" 2>/dev/null)" = "$today" ] && exit 0

# BSD date first, GNU date second.
since=$(date -v-"$days"d +%Y-%m-%d 2>/dev/null ||
  date -d "-$days days" +%Y-%m-%d 2>/dev/null) || exit 0
hit=$(gh pr list --state merged --label architecture-review \
  --search "merged:>=$since" --limit 1 --json number --jq length 2>/dev/null) || exit 0
[ "$hit" = "0" ] || exit 0
# Someone is already on it. An open review PR older than N days counts as abandoned.
open=$(gh pr list --state open --label architecture-review \
  --search "created:>=$since" --limit 1 --json number --jq length 2>/dev/null) || exit 0
[ "$open" = "0" ] || exit 0

echo "$today" >"$git_dir/agent-ready-review-offered"
# No documented hook field tells an interactive session from a headless one,
# so the text carries that rule.
jq -n --arg d "$days" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext:
  ("Architecture review due. In a session with the user in the chat, ask once: \"No architecture review in " + $d + " days. Open a fresh worktree where you type /improve-codebase-architecture? This PR stays as it is.\" Yes: open a worktree off the default branch, switch into it, and ask the user to type /improve-codebase-architecture there; its hook names the branch and label. No: carry on. In an AFK run, carry on without asking.")}}'
