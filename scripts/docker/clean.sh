#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

echo "=============================================================="
echo "🧹 Cleaning Project-Owned Docker Resources"
echo "=============================================================="

run_docker() {
  if groups | grep -qw docker; then
    docker "$@"
  else
    sg docker -c "docker $*" 2>/dev/null || docker "$@"
  fi
}

# 1. Stop and remove only tire-store-* containers
CONTAINERS=$(run_docker ps -a --filter "name=tire-store-*" --format '{{.Names}}')
if [ -n "${CONTAINERS}" ]; then
  log_info "Removing project containers:"
  echo "${CONTAINERS}"
  run_docker rm -f ${CONTAINERS} >/dev/null 2>&1
  log_success "Project containers removed."
else
  log_info "No project-owned containers found."
fi

# 2. Remove project images if requested with --all-images
if [ "${1:-}" = "--images" ] || [ "${1:-}" = "-i" ]; then
  IMAGES=$(run_docker images --filter "reference=tire-store/*" --format '{{.Repository}}:{{.Tag}}')
  if [ -n "${IMAGES}" ]; then
    log_info "Removing project images:"
    echo "${IMAGES}"
    run_docker rmi -f ${IMAGES} >/dev/null 2>&1
    log_success "Project images removed."
  else
    log_info "No project-owned images found."
  fi
fi

log_success "Cleanup complete. Unrelated Docker resources were preserved untouched."
