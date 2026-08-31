#!/usr/bin/env bash
set -e

WORKSPACE_DIR="/workspace"

if [ ! -d "$WORKSPACE_DIR" ]; then
  echo '{"error": "Workspace directory not found"}'
  exit 1
fi

cd "$WORKSPACE_DIR"

# Count files by extension
TOTAL_FILES=$(find . -maxdepth 4 -type f -not -path '*/.*' -not -path '*/node_modules/*' | wc -l | tr -d ' ')
TS_FILES=$(find . -type f -name '*.ts' -o -name '*.tsx' -not -path '*/node_modules/*' | wc -l | tr -d ' ')
JS_FILES=$(find . -type f -name '*.js' -o -name '*.jsx' -not -path '*/node_modules/*' | wc -l | tr -d ' ')
PY_FILES=$(find . -type f -name '*.py' -not -path '*/node_modules/*' -not -path '*/venv/*' | wc -l | tr -d ' ')

PRIMARY_LANG="unknown"
if [ "$TS_FILES" -gt 0 ] || [ "$JS_FILES" -gt 0 ]; then
  PRIMARY_LANG="JavaScript/TypeScript"
elif [ "$PY_FILES" -gt 0 ]; then
  PRIMARY_LANG="Python"
fi

LINT_ERRORS=0
LINT_WARNINGS=0
COMPLEX_FILES=()

# Run ESLint if JS/TS files exist
if [ "$TS_FILES" -gt 0 ] || [ "$JS_FILES" -gt 0 ]; then
  ESLINT_OUT=$(npx eslint . --format json --no-eslintrc --parser @typescript-eslint/parser --parser-options '{"ecmaVersion":2022,"sourceType":"module"}' 2>/dev/null || true)
  if [ -n "$ESLINT_OUT" ] && echo "$ESLINT_OUT" | jq empty 2>/dev/null; then
    LINT_ERRORS=$(echo "$ESLINT_OUT" | jq '[.[].errorCount] | add // 0')
    LINT_WARNINGS=$(echo "$ESLINT_OUT" | jq '[.[].warningCount] | add // 0')
  fi
fi

# Run Pylint if Python files exist
if [ "$PY_FILES" -gt 0 ]; then
  PYLINT_OUT=$(pylint --output-format=json $(find . -type f -name '*.py' -not -path '*/node_modules/*' | head -20) 2>/dev/null || true)
  if [ -n "$PYLINT_OUT" ] && echo "$PYLINT_OUT" | jq empty 2>/dev/null; then
    PY_ERRS=$(echo "$PYLINT_OUT" | jq '[.[] | select(.type=="error")] | length')
    PY_WARNS=$(echo "$PYLINT_OUT" | jq '[.[] | select(.type=="warning")] | length')
    LINT_ERRORS=$((LINT_ERRORS + PY_ERRS))
    LINT_WARNINGS=$((LINT_WARNINGS + PY_WARNS))
  fi
fi

# Get largest/complex files
while IFS= read -r file; do
  if [ -n "$file" ]; then
    COMPLEX_FILES+=("$file")
  fi
done < <(find . -type f \( -name '*.ts' -o -name '*.js' -o -name '*.py' \) -not -path '*/node_modules/*' -exec wc -l {} + 2>/dev/null | sort -nr | head -6 | awk '{print $2}' | grep -v 'total' || true)

COMPLEX_JSON=$(printf '%s\n' "${COMPLEX_FILES[@]}" | jq -R . | jq -s .)

cat <<EOF
{
  "language": "$PRIMARY_LANG",
  "totalFiles": $TOTAL_FILES,
  "tsFiles": $TS_FILES,
  "jsFiles": $JS_FILES,
  "pyFiles": $PY_FILES,
  "lintErrors": $LINT_ERRORS,
  "lintWarnings": $LINT_WARNINGS,
  "complexFiles": $COMPLEX_JSON
}
EOF
