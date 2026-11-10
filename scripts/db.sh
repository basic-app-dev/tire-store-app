#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

COMMAND=$1

case "${COMMAND}" in
  deploy)
    echo "🚀 Deploying all SQL migrations to Supabase..."
    pnpm db:deploy
    ;;
  seed)
    echo "🌱 Seeding vehicle fitments, tires, stores & bays..."
    pnpm db:seed
    ;;
  verify)
    echo "🔍 Verifying live Supabase connection & RPC status..."
    pnpm db:verify
    ;;
  studio)
    echo "🎨 Opening Drizzle Studio..."
    pnpm db:studio
    ;;
  *)
    echo "=============================================================="
    echo "🗄️  Tire Store Database CLI Tool"
    echo "=============================================================="
    echo "Usage: ./scripts/db.sh [command]"
    echo ""
    echo "Commands:"
    echo "  deploy   - Deploy PostGIS, 11 core tables, triggers & RLS"
    echo "  seed     - Seed Top 6 makes, tires catalog, stores & service bays"
    echo "  verify   - Run live status check on tables and PostGIS RPCs"
    echo "  studio   - Launch Drizzle Studio database browser GUI"
    echo "=============================================================="
    exit 1
    ;;
esac

