#!/bin/sh
# Blocks every merge through `gh api`, and `gh pr merge` when the pull request touches a steering path.
# The path set lives here, not in the repo, so a pull request cannot rewrite it.
# Keep it in step with AGENTS.md §"Steering files" here and in the setup skill's templates/AGENTS.md.
# docs/CODING_CONVENTIONS.md is the old name of docs/CODING_STANDARDS.md. A repo keeps it until cleanup renames it.
[ "$CLAUDE_PLUGIN_OPTION_STEERING_GATE" = "false" ] && exit 0

input=$(cat)
if ! command -v jq >/dev/null 2>&1; then
  printf '%s' "$input" | grep -Eq 'gh pr merge|gh api.*(/merge|mergePullRequest|enablePullRequestAutoMerge)' || exit 0
  echo "The steering merge gate needs jq to read this command. A human merges this." >&2
  exit 2
fi
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

# A merge through the raw API skips the diff check below, so an agent never gets it.
if printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_-])gh api([^[:alnum:]_-]|$)' &&
  printf '%s' "$cmd" | grep -Eq 'pulls/[^/[:space:]]+/merge|mergePullRequest|enablePullRequestAutoMerge'; then
  echo "Agents do not merge through gh api. Use gh pr merge, or a human merges this." >&2
  exit 2
fi

# Quoted text is dropped first, so a commit message that names the command does not trip the gate.
bare=$(printf '%s\n' "$cmd" | sed -e 's/"[^"]*"/Q/g' -e "s/'[^']*'/Q/g")
printf '%s' "$bare" | grep -Eq '(^|[^[:alnum:]_-])gh pr merge([^[:alnum:]_-]|$)' || exit 0

args=$(printf '%s\n' "$bare" | sed -n 's/.*gh pr merge//p' | head -n 1 | sed 's/[;&|].*//')
set -f
set -- $args
set +f
sel=
repo=
while [ $# -gt 0 ]; do
  case $1 in
    -R | --repo) [ $# -gt 1 ] && shift; repo=$1 ;;
    --repo=*) repo=${1#*=} ;;
    -b | --body | -F | --body-file | -t | --subject | -A | --author-email | --match-head-commit) [ $# -gt 1 ] && shift ;;
    -*) ;;
    *) [ -z "$sel" ] && sel=$1 ;;
  esac
  shift
done

set --
[ -n "$sel" ] && set -- "$sel"
[ -n "$repo" ] && set -- "$@" -R "$repo"

# The full patch, not --name-only: that lists only the new name of a renamed file.
if ! patch=$(gh pr diff "$@" 2>/dev/null); then
  echo "Cannot read the diff of this pull request, so it may touch a steering file. A human merges this." >&2
  exit 2
fi

hits=$(printf '%s\n' "$patch" |
  awk '/^diff --git a\//{ sub(/^diff --git a\//, ""); n = index($0, " b/"); print substr($0, 1, n - 1); print substr($0, n + 3) }' |
  grep -E '^(AGENTS\.md|CLAUDE\.md|docs/CODING_(STANDARDS|CONVENTIONS)\.md|\.github/CODEOWNERS|\.claude/settings\.json|plugins/agent-ready/\.claude-plugin/plugin\.json|(docs/agents|\.agents/skills|\.agents/hooks|plugins/agent-ready/hooks)/.+)$' |
  sort -u)
[ -z "$hits" ] && exit 0

{
  echo "This pull request touches steering files. A human merges this."
  printf '%s\n' "$hits"
} >&2
exit 2
