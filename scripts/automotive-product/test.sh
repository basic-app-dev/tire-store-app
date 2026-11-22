#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

SERVICE_NAME="automotive-product"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SERVICE_DIR="${REPO_ROOT}/backend/services/${SERVICE_NAME}"

ensure_java_env

log_info "Running tests for ${SERVICE_NAME}..."
cd "${SERVICE_DIR}"
./gradlew test "$@"
log_success "Tests passed for ${SERVICE_NAME}."
