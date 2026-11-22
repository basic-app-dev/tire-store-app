#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

CLUSTER_NAME="tire-store-local"
EXPECTED_CONTEXT="kind-${CLUSTER_NAME}"
NAMESPACE="ingress-apisix"
GATEWAY_API_VERSION="v1.2.1"
GATEWAY_API_URL="https://github.com/kubernetes-sigs/gateway-api/releases/download/${GATEWAY_API_VERSION}/standard-install.yaml"
CHART_VERSION="3.1.0"
VALUES_FILE="${ROOT_DIR}/infra/apisix/values-local.yaml"

# Ensure docker group if necessary
if ! docker info >/dev/null 2>&1; then
  exec newgrp docker <<EOF
bash "${SCRIPT_DIR}/$(basename "$0")" "$@"
EOF
  exit $?
fi

cd "${ROOT_DIR}"

echo "==> Verifying Kubernetes context..."
CURRENT_CONTEXT="$(kubectl config current-context 2>/dev/null || true)"
if [ "${CURRENT_CONTEXT}" != "${EXPECTED_CONTEXT}" ]; then
  echo "Error: Current context is '${CURRENT_CONTEXT}'. This script only operates on '${EXPECTED_CONTEXT}'." >&2
  exit 1
fi

echo "==> Checking kind cluster nodes..."
kubectl get nodes --context "${EXPECTED_CONTEXT}"

# 1. Install or verify Gateway API CRDs
echo "==> Ensuring Gateway API standard CRDs (${GATEWAY_API_VERSION}) are installed..."
if ! kubectl get crd gatewayclasses.gateway.networking.k8s.io >/dev/null 2>&1; then
  echo "--> Installing Gateway API standard CRDs from ${GATEWAY_API_URL}..."
  kubectl apply -f "${GATEWAY_API_URL}" --context "${EXPECTED_CONTEXT}"
else
  echo "--> Gateway API CRDs already present."
fi

# Verify required Gateway API kinds exist
kubectl get crd gatewayclasses.gateway.networking.k8s.io gateways.gateway.networking.k8s.io httproutes.gateway.networking.k8s.io --context "${EXPECTED_CONTEXT}" >/dev/null

# 2. Ensure ingress-apisix namespace exists
echo "==> Ensuring namespace '${NAMESPACE}' exists..."
if ! kubectl get namespace "${NAMESPACE}" --context "${EXPECTED_CONTEXT}" >/dev/null 2>&1; then
  kubectl create namespace "${NAMESPACE}" --context "${EXPECTED_CONTEXT}"
fi

# 3. Add and update APISIX Helm repository
echo "==> Updating Helm repository..."
helm repo add apisix https://charts.apiseven.com --force-update >/dev/null
helm repo update apisix >/dev/null

# 4. Install / Upgrade APISIX and APISIX Ingress Controller
echo "==> Installing Apache APISIX Helm release (chart version: ${CHART_VERSION}) in '${NAMESPACE}'..."
helm upgrade --install apisix apisix/apisix \
  --version "${CHART_VERSION}" \
  --namespace "${NAMESPACE}" \
  --kube-context "${EXPECTED_CONTEXT}" \
  -f "${VALUES_FILE}"

# 5. Wait for rollouts
echo "==> Awaiting readiness of APISIX gateway data-plane..."
kubectl rollout status deployment/apisix -n "${NAMESPACE}" --context "${EXPECTED_CONTEXT}" --timeout=180s

echo "==> Initializing APISIX etcd schema prefixes..."
kubectl exec -n "${NAMESPACE}" deployment/apisix --context "${EXPECTED_CONTEXT}" -- apisix init_etcd >/dev/null 2>&1 || true

echo "==> Reloading APISIX data-plane to sync with initialized etcd..."
kubectl rollout restart deployment/apisix -n "${NAMESPACE}" --context "${EXPECTED_CONTEXT}"
kubectl rollout status deployment/apisix -n "${NAMESPACE}" --context "${EXPECTED_CONTEXT}" --timeout=120s

echo "==> Awaiting readiness of APISIX ingress controller..."
kubectl rollout status deployment/apisix-ingress-controller -n "${NAMESPACE}" --context "${EXPECTED_CONTEXT}" --timeout=180s

echo "==> Apache APISIX and Ingress Controller successfully installed and ready!"
kubectl get pods,svc -n "${NAMESPACE}" --context "${EXPECTED_CONTEXT}"
