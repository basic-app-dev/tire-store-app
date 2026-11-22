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
echo "🏗️  Building Full Tire Store Platform"
echo "=============================================================="

FAILED_BUILDS=()
PASSED_BUILDS=()

for SVC in "${SERVICES[@]}"; do
  log_info "--------------------------------------------------------"
  log_info "Building microservice: ${SVC}"
  if "${SCRIPT_DIR}/../${SVC}/build.sh"; then
    PASSED_BUILDS+=("${SVC}")
  else
    FAILED_BUILDS+=("${SVC}")
  fi
done

log_info "--------------------------------------------------------"
log_info "Building web frontend: web"
if "${SCRIPT_DIR}/../web/build.sh"; then
  PASSED_BUILDS+=("web")
else
  FAILED_BUILDS+=("web")
fi

echo "=============================================================="
echo "📊 Build Summary:"
echo "=============================================================="
for ITEM in "${PASSED_BUILDS[@]}"; do
  printf "  🟢 %-25s PASSED\n" "${ITEM}"
done

if [ ${#FAILED_BUILDS[@]} -gt 0 ]; then
  for ITEM in "${FAILED_BUILDS[@]}"; do
    printf "  🔴 %-25s FAILED\n" "${ITEM}"
  done
  echo "=============================================================="
  log_error "Build failed for ${#FAILED_BUILDS[@]} component(s)."
  exit 1
fi

echo "=============================================================="
log_success "All 8 Spring Boot microservices and web frontend built successfully!"

