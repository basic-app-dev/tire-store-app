#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="tire-store-local"
EXPECTED_CONTEXT="kind-${CLUSTER_NAME}"
NAMESPACE="ingress-apisix"

TARGET="${1:-gateway}"
shift || true

case "${TARGET}" in
  gateway)
    echo "==> Fetching APISIX Gateway logs..."
    exec kubectl logs deployment/apisix -c apisix -n "${NAMESPACE}" --context "${EXPECTED_CONTEXT}" "$@"
    ;;
  controller)
    echo "==> Fetching APISIX Ingress Controller logs..."
    exec kubectl logs deployment/apisix-ingress-controller -c manager -n "${NAMESPACE}" --context "${EXPECTED_CONTEXT}" "$@"
    ;;
  adc)
    echo "==> Fetching ADC sidecar logs..."
    exec kubectl logs deployment/apisix-ingress-controller -c adc-server -n "${NAMESPACE}" --context "${EXPECTED_CONTEXT}" "$@"
    ;;
  all)
    echo "==> Fetching all logs in namespace '${NAMESPACE}'..."
    exec kubectl logs -l app.kubernetes.io/name=apisix -n "${NAMESPACE}" --context "${EXPECTED_CONTEXT}" "$@"
    ;;
  *)
    echo "Usage: $0 [gateway|controller|adc|all] [kubectl logs flags...]"
    echo "Examples:"
    echo "  $0 gateway -f"
    echo "  $0 controller --tail=50"
    exit 1
    ;;
esac
