#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

SERVICE_NAME="automotive-operations"
PORT=8091
TIMEOUT="${1:-5}"

check_actuator_health "${PORT}" "${SERVICE_NAME}" "${TIMEOUT}"
