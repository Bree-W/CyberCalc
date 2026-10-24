#!/usr/bin/env bash
# Start Aperi'Solve from the pinned checkout plus CyberCalc's override.
# Creates Combined_Repos/AperiSolve/.env from the example only when it is missing.
# That file is inside the gitignored checkout and is not committed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/Combined_Repos/AperiSolve"

if [[ ! -f "$APP/compose.yml" ]]; then
  echo "Aperi'Solve checkout is missing. Run scripts/bootstrap-tools.sh first." >&2
  exit 1
fi

if [[ ! -f "$APP/.env" ]]; then
  cp "$APP/.env.example" "$APP/.env"
fi

exec docker compose \
  -f "$APP/compose.yml" \
  -f "$ROOT/deploy/aperisolve.override.yml" \
  --project-directory "$APP" \
  up -d
