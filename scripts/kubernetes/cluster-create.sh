#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="tire-store-local"
KIND_CONFIG="infra/kubernetes/kind/cluster.yaml"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Run in docker group if necessary
if ! docker info >/dev/null 2>&1; then
  exec newgrp docker <<EOF
$(cat "$0") "$@"
EOF
  exit $?
fi

cd "${ROOT_DIR}"

echo "==> Checking if kind cluster '${CLUSTER_NAME}' already exists..."
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}\$"; then
  echo "==> Kind cluster '${CLUSTER_NAME}' already exists."
  kubectl cluster-info --context "kind-${CLUSTER_NAME}"
  exit 0
fi

echo "==> Creating kind cluster '${CLUSTER_NAME}' using config: ${KIND_CONFIG}..."
kind create cluster --name "${CLUSTER_NAME}" --config "${KIND_CONFIG}"

echo "==> Kind cluster '${CLUSTER_NAME}' created successfully."
kubectl cluster-info --context "kind-${CLUSTER_NAME}"
kubectl get nodes --context "kind-${CLUSTER_NAME}"
