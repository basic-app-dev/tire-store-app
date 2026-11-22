#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="tire-store-local"
CONTEXT="kind-${CLUSTER_NAME}"
OVERLAY_DIR="infra/kubernetes/overlays/local"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${ROOT_DIR}"

echo "==> Deleting Tire Store workloads from cluster '${CLUSTER_NAME}' via Kustomize (${OVERLAY_DIR})..."
kubectl delete -k "${OVERLAY_DIR}" --context "${CONTEXT}" --ignore-not-found=true

echo "==> Workloads and namespace removed."
