#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================================="
echo "⚡ Starting Full Tire Store Stack (Backend + Frontend)"
echo "=============================================================="

# 1. Start Backend API
"${SCRIPT_DIR}/start-backend.sh"

echo ""

# 2. Start Frontend Web
"${SCRIPT_DIR}/start-frontend.sh"

echo ""
echo "=============================================================="
echo "🎉 ALL SERVICES ONLINE!"
echo "=============================================================="
echo "🌐 Frontend Web:  http://localhost:3000"
echo "⚙️  Backend API:   http://localhost:4000"
echo "📊 Check Status:  ./scripts/status.sh"
echo "🛑 Stop All:      ./scripts/stop-all.sh"
echo "=============================================================="

