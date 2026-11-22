#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

SERVICE_NAME="vehicle-product"
PORT=8094
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SERVICE_DIR="${REPO_ROOT}/backend/services/${SERVICE_NAME}"
PID_FILE="$(get_pid_file "${REPO_ROOT}" "${SERVICE_NAME}")"
LOG_FILE="$(get_log_file "${REPO_ROOT}" "${SERVICE_NAME}")"

ensure_java_env

BACKGROUND=false
if [ "${1:-}" = "--background" ] || [ "${1:-}" = "-b" ]; then
  BACKGROUND=true
  shift
fi

if [ -f "${PID_FILE}" ]; then
  EXISTING_PID=$(cat "${PID_FILE}" 2>/dev/null || true)
  if [ -n "${EXISTING_PID}" ] && is_pid_alive "${EXISTING_PID}" && is_process_owned "${EXISTING_PID}" "${SERVICE_NAME}"; then
    log_warn "Service '${SERVICE_NAME}' is already running (PID: ${EXISTING_PID})."
    exit 0
  fi
fi

if is_port_in_use "${PORT}"; then
  OCCUPIED_PID=$(get_port_pid "${PORT}")
  log_error "Port ${PORT} is occupied by PID ${OCCUPIED_PID}. Refusing to start '${SERVICE_NAME}'."
  exit 1
fi

if [ "${BACKGROUND}" = true ]; then
  log_info "Launching ${SERVICE_NAME} in background on port ${PORT}..."
  (
    set -m
    cd "${SERVICE_DIR}"
    nohup ./gradlew bootRun "$@" > "${LOG_FILE}" 2>&1 &
    BG_PID=$!
    echo "${BG_PID}" > "${PID_FILE}"
  )
  BG_PID=$(cat "${PID_FILE}")
  sleep 2
  if ! is_pid_alive "${BG_PID}"; then
    log_error "${SERVICE_NAME} failed to start. Check logs: ${LOG_FILE}"
    rm -f "${PID_FILE}"
    exit 1
  fi
  log_success "${SERVICE_NAME} started in background (PID: ${BG_PID})."
  log_info "Log output: tail -f ${LOG_FILE}"
  log_info "Health check: ${SCRIPT_DIR}/health.sh"
else
  log_info "Starting ${SERVICE_NAME} in foreground on port ${PORT}..."
  cd "${SERVICE_DIR}"
  exec ./gradlew bootRun "$@"
fi
