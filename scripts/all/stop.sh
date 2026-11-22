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
echo "🛑 Stopping Full Tire Store Platform"
echo "=============================================================="

# Stop web frontend
"${SCRIPT_DIR}/../web/stop.sh"

# Stop 8 microservices
for SVC in "${SERVICES[@]}"; do
  "${SCRIPT_DIR}/../${SVC}/stop.sh"
done

echo "=============================================================="
log_success "All owned application processes stopped."

