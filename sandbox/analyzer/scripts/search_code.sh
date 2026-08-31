#!/usr/bin/env bash
set -e

WORKSPACE_DIR="/workspace"
PATTERN="$1"
SEARCH_DIR="${2:-.}"

if [ -z "$PATTERN" ]; then
  echo '{"error": "Pattern argument required"}'
  exit 1
fi

cd "$WORKSPACE_DIR"

MATCHES=$(grep -rnF "$PATTERN" "$SEARCH_DIR" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -50 || true)

MATCHES_JSON=$(echo "$MATCHES" | jq -R . | jq -s . | jq 'map(select(. != ""))')

cat <<EOF
{
  "pattern": "$PATTERN",
  "searchDir": "$SEARCH_DIR",
  "matches": $MATCHES_JSON
}
EOF
