#!/usr/bin/env sh
# Copies the agent-ready skills and hooks from felixt-teclead/blueprint into
# .agents/, for a repo without the plugin. Adds Pocock's skills at the tag
# blueprint's marketplace.json pins for mattpocock-skills, each folder flat in
# .agents/skills/, with his MIT notice. Records a hash per file in
# .agents/blueprint-manifest.json. Run it from the repo root.
#
# Install (no arguments): a file that exists and differs is never
# overwritten: the script lists every such file and exits 1 before it writes
# anything.
#
# --update: the manifest hash tells an edited file from an unedited one. An
# unedited file takes the new version, or goes if blueprint dropped it. An
# edited file blueprint left alone stays. An edited file blueprint changed or
# dropped needs a decision: the script prints its diff and exits 3 before it
# writes anything. Rerun with the printed --at and one --keep <path> or
# --replace <path> per file. The manifest always records the hash blueprint
# shipped, so a kept edit is asked about again on the next update.
#
# The body is one function, so the shell has read all of it before an update
# overwrites this file.

main() {
  set -eu

  mode=install
  at=
  keep=
  replace=
  while [ $# -gt 0 ]; do
    case $1 in
      --update) mode=update ;;
      --at) at=$2; shift ;;
      --keep) keep="$keep $2"; shift ;;
      --replace) replace="$replace $2"; shift ;;
      *) echo "Unknown argument: $1" >&2; exit 1 ;;
    esac
    shift
  done

  src=felixt-teclead/blueprint
  manifest=.agents/blueprint-manifest.json
  raw='Accept: application/vnd.github.raw'

  if [ "$mode" = update ] && [ ! -f "$manifest" ]; then
    echo "No $manifest. Run setup first. Nothing was copied." >&2
    exit 1
  fi

  sha=${at:-$(gh api "repos/$src/commits/main" --jq .sha)}
  pin=$(gh api -H "$raw" "repos/$src/contents/.claude-plugin/marketplace.json?ref=$sha" \
    --jq '.plugins[] | select(.name == "mattpocock-skills") | .source | "\(.repo) \(.ref)"')
  up=${pin% *}
  ref=${pin#* }
  if [ -z "$pin" ] || [ -z "$up" ] || [ -z "$ref" ]; then
    echo "No pinned mattpocock-skills entry in $src@$sha. Nothing was copied." >&2
    exit 1
  fi
  upsha=$(gh api "repos/$up/commits/$ref" --jq .sha)

  if [ "$mode" = update ]; then
    oldsha=$(awk -F'"' '$2 == "commit" { print $4; exit }' "$manifest")
    oldref=$(awk -F'"' '$2 == "ref" { print $4; exit }' "$manifest")
    oldupsha=$(awk -F'"' '$2 == "commit" { n++ } $2 == "commit" && n == 2 { print $4; exit }' "$manifest")
    if [ "$oldsha" = "$sha" ] && [ "$oldupsha" = "$upsha" ]; then
      echo "Up to date: $src@$sha and $up@$ref."
      exit 0
    fi
  fi

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
  rm -rf "$tmp/up"

  if command -v sha256sum >/dev/null 2>&1; then
    hash() { sha256sum "$1" | cut -d' ' -f1; }
  else
    hash() { shasum -a 256 "$1" | cut -d' ' -f1; }
  fi

  files=$(cd "$tmp" && find skills hooks -type f | LC_ALL=C sort)

  if [ "$mode" = install ]; then
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
    write=$files
    drop=
  else
    oldhash() { awk -F'"' -v p="$1" '$2 == p { print $4; exit }' "$manifest"; }
    has() { case " $1 " in *" $2 "*) return 0 ;; esac; return 1; }
    # decide <path>: echo write, keep or ask for a file that needs a decision.
    decide() {
      if has "$replace" "$1"; then echo write
      elif has "$keep" "$1"; then echo keep
      else echo ask
      fi
    }

    write=
    drop=
    kept=
    ask=
    clash=
    for f in $files; do
      p=.agents/$f
      n=$(hash "$tmp/$f")
      o=$(oldhash "$p")
      if [ -e "$p" ]; then
        l=$(hash "$p")
        if [ "$l" = "$n" ]; then continue
        elif [ -z "$o" ]; then clash="$clash $p"; continue
        elif [ "$l" = "$o" ]; then write="$write $f"; continue
        elif [ "$n" = "$o" ]; then kept="$kept $p"; continue
        fi
      elif [ -z "$o" ]; then write="$write $f"; continue
      elif [ "$n" = "$o" ]; then kept="$kept $p"; continue
      fi
      case $(decide "$p") in
        write) write="$write $f" ;;
        keep) kept="$kept $p" ;;
        ask) ask="$ask $p" ;;
      esac
    done
    for p in $(awk -F'"' '$2 ~ /^\.agents\// { print $2 }' "$manifest"); do
      if has "$(echo $files)" "${p#.agents/}" || [ ! -e "$p" ]; then continue; fi
      if [ "$(hash "$p")" = "$(oldhash "$p")" ]; then drop="$drop $p"; continue; fi
      case $(decide "$p") in
        write) drop="$drop $p" ;;
        keep) kept="$kept $p" ;;
        ask) ask="$ask $p" ;;
      esac
    done

    if [ -n "$clash" ]; then
      echo "These files are not in $manifest but exist and differ from the fetched ones. Nothing was copied:" >&2
      for p in $clash; do echo "  $p" >&2; done
      exit 1
    fi
    if [ -n "$ask" ]; then
      echo "These files were edited here and changed or dropped in $src@$sha. Nothing was copied."
      for p in $ask; do
        f=${p#.agents/}
        new=$tmp/$f
        [ -e "$new" ] || new=/dev/null
        old=$p
        [ -e "$old" ] || old=/dev/null
        echo
        echo "=== $p"
        diff -u "$old" "$new" || true
      done
      echo
      echo "Rerun with: --update --at $sha, then --keep <path> or --replace <path> for each file."
      exit 3
    fi
    if [ -z "$write" ] && [ -z "$drop" ]; then
      echo "Up to date: no file changed between $src@$oldsha and $src@$sha."
      exit 0
    fi
  fi

  mkdir -p .agents
  for f in $write; do
    mkdir -p ".agents/$(dirname "$f")"
    cp -p "$tmp/$f" ".agents/$f"
  done
  for p in $drop; do
    rm "$p"
    rmdir -p "$(dirname "$p")" 2>/dev/null || true
  done
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
      printf '%s\n    ".agents/%s": "%s"' "$sep" "$f" "$(hash "$tmp/$f")"
      sep=,
    done
    printf '\n  }\n}\n'
  } >"$manifest"

  if [ "$mode" = install ]; then
    echo "Copied $(printf '%s\n' $files | wc -l | tr -d ' ') files from $src@$sha and $up@$ref."
  else
    echo "Updated $src@$oldsha -> $sha, $up@$oldref -> $ref."
    for f in $write; do echo "written: .agents/$f"; done
    for p in $drop; do echo "deleted: $p"; done
    for p in $kept; do echo "kept: $p"; done
  fi
}

main "$@"
