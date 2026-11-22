#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="tire-store-local"
CONTEXT="kind-${CLUSTER_NAME}"
NAMESPACE="tire-store"

echo "==> Kubernetes Status for '${CLUSTER_NAME}' in namespace '${NAMESPACE}':"
echo ""
echo "--- Deployments ---"
kubectl get deployments -n "${NAMESPACE}" --context "${CONTEXT}" -o wide
echo ""
echo "--- Pods ---"
kubectl get pods -n "${NAMESPACE}" --context "${CONTEXT}" -o wide
echo ""
echo "--- Services ---"
kubectl get svc -n "${NAMESPACE}" --context "${CONTEXT}" -o wide
