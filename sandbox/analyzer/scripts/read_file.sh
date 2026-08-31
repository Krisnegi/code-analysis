#!/usr/bin/env bash
set -e

WORKSPACE_DIR="/workspace"
REL_PATH="$1"

if [ -z "$REL_PATH" ]; then
  echo '{"error": "Path argument required"}'
  exit 1
fi

cd "$WORKSPACE_DIR"

if [ ! -f "$REL_PATH" ]; then
  echo "{\"error\": \"File not found\", \"path\": \"$REL_PATH\"}"
  exit 1
fi

CONTENT=$(cat "$REL_PATH" | jq -sR .)
LINE_COUNT=$(wc -l < "$REL_PATH" | tr -d ' ')

cat <<EOF
{
  "path": "$REL_PATH",
  "lineCount": $LINE_COUNT,
  "content": $CONTENT
}
EOF
