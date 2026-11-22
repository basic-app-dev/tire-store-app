#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [ "${1:-}" = "--e2e" ]; then
  log_info "Running Playwright E2E test suite for web application..."
  cd "${REPO_ROOT}"
  shift
  pnpm test:e2e "$@"
  log_success "Playwright E2E tests completed."
  exit 0
fi

log_warn "No unit test runner configured in apps/web/package.json."
log_info "End-to-end tests are available via Playwright: pass '--e2e' to run."
exit 0

