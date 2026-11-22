#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

if [ $# -lt 1 ]; then
  log_error "Usage: $0 <service-name|web> [--background|-b]"
  exit 1
fi

TARGET="$1"
shift

BACKGROUND=false
if [ "${1:-}" = "--background" ] || [ "${1:-}" = "-b" ]; then
  BACKGROUND=true
fi

# Port mappings
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

if [ -z "${PORTS[${TARGET}]:-}" ]; then
  log_error "Unknown target '${TARGET}'. Valid targets: ${!PORTS[*]}"
  exit 1
fi

PORT="${PORTS[${TARGET}]}"
CONTAINER_NAME="tire-store-${TARGET}"
IMAGE_NAME="tire-store/${TARGET}:latest"

run_docker() {
  if groups | grep -qw docker; then
    docker "$@"
  else
    sg docker -c "docker $*" 2>/dev/null || docker "$@"
  fi
}

# 1. Check if container is already running
if run_docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  log_warn "Container '${CONTAINER_NAME}' is already running on port ${PORT}."
  exit 0
fi

# 2. Check if a stopped container with the same name exists
if run_docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  log_info "Removing stopped container '${CONTAINER_NAME}'..."
  run_docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
fi

# 3. Check for port conflict with an unrelated process on host
if is_port_in_use "${PORT}"; then
  OCC_PID=$(get_port_pid "${PORT}")
  log_error "Host port ${PORT} is occupied by PID ${OCC_PID}. Refusing to start container '${CONTAINER_NAME}'."
  exit 1
fi

if [ "${BACKGROUND}" = true ]; then
  log_info "Starting container '${CONTAINER_NAME}' in background on port ${PORT}..."
  CID=$(run_docker run -d --name "${CONTAINER_NAME}" -p "${PORT}:${PORT}" "${IMAGE_NAME}")
  log_success "Container '${CONTAINER_NAME}' started (ID: ${CID:0:12})."
  log_info "Inspect logs: ${SCRIPT_DIR}/logs.sh ${TARGET} -f"
  log_info "Health check: ${SCRIPT_DIR}/health.sh ${TARGET}"
  log_info "Stop command: ${SCRIPT_DIR}/stop.sh ${TARGET}"
else
  log_info "Starting container '${CONTAINER_NAME}' in foreground on port ${PORT}..."
  run_docker run --rm --name "${CONTAINER_NAME}" -p "${PORT}:${PORT}" "${IMAGE_NAME}"
fi
