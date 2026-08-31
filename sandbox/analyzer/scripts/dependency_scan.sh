#!/usr/bin/env bash
set -e

WORKSPACE_DIR="/workspace"

if [ ! -d "$WORKSPACE_DIR" ]; then
  echo '{"error": "Workspace directory not found"}'
  exit 1
fi

cd "$WORKSPACE_DIR"

CRITICAL_VULNS=()
OUTDATED_COUNT=0
DEPENDENCY_COUNT=0

if [ -f "package.json" ]; then
  DEPENDENCY_COUNT=$(jq '(.dependencies // {}) + (.devDependencies // {}) | length' package.json 2>/dev/null || echo 0)
  AUDIT_OUT=$(timeout 10 npm audit --json 2>/dev/null || true)
  if [ -n "$AUDIT_OUT" ] && echo "$AUDIT_OUT" | jq empty 2>/dev/null; then
    while IFS= read -r v; do
      if [ -n "$v" ]; then CRITICAL_VULNS+=("$v"); fi
    done < <(echo "$AUDIT_OUT" | jq -r '.vulnerabilities | keys[]?' 2>/dev/null || true)
  fi
elif [ -f "requirements.txt" ]; then
  DEPENDENCY_COUNT=$(wc -l < requirements.txt | tr -d ' ' || echo 0)
  AUDIT_OUT=$(timeout 10 pip-audit -f json 2>/dev/null || true)
  if [ -n "$AUDIT_OUT" ] && echo "$AUDIT_OUT" | jq empty 2>/dev/null; then
    while IFS= read -r v; do
      if [ -n "$v" ]; then CRITICAL_VULNS+=("$v"); fi
    done < <(echo "$AUDIT_OUT" | jq -r '.[].id' 2>/dev/null || true)
  fi
fi

CRITICAL_JSON=$(printf '%s\n' "${CRITICAL_VULNS[@]}" | jq -R . | jq -s . | jq 'map(select(. != ""))')

cat <<EOF
{
  "dependencyCount": $DEPENDENCY_COUNT,
  "criticalVulns": $CRITICAL_JSON,
  "outdatedCount": $OUTDATED_COUNT
}
EOF
