#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="tire-store-local"
EXPECTED_CONTEXT="kind-${CLUSTER_NAME}"

echo "================================================================="
echo "  APACHE APISIX & GATEWAY API STATUS (tire-store-local)"
echo "================================================================="

CURRENT_CONTEXT="$(kubectl config current-context 2>/dev/null || true)"
if [ "${CURRENT_CONTEXT}" != "${EXPECTED_CONTEXT}" ]; then
  echo "Warning: Current context is '${CURRENT_CONTEXT}'. Targeting '${EXPECTED_CONTEXT}'."
fi

echo ""
echo "--- 1. Gateway Infrastructure (ingress-apisix) ---"
kubectl get deployments -n ingress-apisix --context "${EXPECTED_CONTEXT}" -o wide 2>/dev/null || echo "Namespace ingress-apisix not found"
echo ""
kubectl get pods -n ingress-apisix --context "${EXPECTED_CONTEXT}" -o wide 2>/dev/null || true
echo ""
kubectl get svc -n ingress-apisix --context "${EXPECTED_CONTEXT}" -o wide 2>/dev/null || true

echo ""
echo "--- 2. Gateway API Resources ---"
echo ">> GatewayClasses:"
kubectl get gatewayclass --context "${EXPECTED_CONTEXT}" -o wide 2>/dev/null || echo "No GatewayClasses found"
echo ""
echo ">> Gateways (ingress-apisix):"
kubectl get gateway -n ingress-apisix --context "${EXPECTED_CONTEXT}" -o wide 2>/dev/null || echo "No Gateways found"
echo ""
echo ">> HTTPRoutes (tire-store):"
kubectl get httproute -n tire-store --context "${EXPECTED_CONTEXT}" -o wide 2>/dev/null || echo "No HTTPRoutes found"

echo ""
echo "--- 3. Target Backend Services (tire-store) ---"
kubectl get svc -n tire-store --context "${EXPECTED_CONTEXT}" -o wide 2>/dev/null || true

echo ""
echo "--- 4. Gateway Listener & Route Conditions ---"
echo "Gateway Conditions:"
kubectl get gateway tire-store-api-gateway -n ingress-apisix --context "${EXPECTED_CONTEXT}" -o jsonpath='{range .status.conditions[*]}{.type}: {.status} ({.reason}: {.message}){"\n"}{end}' 2>/dev/null || echo "Gateway status not yet available"
echo ""
echo "HTTPRoute Conditions:"
kubectl get httproute tire-store-backend-routes -n tire-store --context "${EXPECTED_CONTEXT}" -o jsonpath='{range .status.parents[*]}{"Parent: "}{.parentRef.name}{"\n"}{range .conditions[*]}{"  "}{.type}: {.status} ({.reason}: {.message}){"\n"}{end}{end}' 2>/dev/null || echo "HTTPRoute status not yet available"
