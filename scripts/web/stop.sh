#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

SERVICE_NAME="web"
PORT=3000
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PID_FILE="$(get_pid_file "${REPO_ROOT}" "${SERVICE_NAME}")"

stop_service_process "${PID_FILE}" "${SERVICE_NAME}" "next|node|pnpm" "${PORT}"

