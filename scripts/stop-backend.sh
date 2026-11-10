#!/usr/bin/env bash

# Resolve repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PID_FILE="${ROOT_DIR}/.logs/backend.pid"
PORT=4000

echo "=============================================================="
echo "🛑 Stopping Tire Store Backend API"
echo "=============================================================="

STOPPED=false

# 1. Stop by PID file if exists
if [ -f "${PID_FILE}" ]; then
  PID=$(cat "${PID_FILE}")
  if ps -p "${PID}" > /dev/null 2>&1; then
    echo "⏳ Stopping backend process PID ${PID}..."
    kill -15 "${PID}" 2>/dev/null || kill -9 "${PID}" 2>/dev/null
    STOPPED=true
  fi
  rm -f "${PID_FILE}"
fi

# 2. Check if anything is still listening on port 4000
if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
  PORT_PID=$(lsof -Pi :${PORT} -sTCP:LISTEN -t | head -n 1)
  echo "⏳ Releasing port ${PORT} (killing PID ${PORT_PID})..."
  kill -9 "${PORT_PID}" 2>/dev/null || true
  STOPPED=true
fi

if [ "${STOPPED}" = true ]; then
  echo "✅ Backend API stopped successfully."
else
  echo "ℹ️  Backend API is not currently running."
fi
echo "=============================================================="

