#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

if [ $# -lt 1 ]; then
  log_error "Usage: $0 <service-name|web> [docker-logs-options...]"
  exit 1
fi

TARGET="$1"
shift

CONTAINER_NAME="tire-store-${TARGET}"

run_docker() {
  if groups | grep -qw docker; then
    docker "$@"
  else
    sg docker -c "docker $*" 2>/dev/null || docker "$@"
  fi
}

if ! run_docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  log_error "Container '${CONTAINER_NAME}' does not exist."
  exit 1
fi

run_docker logs "$@" "${CONTAINER_NAME}"
