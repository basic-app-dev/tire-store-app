#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="tire-store-local"
CONTEXT="kind-${CLUSTER_NAME}"
NAMESPACE="tire-store"
TIMEOUT="${1:-180s}"

DEPLOYMENTS=(
  "automotive-operations"
  "automotive-product"
  "vehicle-sales"
  "vehicle-product"
  "notification"
  "identity-access"
  "appointment"
  "store-management"
  "web"
)

echo "==> Tracking deployment rollouts in namespace '${NAMESPACE}' (timeout: ${TIMEOUT})..."

for dep in "${DEPLOYMENTS[@]}"; do
  echo "--> Waiting for deployment/${dep}..."
  kubectl rollout status "deployment/${dep}" -n "${NAMESPACE}" --context "${CONTEXT}" --timeout="${TIMEOUT}"
done

echo "==> All ${#DEPLOYMENTS[@]} deployments are successfully rolled out and ready!"
