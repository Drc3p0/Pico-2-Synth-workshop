#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: scripts/01-print-next-stage.sh <stage-number>"
  echo "Example: scripts/01-print-next-stage.sh 01"
  exit 1
fi

stage="$1"
file="$(ls plugin/prompts | grep "^${stage}-" | head -n 1 || true)"

if [ -z "$file" ]; then
  echo "No stage found for prefix: $stage"
  exit 1
fi

echo "===== plugin/prompts/$file ====="
cat "plugin/prompts/$file"
