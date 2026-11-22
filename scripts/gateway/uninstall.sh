#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

CLUSTER_NAME="tire-store-local"
EXPECTED_CONTEXT="kind-${CLUSTER_NAME}"
NAMESPACE="ingress-apisix"
OVERLAY_GATEWAY="${ROOT_DIR}/infra/kubernetes/overlays/local/gateway"

# Ensure docker group if necessary
if ! docker info >/dev/null 2>&1; then
  exec newgrp docker <<EOF
bash "${SCRIPT_DIR}/$(basename "$0")" "$@"
EOF
  exit $?
fi

CURRENT_CONTEXT="$(kubectl config current-context 2>/dev/null || true)"
if [ "${CURRENT_CONTEXT}" != "${EXPECTED_CONTEXT}" ]; then
  echo "Error: Current context is '${CURRENT_CONTEXT}'. Refusing to uninstall on non-local context." >&2
  exit 1
fi

echo "==> Deleting Gateway API routing resources (HTTPRoutes, Gateway, GatewayClass)..."
kubectl delete -k "${OVERLAY_GATEWAY}" --context "${EXPECTED_CONTEXT}" --ignore-not-found=true

echo "==> Uninstalling Helm release 'apisix' from namespace '${NAMESPACE}'..."
helm uninstall apisix -n "${NAMESPACE}" --kube-context "${EXPECTED_CONTEXT}" || true

echo "==> Deleting namespace '${NAMESPACE}'..."
kubectl delete namespace "${NAMESPACE}" --context "${EXPECTED_CONTEXT}" --ignore-not-found=true

echo ""
echo "Note: Cluster-scoped Gateway API CRDs were preserved."
echo "==> APISIX Gateway successfully uninstalled from '${CLUSTER_NAME}'."
