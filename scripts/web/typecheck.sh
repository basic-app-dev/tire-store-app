#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

log_info "Running TypeScript typecheck on web application..."
cd "${REPO_ROOT}"
pnpm --filter @tire-store/web typecheck "$@"
log_success "Web application typecheck passed."

