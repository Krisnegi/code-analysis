#!/usr/bin/env bash
set -e

WORKSPACE_DIR="/workspace"

if [ ! -d "$WORKSPACE_DIR" ]; then
  echo '{"error": "Workspace directory not found"}'
  exit 1
fi

cd "$WORKSPACE_DIR"

# Universal test file discovery across JS/TS, Python, Go, Rust, C/C++
TEST_FILES=$(find . -type f \( \
  -name '*.test.*' -o -name '*.spec.*' -o \
  -name 'test_*.py' -o -name '*_test.py' -o \
  -name '*_test.go' -o -name '*.rs' -o \
  -path '*/test/*' -o -path '*/tests/*' -o -path '*/__tests__/*' -o -path '*/spec/*' \
\) -not -path '*/node_modules/*' -not -path '*/.git/*' | wc -l | tr -d ' ')

FRAMEWORK="none"
TEST_PASSED=0
TEST_FAILED=0
TIMED_OUT=false
COVERAGE="0%"

# 1. JS / TS Projects (Express, Axios, Lodash, React, SindreSorhus/is)
PKG_FILES=$(find . -name "package.json" -not -path '*/node_modules/*' -not -path '*/.git/*')

if [ -n "$PKG_FILES" ]; then
  FRAMEWORK="npm/jest/mocha/vitest/ava"
  for pkg in $PKG_FILES; do
    dir=$(dirname "$pkg")
    pushd "$dir" >/dev/null
    TEST_OUT=$(timeout 25 npm test -- --no-color 2>&1 || true)
    
    P_NUM=$(echo "$TEST_OUT" | grep -oE '[0-9]+\s+(passing|passed|pass)' | head -1 | awk '{print $1}' || echo 0)
    F_NUM=$(echo "$TEST_OUT" | grep -oE '[0-9]+\s+(failing|failed|fail)' | head -1 | awk '{print $1}' || echo 0)
    
    if [ -n "$P_NUM" ] && [ "$P_NUM" -eq "$P_NUM" ] 2>/dev/null; then
      TEST_PASSED=$((TEST_PASSED + P_NUM))
    fi
    if [ -n "$F_NUM" ] && [ "$F_NUM" -eq "$F_NUM" ] 2>/dev/null; then
      TEST_FAILED=$((TEST_FAILED + F_NUM))
    fi
    popd >/dev/null
  done

# 2. Python Projects (Flask, Transformers)
elif find . \( -name "pytest.ini" -o -name "setup.py" -o -name "pyproject.toml" -o -name "requirements.txt" \) -not -path '*/node_modules/*' -not -path '*/.git/*' | grep -q .; then
  FRAMEWORK="pytest"
  TEST_OUT=$(timeout 25 pytest --junitxml=report.xml 2>&1 || true)
  P_NUM=$(echo "$TEST_OUT" | grep -oE '[0-9]+\s+passed' | head -1 | awk '{print $1}' || echo 0)
  F_NUM=$(echo "$TEST_OUT" | grep -oE '[0-9]+\s+failed' | head -1 | awk '{print $1}' || echo 0)
  if [ -n "$P_NUM" ] && [ "$P_NUM" -eq "$P_NUM" ] 2>/dev/null; then
    TEST_PASSED=$P_NUM
  fi
  if [ -n "$F_NUM" ] && [ "$F_NUM" -eq "$F_NUM" ] 2>/dev/null; then
    TEST_FAILED=$F_NUM
  fi

# 3. Go Projects (Gin-Gonic)
elif find . -name "go.mod" -not -path '*/.git/*' | grep -q .; then
  FRAMEWORK="go test"
  TEST_OUT=$(timeout 25 go test ./... -v 2>&1 || true)
  P_NUM=$(echo "$TEST_OUT" | grep -c "PASS:" || echo 0)
  F_NUM=$(echo "$TEST_OUT" | grep -c "FAIL:" || echo 0)
  TEST_PASSED=$P_NUM
  TEST_FAILED=$F_NUM

# 4. Rust Projects (Ripgrep)
elif find . -name "Cargo.toml" -not -path '*/.git/*' | grep -q .; then
  FRAMEWORK="cargo test"
  TEST_OUT=$(timeout 25 cargo test 2>&1 || true)
  P_NUM=$(echo "$TEST_OUT" | grep -oE '[0-9]+\s+passed' | head -1 | awk '{print $1}' || echo 0)
  F_NUM=$(echo "$TEST_OUT" | grep -oE '[0-9]+\s+failed' | head -1 | awk '{print $1}' || echo 0)
  TEST_PASSED=${P_NUM:-0}
  TEST_FAILED=${F_NUM:-0}
fi

TOTAL_TESTS=$((TEST_PASSED + TEST_FAILED))
if [ "$TOTAL_TESTS" -gt 0 ]; then
  COVERAGE="$(( (TEST_PASSED * 100) / TOTAL_TESTS ))%"
elif [ "$TEST_FILES" -gt 0 ] && [ "$FRAMEWORK" != "none" ]; then
  COVERAGE="N/A (Uninstalled dependencies)"
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
