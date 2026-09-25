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
left=$(grep -c . .agents/refactor-paths.txt 2>/dev/null)
echo "Files left on .agents/refactor-paths.txt: ${left:-0}"
