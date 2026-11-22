#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

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
echo "📊 Tire Store Platform — Service Status"
echo "=============================================================="

printf "%-25s | %-6s | %-8s | %s\n" "SERVICE" "PORT" "PID" "HEALTH STATUS"
echo "--------------------------+--------+----------+---------------------------------"

# 1. Inspect 8 Spring Boot microservices
for ENTRY in "${SERVICES[@]}"; do
  SVC="${ENTRY%%:*}"
  PORT="${ENTRY##*:}"
  PID_FILE="$(get_pid_file "${REPO_ROOT}" "${SVC}")"
  
  PID=""
  if [ -f "${PID_FILE}" ]; then
    PID=$(cat "${PID_FILE}" 2>/dev/null || true)
  fi

  if [ -n "${PID}" ] && is_pid_alive "${PID}" && is_process_owned "${PID}" "${SVC}"; then
    # Owned process is alive
    if curl -sSf --connect-timeout 1 --max-time 2 "http://localhost:${PORT}/actuator/health" 2>/dev/null | grep -q '"status":"UP"'; then
      printf "🟢 %-23s | %-6s | %-8s | RUNNING & HEALTHY (UP)\n" "${SVC}" "${PORT}" "${PID}"
    else
      printf "🟡 %-23s | %-6s | %-8s | RUNNING (INITIALIZING / UNHEALTHY)\n" "${SVC}" "${PORT}" "${PID}"
    fi
  else
    # Not running under our PID file
    if is_port_in_use "${PORT}"; then
      OCC_PID=$(get_port_pid "${PORT}")
      printf "🔴 %-23s | %-6s | %-8s | PORT OCCUPIED BY UNKNOWN PROCESS\n" "${SVC}" "${PORT}" "${OCC_PID}"
    else
      printf "⚪ %-23s | %-6s | %-8s | STOPPED\n" "${SVC}" "${PORT}" "-"
    fi
  fi
done

# 2. Inspect Web Frontend
WEB_PID_FILE="$(get_pid_file "${REPO_ROOT}" "web")"
WEB_PID=""
if [ -f "${WEB_PID_FILE}" ]; then
  WEB_PID=$(cat "${WEB_PID_FILE}" 2>/dev/null || true)
fi

if [ -n "${WEB_PID}" ] && is_pid_alive "${WEB_PID}" && is_process_owned "${WEB_PID}" "next|node|pnpm"; then
  if curl -sSf --connect-timeout 1 --max-time 2 "http://localhost:3000" >/dev/null 2>&1; then
    printf "🟢 %-23s | %-6s | %-8s | RUNNING & HEALTHY (HTTP 200)\n" "web (Next.js)" "3000" "${WEB_PID}"
  else
    printf "🟡 %-23s | %-6s | %-8s | RUNNING (COMPILING / STARTING)\n" "web (Next.js)" "3000" "${WEB_PID}"
  fi
else
  if is_port_in_use "3000"; then
    OCC_PID=$(get_port_pid "3000")
    printf "🔴 %-23s | %-6s | %-8s | PORT OCCUPIED BY UNKNOWN PROCESS\n" "web (Next.js)" "3000" "${OCC_PID}"
  else
    printf "⚪ %-23s | %-6s | %-8s | STOPPED\n" "web (Next.js)" "3000" "-"
  fi
fi

echo "=============================================================="

