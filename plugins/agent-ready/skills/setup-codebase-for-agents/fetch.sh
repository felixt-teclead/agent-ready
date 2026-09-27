#!/usr/bin/env sh
# Copies the agent-ready skills and hooks from felixt-teclead/blueprint into
# .agents/, for a repo without the plugin. Adds Pocock's skills at the tag
# blueprint's marketplace.json pins for mattpocock-skills, each folder flat in
# .agents/skills/, with his MIT notice. Records a hash per file in
# .agents/blueprint-manifest.json. Run it from the repo root.
#
# The first run installs, every later run refreshes. For each path the
# manifest or the fetch knows, with L the local hash, M the manifest's and
# S the fetched one (each empty when the file is absent):
#   L = S  nothing to do
#   M = "" not ours: a file the manifest does not know blocks the path
#   L = M  untouched: take S, which writes, overwrites or deletes the file
#   S = M  edited here, unchanged upstream: keep, no question
#   else   conflict: diff shown, decided by --keep or --replace
# A blocked path writes nothing and exits 1; the owner renames or deletes the
# file. An undecided conflict writes nothing and exits 3. The manifest records
# S for a kept file too, so the next run asks only if S changes. A run that
# would change no file and no manifest hash prints "Up to date" and writes
# nothing.
#
# Usage: fetch.sh [--keep .agents/<path>]... [--replace .agents/<path>]...
# BLUEPRINT_REF picks the blueprint commit, default main.

set -eu

keep=
replace=
while [ $# -gt 0 ]; do
  case $1 in
    --keep) keep="$keep $2" ;;
    --replace) replace="$replace $2" ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift 2
done
has() { case " $1 " in *" $2 "*) return 0 ;; esac; return 1; }

src=felixt-teclead/blueprint
sha=$(gh api "repos/$src/commits/${BLUEPRINT_REF:-main}" --jq .sha)
raw='Accept: application/vnd.github.raw'

pin=$(gh api -H "$raw" "repos/$src/contents/.claude-plugin/marketplace.json?ref=$sha" \
  --jq '.plugins[] | select(.name == "mattpocock-skills") | .source | "\(.repo) \(.ref)"')
up=${pin% *}
ref=${pin#* }
if [ -z "$pin" ] || [ -z "$up" ] || [ -z "$ref" ]; then
  echo "No pinned mattpocock-skills entry in $src@$sha. Nothing was copied." >&2
  exit 1
fi
upsha=$(gh api "repos/$up/commits/$ref" --jq .sha)
upskills=$(gh api -H "$raw" "repos/$up/contents/.claude-plugin/plugin.json?ref=$upsha" \
  --jq '.skills[]')

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT INT TERM

wild=
tar --version 2>/dev/null | grep -q 'GNU tar' && wild=--wildcards
mkdir "$tmp/new"
gh api "repos/$src/tarball/$sha" |
  tar xzf - -C "$tmp/new" --strip-components=3 $wild \
    '*/plugins/agent-ready/skills' '*/plugins/agent-ready/hooks'

mkdir "$tmp/up"
gh api "repos/$up/tarball/$upsha" |
  tar xzf - -C "$tmp/up" --strip-components=1 $wild '*/skills' '*/LICENSE'
names=
for s in $upskills; do
  n=$(basename "$s")
  if [ -e "$tmp/new/skills/$n" ]; then
    echo "Skill $n is in both $src and $up. Nothing was copied." >&2
    exit 1
  fi
  cp -R "$tmp/up/$s" "$tmp/new/skills/$n"
  names="$names $n"
done
cp "$tmp/up/LICENSE" "$tmp/new/skills/LICENSE-mattpocock-skills"

if command -v sha256sum >/dev/null 2>&1; then
  hash() { sha256sum "$1" | cut -d' ' -f1; }
else
  hash() { shasum -a 256 "$1" | cut -d' ' -f1; }
fi

manifest=.agents/blueprint-manifest.json
touch "$tmp/old"
[ -f "$manifest" ] &&
  sed -n 's/^ *"\(\.agents\/[^"]*\)": "\([0-9a-f]*\)",\{0,1\}$/\1 \2/p' "$manifest" >"$tmp/old"
(cd "$tmp/new" && find skills hooks -type f | sed 's|^|.agents/|') >"$tmp/fetched"
paths=$(cut -d' ' -f1 "$tmp/old" | cat - "$tmp/fetched" | LC_ALL=C sort -u)

oldsha=$(awk -F'"' '$2 == "commit" { print $4; exit }' "$manifest" 2>/dev/null || :)
oldref=$(awk -F'"' '$2 == "ref" { print $4; exit }' "$manifest" 2>/dev/null || :)

take=
kept=
open=
clash=
for p in $paths; do
  f=${p#.agents/}
  l=
  [ -f "$p" ] && l=$(hash "$p")
  m=$(awk -v p="$p" '$1 == p { print $2 }' "$tmp/old")
  s=
  [ -f "$tmp/new/$f" ] && s=$(hash "$tmp/new/$f")
  if [ "$l" = "$s" ]; then :
  elif [ -z "$m" ] && [ -n "$l" ]; then clash="$clash $p"
  elif [ "$l" = "$m" ] || has "$replace" "$p"; then take="$take $p"
  elif [ "$s" = "$m" ] || has "$keep" "$p"; then kept="$kept $p"
  else open="$open $p"
  fi
done

if [ -n "$clash" ]; then
  echo "These files are not in the manifest and differ from the fetched ones. Nothing was copied:" >&2
  for p in $clash; do echo "  $p" >&2; done
  exit 1
fi

if [ -n "$open" ]; then
  echo "These files differ from the fetched ones and from the manifest. Nothing was copied:" >&2
  for p in $open; do
    f=${p#.agents/}
    echo >&2
    old=$p
    [ -f "$old" ] || old=/dev/null
    new=$tmp/new/$f
    [ -f "$new" ] || new=/dev/null
    diff -u -L "$p (here)" -L "$p (fetched)" "$old" "$new" >&2 || :
  done
  echo >&2
  echo "Rerun with BLUEPRINT_REF=$sha and one --keep or --replace per file." >&2
  exit 3
fi

{
  printf '{\n  "source": "%s",\n  "commit": "%s",\n' "$src" "$sha"
  printf '  "mattpocock-skills": {\n    "source": "%s",\n    "ref": "%s",\n    "commit": "%s",\n    "skills": [' \
    "$up" "$ref" "$upsha"
  sep=
  for n in $names; do
    printf '%s"%s"' "$sep" "$n"
    sep=', '
  done
  printf ']\n  },\n  "files": {'
  sep=
  for p in $(LC_ALL=C sort "$tmp/fetched"); do
    printf '%s\n    "%s": "%s"' "$sep" "$p" "$(hash "$tmp/new/${p#.agents/}")"
    sep=,
  done
  printf '\n  }\n}\n'
} >"$tmp/manifest"

files() { sed -n '/"files"/,$p' "$1"; }
if [ -f "$manifest" ] && [ -z "$take" ] && [ "$(files "$tmp/manifest")" = "$(files "$manifest")" ]; then
  echo "Up to date with $src@$sha and $up@$ref."
  exit 0
fi

# rm before cp: a new inode, so a running copy of this script reads on unharmed.
for p in $take; do
  f=${p#.agents/}
  rm -f "$p"
  if [ -f "$tmp/new/$f" ]; then
    mkdir -p "$(dirname "$p")"
    cp -p "$tmp/new/$f" "$p"
  else
    d=$(dirname "$p")
    while [ "$d" != .agents ] && rmdir "$d" 2>/dev/null; do d=$(dirname "$d"); done
  fi
done

mkdir -p .agents
cp "$tmp/manifest" "$manifest"

echo "From $src@${oldsha:-none} to $sha, $up@${oldref:-none} to $ref."
for p in $take; do
  if [ -f "$p" ]; then echo "written: $p"; else echo "deleted: $p"; fi
done
for p in $kept; do echo "kept: $p"; done
