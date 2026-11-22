#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="tire-store-local"
CONTEXT="kind-${CLUSTER_NAME}"
NAMESPACE="tire-store"

declare -A SERVICE_PORTS=(
  ["automotive-operations"]=8091
  ["automotive-product"]=8092
  ["vehicle-sales"]=8093
  ["vehicle-product"]=8094
  ["notification"]=8095
  ["identity-access"]=8096
  ["appointment"]=8097
  ["store-management"]=8098
  ["web"]=3000
)

if [ $# -lt 1 ]; then
  echo "Usage:"
  echo "  $0 <service-name> [local-port]"
  echo "  $0 all"
  echo ""
  echo "Available services: automotive-operations, automotive-product, vehicle-sales, vehicle-product, notification, identity-access, appointment, store-management, web"
  exit 1
fi

TARGET="$1"

if [ "${TARGET}" = "all" ]; then
  echo "==> Starting port-forward for ALL services in namespace '${NAMESPACE}'..."
  PIDS=()
  cleanup() {
    echo ""
    echo "==> Terminating port-forward processes..."
    for pid in "${PIDS[@]}"; do
      kill "${pid}" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    echo "==> All port-forward processes terminated."
  }
  trap cleanup SIGINT SIGTERM EXIT

  for svc in "${!SERVICE_PORTS[@]}"; do
    port="${SERVICE_PORTS[$svc]}"
    echo "--> Forwarding svc/${svc} :${port} -> ${port}"
    kubectl port-forward "svc/${svc}" "${port}:${port}" -n "${NAMESPACE}" --context "${CONTEXT}" >/dev/null 2>&1 &
    PIDS+=($!)
  done

  echo "==> All port-forwards established. Press Ctrl+C to stop."
  wait
else
  PORT="${2:-${SERVICE_PORTS[$TARGET]:-}}"
  if [ -z "${PORT}" ]; then
    echo "Error: Unknown service '${TARGET}' and no local port specified." >&2
    exit 1
  fi
  echo "==> Forwarding svc/${TARGET} :${PORT} -> ${PORT}..."
  exec kubectl port-forward "svc/${TARGET}" "${PORT}:${PORT}" -n "${NAMESPACE}" --context "${CONTEXT}"
fi
