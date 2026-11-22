#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="tire-store-local"

if ! docker info >/dev/null 2>&1; then
  exec newgrp docker <<EOF
$(cat "$0") "$@"
EOF
  exit $?
fi

echo "==> Deleting kind cluster '${CLUSTER_NAME}'..."
kind delete cluster --name "${CLUSTER_NAME}"

echo "==> Kind cluster '${CLUSTER_NAME}' deleted successfully."
