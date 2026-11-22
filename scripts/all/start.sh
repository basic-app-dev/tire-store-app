#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

SERVICES=(
  "automotive-operations:8091"
  "automotive-product:8092"
  "vehicle-sales:8093"
  "vehicle-product:8094"
  "notification:8095"
  "identity-access:8096"
  "appointment:8097"
  "store-management:8098"
)

echo "=============================================================="
echo "🚀 Starting Full Tire Store Platform"
echo "=============================================================="

START_FAILED=()

# 1. Start all 8 Spring Boot microservices in background
for ENTRY in "${SERVICES[@]}"; do
  SVC="${ENTRY%%:*}"
  log_info "Starting ${SVC}..."
  if ! "${SCRIPT_DIR}/../${SVC}/run.sh" --background; then
    START_FAILED+=("${SVC}")
  fi
done

# 2. Start Next.js Web frontend in background
log_info "Starting Next.js web storefront..."
if ! "${SCRIPT_DIR}/../web/dev.sh" --background; then
  START_FAILED+=("web")
fi

echo ""
echo "=============================================================="
echo "⏳ Waiting for Services to Initialize & Pass Health Checks..."
echo "=============================================================="

MAX_WAIT=45
WAIT_INTERVAL=3
WAITED=0
UNREADY_SERVICES=()

for ENTRY in "${SERVICES[@]}"; do
  SVC="${ENTRY%%:*}"
  PORT="${ENTRY##*:}"
  
  log_info "Checking readiness of ${SVC} on port ${PORT}..."
  SERVICE_READY=false
  WAITED=0
  while [ ${WAITED} -lt ${MAX_WAIT} ]; do
    if curl -sSf --connect-timeout 1 --max-time 2 "http://localhost:${PORT}/actuator/health" 2>/dev/null | grep -q '"status":"UP"'; then
      SERVICE_READY=true
      break
    fi
    sleep ${WAIT_INTERVAL}
    WAITED=$((WAITED + WAIT_INTERVAL))
  done

  if [ "${SERVICE_READY}" = true ]; then
    log_success "${SVC} is READY on port ${PORT}."
  else
    log_error "${SVC} did not become ready within ${MAX_WAIT}s."
    UNREADY_SERVICES+=("${SVC}")
  fi
done

# Check Web readiness
log_info "Checking readiness of Web storefront on port 3000..."
WEB_READY=false
WAITED=0
while [ ${WAITED} -lt 20 ]; do
  if curl -sSf --connect-timeout 1 --max-time 2 "http://localhost:3000" >/dev/null 2>&1; then
    WEB_READY=true
    break
  fi
  sleep 2
  WAITED=$((WAITED + 2))
done

if [ "${WEB_READY}" = true ]; then
  log_success "Web storefront is READY on http://localhost:3000"
else
  log_warn "Web storefront starting or compiling (port 3000)."
fi

echo ""
echo "=============================================================="
echo "📊 Startup Readiness Summary"
echo "=============================================================="

"${SCRIPT_DIR}/status.sh"

if [ ${#START_FAILED[@]} -gt 0 ] || [ ${#UNREADY_SERVICES[@]} -gt 0 ]; then
  log_warn "Some services failed to launch or initialize. Check logs in .logs/"
  exit 1
fi

log_success "Full platform started and healthy!"

