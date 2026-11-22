#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

CLUSTER_NAME="tire-store-local"
EXPECTED_CONTEXT="kind-${CLUSTER_NAME}"
GATEWAY_NS="ingress-apisix"
APP_NS="tire-store"

cd "${ROOT_DIR}"

echo "================================================================="
echo "  APACHE APISIX GATEWAY ROUTING & SECURITY TEST SUITE"
echo "================================================================="

CURRENT_CONTEXT="$(kubectl config current-context 2>/dev/null || true)"
if [ "${CURRENT_CONTEXT}" != "${EXPECTED_CONTEXT}" ]; then
  echo "Error: Current context is '${CURRENT_CONTEXT}'. Expected '${EXPECTED_CONTEXT}'." >&2
  exit 1
fi

FAILURES=0

# Clean up any leftover diagnostic resources on exit
cleanup() {
  echo ""
  echo "==> Cleaning up temporary diagnostic resources..."
  kubectl delete httproute gateway-diagnostic-route -n "${APP_NS}" --context "${EXPECTED_CONTEXT}" --ignore-not-found=true >/dev/null 2>&1 || true
  sleep 3
  kubectl delete service gateway-diagnostic-backend -n "${APP_NS}" --context "${EXPECTED_CONTEXT}" --ignore-not-found=true >/dev/null 2>&1 || true
  kubectl delete deployment gateway-diagnostic-backend -n "${APP_NS}" --context "${EXPECTED_CONTEXT}" --ignore-not-found=true >/dev/null 2>&1 || true
  echo "==> Temporary diagnostic cleanup complete."
}
trap cleanup EXIT

echo "--> 1. Deploying temporary isolated diagnostic backend in '${APP_NS}'..."
cat <<EOF | kubectl apply --context "${EXPECTED_CONTEXT}" -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway-diagnostic-backend
  namespace: ${APP_NS}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: gateway-diagnostic-backend
  template:
    metadata:
      labels:
        app: gateway-diagnostic-backend
    spec:
      containers:
        - name: echo
          image: hashicorp/http-echo:0.2.3
          args:
            - "-text=tire-store-gateway-diagnostic-ok"
            - "-listen=:5678"
          ports:
            - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: gateway-diagnostic-backend
  namespace: ${APP_NS}
spec:
  type: ClusterIP
  ports:
    - port: 5678
      targetPort: 5678
  selector:
    app: gateway-diagnostic-backend
EOF

kubectl rollout status deployment/gateway-diagnostic-backend -n "${APP_NS}" --context "${EXPECTED_CONTEXT}" --timeout=60s

echo "--> 2. Creating temporary diagnostic HTTPRoute..."
cat <<EOF | kubectl apply --context "${EXPECTED_CONTEXT}" -f -
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: gateway-diagnostic-route
  namespace: ${APP_NS}
  labels:
    app.kubernetes.io/name: gateway-diagnostic-route
    app.kubernetes.io/part-of: tire-store
spec:
  parentRefs:
    - name: tire-store-api-gateway
      namespace: ${GATEWAY_NS}
      sectionName: http
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /diagnostic/test
      backendRefs:
        - name: gateway-diagnostic-backend
          port: 5678
EOF

echo "--> 3. Waiting 5s for APISIX Ingress Controller reconciliation..."
sleep 5

echo "--> 4. Executing In-Cluster Test Probes via APISIX Gateway..."
TEST_RUNNER=$(cat << 'IN_CLUSTER_TEST'
set -e
ERRORS=0

GATEWAY_URL="http://apisix-gateway.ingress-apisix.svc.cluster.local:80"

echo -n "Test 1: Diagnostic Routing (/diagnostic/test) ... "
PASSED=false
for i in $(seq 1 15); do
  RESP=$(curl -s --connect-timeout 2 "${GATEWAY_URL}/diagnostic/test" || echo "FAIL")
  if echo "${RESP}" | grep -q "tire-store-gateway-diagnostic-ok"; then
    echo "PASSED (HTTP 200, Content Matched on attempt ${i})"
    PASSED=true
    break
  fi
  sleep 2
done

if [ "${PASSED}" = "false" ]; then
  echo "FAILED (Response: ${RESP})"
  ERRORS=$((ERRORS + 1))
fi

echo -n "Test 2: Unmapped Path Returns 404 (/unknown/api/path) ... "
CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${GATEWAY_URL}/unknown/api/path" || echo "000")
if [ "${CODE}" -eq 404 ]; then
  echo "PASSED (HTTP 404 Not Found)"
else
  echo "FAILED (Got HTTP ${CODE})"
  ERRORS=$((ERRORS + 1))
fi

echo -n "Test 3: Negative Security - Actuator (/actuator) Not Exposed ... "
ACT_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${GATEWAY_URL}/actuator" || echo "000")
if [ "${ACT_CODE}" -eq 404 ]; then
  echo "PASSED (HTTP 404 - Blocked at Gateway)"
else
  echo "FAILED (Got HTTP ${ACT_CODE})"
  ERRORS=$((ERRORS + 1))
fi

echo -n "Test 4: Negative Security - Admin API (/apisix/admin) Not Exposed on Gateway ... "
ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${GATEWAY_URL}/apisix/admin" || echo "000")
if [ "${ADMIN_CODE}" -eq 404 ]; then
  echo "PASSED (HTTP 404 - Blocked on Gateway Listener)"
else
  echo "FAILED (Got HTTP ${ADMIN_CODE})"
  ERRORS=$((ERRORS + 1))
fi

echo -n "Test 5: Reserved Business Prefix Reaches Spring Boot Backend (/api/v1/automotive/operations/test) ... "
OPS_RESP=$(curl -s --connect-timeout 5 "${GATEWAY_URL}/api/v1/automotive/operations/test" || echo "")
OPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${GATEWAY_URL}/api/v1/automotive/operations/test" || echo "000")
if [ "${OPS_CODE}" -eq 404 ] && echo "${OPS_RESP}" | grep -q '"path":"/api/v1/automotive/operations/test"'; then
  echo "PASSED (HTTP 404 from Spring Boot Skeleton: Traffic successfully routed to microservice)"
else
  echo "FAILED (Got HTTP ${OPS_CODE}, Response: ${OPS_RESP})"
  ERRORS=$((ERRORS + 1))
fi

exit ${ERRORS}
IN_CLUSTER_TEST
)

if kubectl run gateway-test-runner \
  --namespace="${APP_NS}" \
  --context="${EXPECTED_CONTEXT}" \
  --image=curlimages/curl:8.12.1 \
  --restart=Never \
  --rm \
  -i \
  --command -- sh -c "${TEST_RUNNER}"; then
  echo ""
  echo "==> ALL GATEWAY INTEGRATION & SECURITY TESTS PASSED!"
else
  echo ""
  echo "==> GATEWAY TESTS DETECTED FAILURES!"
  exit 1
fi
