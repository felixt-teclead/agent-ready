#!/usr/bin/env sh
# Copies the agent-ready skills and hooks from felixt-teclead/blueprint into
# .agents/, for a repo without the plugin. Adds Pocock's skills at the tag
# blueprint's marketplace.json pins for mattpocock-skills, each folder flat in
# .agents/skills/, with his MIT notice. Records a hash per file in
# .agents/blueprint-manifest.json. Run it from the repo root.
#
# A file that exists and differs is never overwritten: the script lists every
# such file and exits 1 before it writes anything.

set -eu

src=felixt-teclead/blueprint
sha=$(gh api "repos/$src/commits/main" --jq .sha)
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
gh api "repos/$src/tarball/$sha" |
  tar xzf - -C "$tmp" --strip-components=3 $wild \
    '*/plugins/agent-ready/skills' '*/plugins/agent-ready/hooks'

mkdir "$tmp/up"
gh api "repos/$up/tarball/$upsha" |
  tar xzf - -C "$tmp/up" --strip-components=1 $wild '*/skills' '*/LICENSE'
names=
for s in $upskills; do
  n=$(basename "$s")
  if [ -e "$tmp/skills/$n" ]; then
    echo "Skill $n is in both $src and $up. Nothing was copied." >&2
    exit 1
  fi
  cp -R "$tmp/up/$s" "$tmp/skills/$n"
  names="$names $n"
done
cp "$tmp/up/LICENSE" "$tmp/skills/LICENSE-mattpocock-skills"

if command -v sha256sum >/dev/null 2>&1; then
  hash() { sha256sum "$1" | cut -d' ' -f1; }
else
  hash() { shasum -a 256 "$1" | cut -d' ' -f1; }
fi

files=$(cd "$tmp" && find skills hooks -type f | LC_ALL=C sort)

clash=
for f in $files; do
  if [ -e ".agents/$f" ] && ! cmp -s "$tmp/$f" ".agents/$f"; then
    clash="$clash .agents/$f"
  fi
done
if [ -n "$clash" ]; then
  echo "These files exist and differ from the fetched ones. Nothing was copied:" >&2
  for f in $clash; do echo "  $f" >&2; done
  exit 1
fi

mkdir -p .agents
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
  for f in $files; do
    mkdir -p ".agents/$(dirname "$f")"
    cp -p "$tmp/$f" ".agents/$f"
    printf '%s\n    ".agents/%s": "%s"' "$sep" "$f" "$(hash ".agents/$f")"
    sep=,
  done
  printf '\n  }\n}\n'
} >.agents/blueprint-manifest.json

echo "Copied $(printf '%s\n' $files | wc -l | tr -d ' ') files from $src@$sha and $up@$ref."
