#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

log_info "Linting web application..."
cd "${REPO_ROOT}"
pnpm --filter @tire-store/web lint "$@"
log_success "Web application lint passed."

