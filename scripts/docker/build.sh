#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [ $# -lt 1 ]; then
  log_error "Usage: $0 <service-name|web>"
  exit 1
fi

TARGET="$1"

# Docker wrapper function to ensure docker group access
run_docker() {
  if groups | grep -qw docker; then
    docker "$@"
  else
    sg docker -c "docker $*" 2>/dev/null || docker "$@"
  fi
}

if [ "${TARGET}" = "web" ]; then
  log_info "Building Next.js web container image: tire-store/web:latest..."
  cd "${REPO_ROOT}"
  run_docker build -f apps/web/Dockerfile -t tire-store/web:latest .
  log_success "Built tire-store/web:latest successfully."
else
  SVC_DIR="${REPO_ROOT}/backend/services/${TARGET}"
  if [ ! -d "${SVC_DIR}" ]; then
    log_error "Service '${TARGET}' does not exist under backend/services/."
    exit 1
  fi
  log_info "Building Spring Boot container image: tire-store/${TARGET}:latest..."
  cd "${SVC_DIR}"
  run_docker build -t "tire-store/${TARGET}:latest" .
  log_success "Built tire-store/${TARGET}:latest successfully."
fi
