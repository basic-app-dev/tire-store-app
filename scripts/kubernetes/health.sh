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

echo "==> Verifying In-Cluster Health Probes..."

# We run a temporary curl probe pod inside the cluster to check service endpoints directly via ClusterIP DNS
TEST_SCRIPT=$(cat << 'EOF'
set -e
FAILURES=0

check_url() {
  local name="$1"
  local url="$2"
  local expected="$3"
  
  echo -n "Checking ${name} (${url}) ... "
  response=$(curl -s --connect-timeout 5 -w "\n%{http_code}" "${url}" || echo "FAIL 000")
  body=$(echo "${response}" | head -n -1)
  code=$(echo "${response}" | tail -n 1)

  if [ "${code}" -eq 200 ]; then
    echo "OK (HTTP 200)"
  else
    echo "FAILED (HTTP ${code})"
    FAILURES=$((FAILURES + 1))
  fi
}

check_url "automotive-operations liveness" "http://automotive-operations.tire-store.svc.cluster.local:8091/actuator/health/liveness" 200
check_url "automotive-operations readiness" "http://automotive-operations.tire-store.svc.cluster.local:8091/actuator/health/readiness" 200
check_url "automotive-product liveness" "http://automotive-product.tire-store.svc.cluster.local:8092/actuator/health/liveness" 200
check_url "vehicle-sales liveness" "http://vehicle-sales.tire-store.svc.cluster.local:8093/actuator/health/liveness" 200
check_url "vehicle-product liveness" "http://vehicle-product.tire-store.svc.cluster.local:8094/actuator/health/liveness" 200
check_url "notification liveness" "http://notification.tire-store.svc.cluster.local:8095/actuator/health/liveness" 200
check_url "identity-access liveness" "http://identity-access.tire-store.svc.cluster.local:8096/actuator/health/liveness" 200
check_url "appointment liveness" "http://appointment.tire-store.svc.cluster.local:8097/actuator/health/liveness" 200
check_url "store-management liveness" "http://store-management.tire-store.svc.cluster.local:8098/actuator/health/liveness" 200
check_url "web http" "http://web.tire-store.svc.cluster.local:3000/" 200

if [ "${FAILURES}" -eq 0 ]; then
  echo ""
  echo "==> ALL HEALTH CHECKS PASSED SUCCESSFULLY!"
  exit 0
else
  echo ""
  echo "==> ${FAILURES} HEALTH CHECKS FAILED!"
  exit 1
fi
EOF
)

kubectl run curl-health-test \
  --namespace="${NAMESPACE}" \
  --context="${CONTEXT}" \
  --image=curlimages/curl:8.12.1 \
  --restart=Never \
  --rm \
  -i \
  --command -- sh -c "${TEST_SCRIPT}"
