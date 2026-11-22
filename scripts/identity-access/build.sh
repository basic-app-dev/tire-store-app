#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

SERVICE_NAME="identity-access"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SERVICE_DIR="${REPO_ROOT}/backend/services/${SERVICE_NAME}"

ensure_java_env

log_info "Building ${SERVICE_NAME} (compile, test, package)..."
cd "${SERVICE_DIR}"
./gradlew build "$@"
log_success "Build completed successfully for ${SERVICE_NAME}."
