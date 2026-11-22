#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

CLUSTER_NAME="tire-store-local"
EXPECTED_CONTEXT="kind-${CLUSTER_NAME}"
OVERLAY_GATEWAY="${ROOT_DIR}/infra/kubernetes/overlays/local/gateway"

cd "${ROOT_DIR}"

echo "==> Verifying Kubernetes context..."
CURRENT_CONTEXT="$(kubectl config current-context 2>/dev/null || true)"
if [ "${CURRENT_CONTEXT}" != "${EXPECTED_CONTEXT}" ]; then
  echo "Error: Current context is '${CURRENT_CONTEXT}'. Expected '${EXPECTED_CONTEXT}'." >&2
  exit 1
fi

echo "==> Validating Gateway API manifests via Kustomize..."
kubectl kustomize "${OVERLAY_GATEWAY}" > /dev/null

echo "==> Applying GatewayClass, Gateway, and HTTPRoutes..."
kubectl apply -k "${OVERLAY_GATEWAY}" --context "${EXPECTED_CONTEXT}"

echo "==> Verifying GatewayClass status..."
kubectl get gatewayclass tire-store-apisix --context "${EXPECTED_CONTEXT}" -o wide

echo "==> Verifying Gateway status..."
kubectl get gateway tire-store-api-gateway -n ingress-apisix --context "${EXPECTED_CONTEXT}" -o wide

echo "==> Verifying HTTPRoutes in namespace 'tire-store'..."
kubectl get httproute tire-store-backend-routes -n tire-store --context "${EXPECTED_CONTEXT}" -o wide

echo "==> Gateway API routing configuration applied successfully!"
