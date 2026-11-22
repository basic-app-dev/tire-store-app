#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="tire-store-local"
CONTEXT="kind-${CLUSTER_NAME}"
NAMESPACE="tire-store"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <service-name> [kubectl logs flags...]"
  echo "Example: $0 automotive-operations -f"
  echo "Available services: automotive-operations, automotive-product, vehicle-sales, vehicle-product, notification, identity-access, appointment, store-management, web"
  exit 1
fi

SERVICE="$1"
shift

kubectl logs "deployment/${SERVICE}" -n "${NAMESPACE}" --context "${CONTEXT}" "$@"
