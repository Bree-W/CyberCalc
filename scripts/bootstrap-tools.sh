#!/usr/bin/env bash
# Clone the pinned CyberChef and Aperi'Solve checkouts. Does not modify either tree.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/Combined_Repos"
mkdir -p "$DEST"

pin() {
  local url="$1"
  local dir="$2"
  local sha="$3"
  if [[ -d "$dir/.git" ]]; then
    local actual
    actual="$(git -C "$dir" rev-parse HEAD)"
    if [[ "$actual" == "$sha" ]]; then
      echo "ok  $dir @ $sha"
    else
      echo "warn  $dir is $actual, expected $sha" >&2
    fi
    return
  fi
  git clone "$url" "$dir"
  git -C "$dir" checkout "$sha"
}

pin "https://github.com/gchq/CyberChef.git" \
  "$DEST/CyberChef" \
  "11b86fecdb5d8f6244cf931e1f87cec887ec1f1f"

pin "https://github.com/Zeecka/AperiSolve.git" \
  "$DEST/AperiSolve" \
  "9084bad5f73eecef6b8f7f1aacdfe7fab0935331"
