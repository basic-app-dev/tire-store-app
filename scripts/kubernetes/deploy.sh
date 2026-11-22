#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="tire-store-local"
CONTEXT="kind-${CLUSTER_NAME}"
OVERLAY_DIR="infra/kubernetes/overlays/local"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${ROOT_DIR}"

echo "==> Deploying Tire Store workloads via Kustomize (${OVERLAY_DIR})..."
kubectl apply -k "${OVERLAY_DIR}" --context "${CONTEXT}"

echo "==> Manifests applied. Waiting for rollouts..."
"${SCRIPT_DIR}/rollout.sh"
