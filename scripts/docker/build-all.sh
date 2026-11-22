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
echo "🐳 Building All Tire Store Container Images"
echo "=============================================================="

FAILED=()
PASSED=()

for SVC in "${SERVICES[@]}"; do
  log_info "--------------------------------------------------------"
  log_info "Building image: tire-store/${SVC}:latest"
  if "${SCRIPT_DIR}/build.sh" "${SVC}"; then
    PASSED+=("${SVC}")
  else
    FAILED+=("${SVC}")
  fi
done

log_info "--------------------------------------------------------"
log_info "Building image: tire-store/web:latest"
if "${SCRIPT_DIR}/build.sh" "web"; then
  PASSED+=("web")
else
  FAILED+=("web")
fi

echo "=============================================================="
echo "📊 Container Image Build Summary:"
echo "=============================================================="

for ITEM in "${PASSED[@]}"; do
  printf "  🟢 tire-store/%-25s BUILT\n" "${ITEM}"
done

if [ ${#FAILED[@]} -gt 0 ]; then
  for ITEM in "${FAILED[@]}"; do
    printf "  🔴 tire-store/%-25s FAILED\n" "${ITEM}"
  done
  echo "=============================================================="
  log_error "Build failed for ${#FAILED[@]} image(s)."
  exit 1
fi

echo "=============================================================="
log_success "All 9 container images built successfully!"
