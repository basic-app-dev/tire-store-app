#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="tire-store-local"
TAG="${1:-dev-local}"

SERVICES=(
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

if ! docker info >/dev/null 2>&1; then
  exec newgrp docker <<EOF
$(cat "$0") "$@"
EOF
  exit $?
fi

echo "==> Ensuring Docker images have tag ':${TAG}' and loading into kind cluster '${CLUSTER_NAME}'..."

for svc in "${SERVICES[@]}"; do
  src_img="tire-store/${svc}:latest"
  target_img="tire-store/${svc}:${TAG}"

  if ! docker image inspect "${target_img}" >/dev/null 2>&1; then
    if docker image inspect "${src_img}" >/dev/null 2>&1; then
      echo "--> Tagging ${src_img} -> ${target_img}"
      docker tag "${src_img}" "${target_img}"
    else
      echo "Error: Source image ${src_img} not found! Please build it first." >&2
      exit 1
    fi
  fi

  echo "--> Loading image ${target_img} into kind cluster '${CLUSTER_NAME}'..."
  kind load docker-image "${target_img}" --name "${CLUSTER_NAME}"
done

echo "==> All ${#SERVICES[@]} images successfully loaded into '${CLUSTER_NAME}'."
