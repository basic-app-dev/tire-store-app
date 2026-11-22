#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

SERVICES=(
  "automotive-operations"
  "automotive-product"
  "vehicle-sales"
  "vehicle-product"
  "notification"
  "identity-access"
  "appointment"
  "store-management"
)

echo "=============================================================="
echo "🧪 Running Test Suites Across Platform"
echo "=============================================================="

PASSED_TESTS=()
FAILED_TESTS=()
UNCONFIGURED_TESTS=()

for SVC in "${SERVICES[@]}"; do
  log_info "Testing microservice: ${SVC}..."
  if "${SCRIPT_DIR}/../${SVC}/test.sh" "$@"; then
    PASSED_TESTS+=("${SVC}")
  else
    FAILED_TESTS+=("${SVC}")
  fi
done

# Frontend Web test evaluation
log_info "Testing web frontend..."
# Inspect apps/web/package.json
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
if grep -q '"test":' "${REPO_ROOT}/apps/web/package.json"; then
  if "${SCRIPT_DIR}/../web/test.sh" "$@"; then
    PASSED_TESTS+=("web")
  else
    FAILED_TESTS+=("web")
  fi
else
  UNCONFIGURED_TESTS+=("web (No unit test suite defined in apps/web; E2E via Playwright)")
fi

echo "=============================================================="
echo "📊 Test Execution Results:"
echo "=============================================================="

for ITEM in "${PASSED_TESTS[@]}"; do
  printf "  🟢 %-25s PASSED (JUnit 5 / MockMvc)\n" "${ITEM}"
done

for ITEM in "${UNCONFIGURED_TESTS[@]}"; do
  printf "  ⚪ %-25s NOT CONFIGURED\n" "${ITEM}"
done

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
  for ITEM in "${FAILED_TESTS[@]}"; do
    printf "  🔴 %-25s FAILED\n" "${ITEM}"
  done
  echo "=============================================================="
  log_error "Test failures detected in ${#FAILED_TESTS[@]} component(s)."
  exit 1
fi

echo "=============================================================="
log_success "All configured test suites passed successfully!"

