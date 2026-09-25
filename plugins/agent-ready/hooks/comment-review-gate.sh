#!/bin/sh
# Blocks `git push` and `gh pr create` until comment-review has stamped HEAD.
# A plugin option cannot switch a hook off, so the script reads it itself.
[ "$CLAUDE_PLUGIN_OPTION_COMMENT_REVIEW" = "false" ] && exit 0

input=$(cat)
if command -v jq >/dev/null 2>&1; then
  cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
else
  cmd=$input
fi

printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_-])(git( -C [^ ]+)? push|gh pr create)([^[:alnum:]_-]|$)' || exit 0

git_dir=$(git rev-parse --git-dir 2>/dev/null) || exit 0
head=$(git rev-parse HEAD 2>/dev/null) || exit 0
[ "$(cat "$git_dir/comment-review-ok" 2>/dev/null)" = "$head" ] && exit 0

echo "Comments on this branch are unreviewed. Run the comment-review skill; it stamps HEAD when done, then retry." >&2
exit 2
