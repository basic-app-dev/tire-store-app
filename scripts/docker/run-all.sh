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
  "web"
)

echo "=============================================================="
echo "🚀 Starting All 9 Tire Store Application Containers"
echo "=============================================================="

for SVC in "${SERVICES[@]}"; do
  log_info "Launching container for ${SVC}..."
  "${SCRIPT_DIR}/run.sh" "${SVC}" --background
done

echo ""
echo "=============================================================="
echo "⏳ Waiting for Application Containers to Initialize..."
echo "=============================================================="

sleep 5

"${SCRIPT_DIR}/health.sh" all
