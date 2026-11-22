#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

SERVICE_NAME="web"
PORT=3000
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PID_FILE="$(get_pid_file "${REPO_ROOT}" "${SERVICE_NAME}")"
LOG_FILE="$(get_log_file "${REPO_ROOT}" "${SERVICE_NAME}")"

BACKGROUND=false
if [ "${1:-}" = "--background" ] || [ "${1:-}" = "-b" ]; then
  BACKGROUND=true
  shift
fi

# 1. Prevent duplicate instances
if [ -f "${PID_FILE}" ]; then
  EXISTING_PID=$(cat "${PID_FILE}" 2>/dev/null || true)
  if [ -n "${EXISTING_PID}" ] && is_pid_alive "${EXISTING_PID}" && is_process_owned "${EXISTING_PID}" "next|node|pnpm"; then
    log_warn "Web frontend is already running (PID: ${EXISTING_PID})."
    exit 0
  fi
fi

# 2. Prevent port conflicts
if is_port_in_use "${PORT}"; then
  OCCUPIED_PID=$(get_port_pid "${PORT}")
  log_error "Port ${PORT} is occupied by PID ${OCCUPIED_PID}. Refusing to start web frontend."
  exit 1
fi

if [ "${BACKGROUND}" = true ]; then
  log_info "Launching Next.js web storefront in background on port ${PORT}..."
  (
    set -m
    cd "${REPO_ROOT}"
    nohup pnpm --filter @tire-store/web dev "$@" > "${LOG_FILE}" 2>&1 &
    BG_PID=$!
    echo "${BG_PID}" > "${PID_FILE}"
  )
  BG_PID=$(cat "${PID_FILE}")
  sleep 2
  if ! is_pid_alive "${BG_PID}"; then
    log_error "Web storefront failed to start. Check logs: ${LOG_FILE}"
    rm -f "${PID_FILE}"
    exit 1
  fi
  log_success "Web storefront started in background (PID: ${BG_PID})."
  log_info "URL: http://localhost:${PORT}"
  log_info "Log output: tail -f ${LOG_FILE}"
  log_info "Stop command: ${SCRIPT_DIR}/stop.sh"
else
  log_info "Starting Next.js web storefront in foreground on port ${PORT}..."
  cd "${REPO_ROOT}"
  exec pnpm --filter @tire-store/web dev "$@"
fi

