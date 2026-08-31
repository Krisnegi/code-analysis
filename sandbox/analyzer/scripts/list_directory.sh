#!/usr/bin/env bash
set -e

WORKSPACE_DIR="/workspace"
REL_PATH="${1:-.}"

cd "$WORKSPACE_DIR"

if [ ! -d "$REL_PATH" ]; then
  echo "{\"error\": \"Directory not found\", \"path\": \"$REL_PATH\"}"
  exit 1
fi

ITEMS=$(find "$REL_PATH" -maxdepth 2 -not -path '*/.*' -not -path '*/node_modules/*' | sort | head -100)
ITEMS_JSON=$(echo "$ITEMS" | jq -R . | jq -s .)

cat <<EOF
{
  "path": "$REL_PATH",
  "items": $ITEMS_JSON
}
EOF
