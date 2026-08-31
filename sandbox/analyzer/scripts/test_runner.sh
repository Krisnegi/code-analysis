#!/usr/bin/env bash
set -e

WORKSPACE_DIR="/workspace"

if [ ! -d "$WORKSPACE_DIR" ]; then
  echo '{"error": "Workspace directory not found"}'
  exit 1
fi

cd "$WORKSPACE_DIR"

TEST_FILES=$(find . -type f \( -name '*.test.ts' -o -name '*.spec.ts' -o -name '*.test.js' -o -name '*.spec.js' -o -name 'test_*.py' -o -name '*_test.py' \) -not -path '*/node_modules/*' | wc -l | tr -d ' ')

FRAMEWORK="none"
TEST_PASSED=0
TEST_FAILED=0
TIMED_OUT=false
COVERAGE="0%"

if [ -f "package.json" ]; then
  FRAMEWORK="npm/jest/vitest"
  npm install --ignore-scripts --no-audit --no-fund --silent 2>/dev/null || true
  TEST_OUT=$(timeout 30 npm test 2>&1 || true)
  if echo "$TEST_OUT" | grep -qi "pass"; then
    TEST_PASSED=$(echo "$TEST_OUT" | grep -ci "pass" || true)
  fi
  if echo "$TEST_OUT" | grep -qi "fail"; then
    TEST_FAILED=$(echo "$TEST_OUT" | grep -ci "fail" || true)
  fi
elif [ -f "pytest.ini" ] || [ -f "setup.py" ] || [ -f "requirements.txt" ]; then
  FRAMEWORK="pytest"
  TEST_OUT=$(timeout 30 pytest --junitxml=report.xml 2>&1 || true)
  if echo "$TEST_OUT" | grep -qi "passed"; then
    TEST_PASSED=$(echo "$TEST_OUT" | grep -oE '[0-9]+ passed' | awk '{print $1}' || echo 0)
  fi
  if echo "$TEST_OUT" | grep -qi "failed"; then
    TEST_FAILED=$(echo "$TEST_OUT" | grep -oE '[0-9]+ failed' | awk '{print $1}' || echo 0)
  fi
fi

TOTAL_TESTS=$((TEST_PASSED + TEST_FAILED))
if [ "$TOTAL_TESTS" -gt 0 ]; then
  COVERAGE="$(( (TEST_PASSED * 100) / TOTAL_TESTS ))%"
fi

cat <<EOF
{
  "testFileCount": $TEST_FILES,
  "framework": "$FRAMEWORK",
  "passed": $TEST_PASSED,
  "failed": $TEST_FAILED,
  "coverage": "$COVERAGE",
  "timedOut": $TIMED_OUT
}
EOF
