#!/bin/sh
# When the user types /improve-codebase-architecture, tells the agent to put
# the review on its own branch and label the PR, so the reminder can find it.
# UserPromptSubmit only: the skill cannot be model-invoked, so a Skill hook
# never fires for it. Off unless the team set a window in days.
case $AGENT_READY_ARCHITECTURE_REVIEW_DAYS in ''|*[!0-9]*|0) exit 0 ;; esac

input=$(cat)
if command -v jq >/dev/null 2>&1; then
  prompt=$(printf '%s' "$input" | jq -r '.prompt // empty')
else
  prompt=$(printf '%s' "$input" | sed -nE 's/.*"prompt" *: *"([^"]*)".*/\1/p')
fi

# Plain name in the no-plugin channel, plugin-qualified with the plugin.
printf '%s' "$prompt" |
  grep -Eq '^[[:space:]]*/([[:alnum:]_-]+:)?improve-codebase-architecture([^[:alnum:]_-]|$)' ||
  exit 0

base=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null) ||
  base='the default branch on origin'
msg="Architecture review: run it on its own branch off $base, named architecture-review/<date>, and open its PR with the label architecture-review. Tickets or ADRs the review spins out ride in that PR. The label is how the reminder knows a review ran: when gh reports the label missing, run gh label create architecture-review and retry."
printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$msg"
