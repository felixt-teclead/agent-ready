#!/bin/sh
# Puts the refactor phase into every session, so AGENTS.md carries no line
# for it. Stdout of a SessionStart hook becomes context. Runs in the project
# directory.
[ -f .agents/refactor.md ] || exit 0

if grep -q '^paused:' .agents/refactor.local 2>/dev/null; then
  echo "Refactor phase paused for you (.agents/refactor.local):"
  grep '^paused:' .agents/refactor.local
  echo
fi

echo "Refactor phase (.agents/refactor.md); the agent-ready:cleanup skill runs it:"
cat .agents/refactor.md

# Files left = the path list minus every done file. No gh, so it works on
# any tracker.
set -- .agents/refactor-done/*.txt
[ -e "$1" ] || set --
left=$(awk -v list=.agents/refactor-paths.txt '
  FILENAME == list { if (NF && !($0 in done)) n++; next }
  { done[$0] = 1 }
  END { print n + 0 }' "$@" .agents/refactor-paths.txt 2>/dev/null)
echo "Files left (.agents/refactor-paths.txt minus .agents/refactor-done/): ${left:-0}"
