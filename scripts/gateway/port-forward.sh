#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="tire-store-local"
EXPECTED_CONTEXT="kind-${CLUSTER_NAME}"
NAMESPACE="ingress-apisix"
SERVICE="apisix-gateway"
LOCAL_PORT="${1:-9080}"
GATEWAY_PORT=80

CURRENT_CONTEXT="$(kubectl config current-context 2>/dev/null || true)"
if [ "${CURRENT_CONTEXT}" != "${EXPECTED_CONTEXT}" ]; then
  echo "Error: Current context is '${CURRENT_CONTEXT}'. Expected '${EXPECTED_CONTEXT}'." >&2
  exit 1
fi

echo "==> Checking if local port ${LOCAL_PORT} is in use on 127.0.0.1..."
if ss -tuln 2>/dev/null | grep -q "127.0.0.1:${LOCAL_PORT}\b"; then
  echo "Error: Local port ${LOCAL_PORT} is already in use." >&2
  exit 1
fi

echo "================================================================="
echo "  APACHE APISIX LOCAL GATEWAY PORT-FORWARD"
echo "================================================================="
echo "Binding local interface: 127.0.0.1:${LOCAL_PORT} -> ${NAMESPACE}/${SERVICE}:${GATEWAY_PORT}"
echo "Press Ctrl+C to stop."
echo ""

exec kubectl port-forward "svc/${SERVICE}" "${LOCAL_PORT}:${GATEWAY_PORT}" \
  --address 127.0.0.1 \
  -n "${NAMESPACE}" \
  --context "${EXPECTED_CONTEXT}"
