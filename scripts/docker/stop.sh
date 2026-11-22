#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

TARGET="${1:-all}"

run_docker() {
  if groups | grep -qw docker; then
    docker "$@"
  else
    sg docker -c "docker $*" 2>/dev/null || docker "$@"
  fi
}

stop_container() {
  local svc="$1"
  local container_name="tire-store-${svc}"

  if run_docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
    log_info "Stopping container '${container_name}'..."
    run_docker stop -t 10 "${container_name}" >/dev/null 2>&1 || true
    run_docker rm "${container_name}" >/dev/null 2>&1 || true
    log_success "Stopped and removed '${container_name}'."
  else
    log_info "Container '${container_name}' is not running."
  fi
}

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
    stop_container "${SVC}"
  done
  log_success "All owned application containers stopped."
else
  stop_container "${TARGET}"
fi
