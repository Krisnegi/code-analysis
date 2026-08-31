#!/usr/bin/env bash
set -e

WORKSPACE_DIR="/workspace"

if [ ! -d "$WORKSPACE_DIR" ]; then
  echo '{"error": "Workspace directory not found"}'
  exit 1
fi

cd "$WORKSPACE_DIR"

SECRETS_FOUND=()
RISK_LEVEL="low"

GITLEAKS_OUT=$(gitleaks detect --no-git --report-format json --report-path /tmp/gitleaks.json . 2>/dev/null || true)
if [ -f "/tmp/gitleaks.json" ]; then
  while IFS= read -r match; do
    if [ -n "$match" ]; then SECRETS_FOUND+=("$match"); fi
  done < <(jq -r '.[].Description + " in " + .File + ":" + (.StartLine|tostring)' /tmp/gitleaks.json 2>/dev/null || true)
fi

GREP_SECRETS=$(grep -rnE '(sk_live_[0-9a-zA-Z]{24}|sk-proj-[0-9a-zA-Z]{32}|AKIA[0-9A-Z]{16}|BEGIN PRIVATE KEY)' . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null || true)
if [ -n "$GREP_SECRETS" ]; then
  while IFS= read -r match; do
    if [ -n "$match" ]; then SECRETS_FOUND+=("Regex secret: $match"); fi
  done <<< "$GREP_SECRETS"
fi

COUNT=${#SECRETS_FOUND[@]}
if [ "$COUNT" -gt 3 ]; then
  RISK_LEVEL="critical"
elif [ "$COUNT" -gt 0 ]; then
  RISK_LEVEL="high"
fi

SECRETS_JSON=$(printf '%s\n' "${SECRETS_FOUND[@]}" | jq -R . | jq -s . | jq 'map(select(. != ""))')

cat <<EOF
{
  "secretsCount": $COUNT,
  "riskLevel": "$RISK_LEVEL",
  "secretsFound": $SECRETS_JSON
}
EOF
