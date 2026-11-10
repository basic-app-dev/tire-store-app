#!/usr/bin/env bash
set -e

# Resolve repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${ROOT_DIR}/.logs"
PID_FILE="${LOG_DIR}/backend.pid"
PORT=4000

mkdir -p "${LOG_DIR}"

echo "=============================================================="
echo "🚀 Starting Tire Store Backend API (@tire-store/api)"
echo "=============================================================="

# Check if port 4000 is already in use
if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
  EXISTING_PID=$(lsof -Pi :${PORT} -sTCP:LISTEN -t | head -n 1)
  echo "⚠️  Port ${PORT} is already in use by process PID: ${EXISTING_PID}"
  echo "   Use './scripts/stop-backend.sh' to stop it first."
  exit 1
fi

cd "${ROOT_DIR}"

if [ "$1" == "--foreground" ] || [ "$1" == "-f" ]; then
  echo "📡 Running Backend API in foreground..."
  exec pnpm dev:api
else
  echo "📡 Launching Backend API in background on port ${PORT}..."
  nohup pnpm dev:api > "${LOG_DIR}/backend.log" 2>&1 &
  BACKEND_PID=$!
  echo "${BACKEND_PID}" > "${PID_FILE}"

  sleep 2

  if ps -p "${BACKEND_PID}" > /dev/null; then
    echo "✅ Backend API started successfully! (PID: ${BACKEND_PID})"
    echo "📍 Health Check: http://localhost:${PORT}/health"
    echo "📍 Vehicle Makes: http://localhost:${PORT}/api/fitments/makes"
    echo "📍 Tire Catalog: http://localhost:${PORT}/api/tires"
    echo "📄 Logs: tail -f .logs/backend.log"
    echo "🛑 To stop: ./scripts/stop-backend.sh"
  else
    echo "❌ Failed to start Backend API. Check logs:"
    cat "${LOG_DIR}/backend.log"
    exit 1
  fi
fi
echo "=============================================================="

