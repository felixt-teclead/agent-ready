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

echo "Refactor phase (.agents/refactor.md); the cleanup skill (agent-ready:cleanup with the plugin) runs it:"
cat .agents/refactor.md

# Files left = the path list minus every done file, minus paths no longer in
# the tree (cleanup/phase-files.md). No gh, so it works on any tracker. CRLF files
# count like LF ones.
list=.agents/refactor-paths.txt
if [ -f "$list" ]; then
  set -- .agents/refactor-done/*.txt
  [ -e "$1" ] || set --
  left=$(awk -v list="$list" '
    { sub(/\r$/, "") }
    FILENAME == list { if (NF && !($0 in done) && !($0 in seen)) { seen[$0] = 1; print } next }
    { done[$0] = 1 }' "$@" "$list" |
    { n=0; while IFS= read -r p; do [ -e "$p" ] && n=$((n + 1)); done; echo "$n"; })
  echo "Files left ($list minus .agents/refactor-done/ and deleted paths): $left"
else
  echo "Path list $list missing."
fi

# A continuous phase runs after the task, so an unattended agent needs the
# nudge. comment-review has dropped these files, or did not run.
if grep -q '^mode: *continuous' .agents/refactor.md &&
  ! grep -q '^comments: *false' .agents/refactor.md &&
  ! grep -qs '^paused:' .agents/refactor.md .agents/refactor.local; then
  echo "After you open a PR, run the cleanup skill (continuous step) in this session."
fi
