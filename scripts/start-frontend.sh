#!/usr/bin/env bash
set -e

# Resolve repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${ROOT_DIR}/.logs"
PID_FILE="${LOG_DIR}/frontend.pid"
PORT=3000

mkdir -p "${LOG_DIR}"

echo "=============================================================="
echo "🌐 Starting Tire Store Frontend Web (@tire-store/web)"
echo "=============================================================="

# Check if port 3000 is already in use
if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
  EXISTING_PID=$(lsof -Pi :${PORT} -sTCP:LISTEN -t | head -n 1)
  echo "⚠️  Port ${PORT} is already in use by process PID: ${EXISTING_PID}"
  echo "   Use './scripts/stop-frontend.sh' to stop it first."
  exit 1
fi

cd "${ROOT_DIR}"

if [ "$1" == "--foreground" ] || [ "$1" == "-f" ]; then
  echo "📡 Running Frontend Web in foreground..."
  exec pnpm dev:web
else
  echo "📡 Launching Frontend Web in background on port ${PORT}..."
  nohup pnpm dev:web > "${LOG_DIR}/frontend.log" 2>&1 &
  FRONTEND_PID=$!
  echo "${FRONTEND_PID}" > "${PID_FILE}"

  sleep 2

  if ps -p "${FRONTEND_PID}" > /dev/null; then
    echo "✅ Frontend Web started successfully! (PID: ${FRONTEND_PID})"
    echo "📍 Storefront Home: http://localhost:${PORT}"
    echo "📍 Tire Catalog:    http://localhost:${PORT}/catalog"
    echo "📍 Store Locator:   http://localhost:${PORT}/stores"
    echo "📍 Bay Booking:     http://localhost:${PORT}/checkout"
    echo "📍 Admin Portal:    http://localhost:${PORT}/admin"
    echo "📄 Logs: tail -f .logs/frontend.log"
    echo "🛑 To stop: ./scripts/stop-frontend.sh"
  else
    echo "❌ Failed to start Frontend Web. Check logs:"
    cat "${LOG_DIR}/frontend.log"
    exit 1
  fi
fi
echo "=============================================================="

