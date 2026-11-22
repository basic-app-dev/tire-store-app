#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

TARGET="${1:-all}"

declare -A PORTS=(
  ["automotive-operations"]="8091"
  ["automotive-product"]="8092"
  ["vehicle-sales"]="8093"
  ["vehicle-product"]="8094"
  ["notification"]="8095"
  ["identity-access"]="8096"
  ["appointment"]="8097"
  ["store-management"]="8098"
  ["web"]="3000"
)

run_docker() {
  if groups | grep -qw docker; then
    docker "$@"
  else
    sg docker -c "docker $*" 2>/dev/null || docker "$@"
  fi
}

check_target_health() {
  local svc="$1"
  local port="${PORTS[${svc}]}"
  local container_name="tire-store-${svc}"

  # 1. Check if container is running
  if ! run_docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
    printf "⚪ %-25s | %-6s | STOPPED (Container not running)\n" "${svc}" "${port}"
    return 1
  fi

  # 2. Check health based on service type
  if [ "${svc}" = "web" ]; then
    if curl -sSf --connect-timeout 2 --max-time 3 "http://localhost:3000" >/dev/null 2>&1; then
      printf "🟢 %-25s | %-6s | HEALTHY (HTTP 200 OK)\n" "${svc}" "${port}"
      return 0
    else
      printf "🟡 %-25s | %-6s | UNHEALTHY (Container running, but HTTP not responding)\n" "${svc}" "${port}"
      return 1
    fi
  else
    local health_url="http://localhost:${port}/actuator/health"
    local response
    if response=$(curl -sSf --connect-timeout 2 --max-time 4 "${health_url}" 2>/dev/null) && echo "${response}" | grep -q '"status":"UP"'; then
      printf "🟢 %-25s | %-6s | HEALTHY (Actuator status: UP)\n" "${svc}" "${port}"
      return 0
    else
      printf "🟡 %-25s | %-6s | UNHEALTHY (Container running, but Actuator not UP)\n" "${svc}" "${port}"
      return 1
    fi
  fi
}

echo "=============================================================="
echo "🏥 Tire Store Container Health Inspection"
echo "=============================================================="
printf "%-27s | %-6s | %s\n" "SERVICE" "PORT" "STATUS"
echo "----------------------------+--------+----------------------------------"

if [ "${TARGET}" = "all" ]; then
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
  for SVC in "${SERVICES[@]}"; do
    check_target_health "${SVC}" || true
  done
else
  if [ -z "${PORTS[${TARGET}]:-}" ]; then
    log_error "Unknown service '${TARGET}'."
    exit 1
  fi
  check_target_health "${TARGET}"
fi

echo "=============================================================="
