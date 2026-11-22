#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="tire-store-local"

if ! docker info >/dev/null 2>&1; then
  exec newgrp docker <<EOF
$(cat "$0") "$@"
EOF
  exit $?
fi

echo "==> Kind Cluster Status for '${CLUSTER_NAME}':"
if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}\$"; then
  echo "Cluster '${CLUSTER_NAME}' is NOT running."
  exit 1
fi

echo "Kind cluster '${CLUSTER_NAME}' is active."
echo ""
echo "==> Nodes:"
kubectl get nodes --context "kind-${CLUSTER_NAME}" -o wide
echo ""
echo "==> Cluster Info:"
kubectl cluster-info --context "kind-${CLUSTER_NAME}"
