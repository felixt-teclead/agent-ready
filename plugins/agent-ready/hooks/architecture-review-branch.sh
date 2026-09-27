#!/bin/sh
# When improve-codebase-architecture starts, tells the agent to put the review
# on its own branch and label the PR, so the team's reminder can find it.
# PreToolUse on Skill catches the agent's call, UserPromptSubmit the typed
# command. Off unless the team set a window in days.
case $AGENT_READY_ARCHITECTURE_REVIEW_DAYS in ''|*[!0-9]*|0) exit 0 ;; esac

input=$(cat)
if command -v jq >/dev/null 2>&1; then
  event=$(printf '%s' "$input" | jq -r '.hook_event_name // "UserPromptSubmit"')
  hit=$(printf '%s' "$input" | jq -r '.tool_input.skill // .prompt // empty')
else
  event=UserPromptSubmit
  printf '%s' "$input" | grep -q '"hook_event_name" *: *"PreToolUse"' &&
    event=PreToolUse
  hit=$(printf '%s' "$input" | sed -nE 's/.*"(skill|prompt)" *: *"([^"]*)".*/\2/p')
fi

# Plain name in the no-plugin channel, plugin-qualified with the plugin.
printf '%s' "$hit" |
  grep -Eq '^[[:space:]]*/?([[:alnum:]_-]+:)?improve-codebase-architecture([^[:alnum:]_-]|$)' ||
  exit 0

default=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null) ||
  default='origin/<default>'
msg="Architecture review: run it on its own branch off $default, named architecture-review/<date>, and open its PR with the label architecture-review. Tickets or ADRs the review spins out ride in that PR. The label is how the reminder knows a review ran."
printf '{"hookSpecificOutput":{"hookEventName":"%s","additionalContext":"%s"}}\n' "$event" "$msg"
