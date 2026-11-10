import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Safely look for environment file without leaking credentials
const candidateEnvFiles = [
  process.env.DATABASE_ENV_PATH,
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../.env.local'),
  path.resolve(__dirname, '../.env'),
].filter(Boolean) as string[];

for (const candidate of candidateEnvFiles) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

const connectionString = process.env.DATABASE_URL;

// Helper to sanitize connection URL for logging without credential leakage
function getSanitizedHost(uri?: string): string {
  if (!uri) return '127.0.0.1:54322 (local fallback)';
  try {
    const parsed = new URL(uri);
    return `${parsed.protocol}//****:****@${parsed.host}${parsed.pathname}`;
  } catch {
    return 'postgres://****:****@[host-redacted]';
  }
}

async function verifySupabase() {
  console.log('==============================================================');
  console.log('🔍 Tire Store App — Supabase Live Verification');
  console.log('==============================================================\n');

  if (!connectionString || connectionString.includes('127.0.0.1')) {
    console.warn('⚠️  DATABASE_URL is either missing or pointing to local emulator (127.0.0.1).');
    console.warn('    To connect to your cloud Supabase project:');
    console.warn('    1. Open your Supabase Dashboard -> Project Settings -> Database');
    console.warn('    2. Copy the URI under "Connection string" (URI or Transaction Pooler)');
    console.warn('    3. Provide DATABASE_URL in your environment or .env file\n');
  } else {
    console.log(`📡 Connecting to Supabase at: ${getSanitizedHost(connectionString)}\n`);
  }

  const sql = postgres(
    connectionString || 'postgres://postgres:postgres@127.0.0.1:54322/postgres',
    {
      connect_timeout: 10,
      ssl:
        connectionString?.includes('supabase.co') ||
        connectionString?.includes('pooler.supabase.com')
          ? 'require'
          : false,
    }
  );

  try {
    // 1. Check PostGIS Extension
    const extensions = await sql`
      SELECT extname, extversion FROM pg_extension WHERE extname = 'postgis';
    `;
    if (extensions.length > 0) {
      console.log(`✅ [PostGIS]: Installed (version: ${extensions[0].extversion})`);
    } else {
      console.log(
        `❌ [PostGIS]: NOT installed. Run migration: supabase/migrations/20261108000001_core_tables.sql`
      );
    }

    // 2. Check Tables
    const requiredTables = [
      'tires',
      'vehicle_fitments',
      'stores',
      'service_bays',
      'store_hours',
      'user_profiles',
      'customer_vehicles',
      'appointments',
      'appointment_services',
      'orders',
      'order_items',
    ];

    console.log('\n📋 Checking Required Tables:');
    const existingTables = await sql`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `;
    const tableMap = new Map(existingTables.map((t) => [t.tablename, t.rowsecurity]));

    let missingTables = 0;
    let missingRls = 0;

    for (const table of requiredTables) {
      if (tableMap.has(table)) {
        const hasRls = tableMap.get(table);
        if (hasRls) {
          console.log(`  ✅ ${table.padEnd(24)} (RLS Enabled)`);
        } else {
          console.log(`  ⚠️  ${table.padEnd(24)} (EXISTS, but RLS Disabled!)`);
          missingRls++;
        }
      } else {
        console.log(`  ❌ ${table.padEnd(24)} (MISSING)`);
        missingTables++;
      }
    }

    // 3. Check RPC Functions
    console.log('\n⚡ Checking Stored Procedures (RPCs):');
    const functions = await sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name IN ('find_stores_within_radius', 'complete_atomic_checkout');
    `;
    const funcNames = new Set(functions.map((f) => f.routine_name));

    if (funcNames.has('find_stores_within_radius')) {
      console.log('  ✅ find_stores_within_radius (PostGIS Store Locator RPC)');
    } else {
      console.log('  ❌ find_stores_within_radius (MISSING)');
    }

    if (funcNames.has('complete_atomic_checkout')) {
      console.log('  ✅ complete_atomic_checkout (Atomic Booking & Checkout RPC)');
    } else {
      console.log('  ❌ complete_atomic_checkout (MISSING)');
    }

    // 4. Summary
    console.log('\n==============================================================');
    if (extensions.length > 0 && missingTables === 0 && missingRls === 0 && funcNames.size === 2) {
      console.log('🎉 ALL CHECKS PASSED: Your Supabase database is 100% ready!');
      console.log('   TIRE-7, TIRE-8, TIRE-9, TIRE-10 are fully verified in your database.');
    } else {
      console.log('⚠️  SOME CHECKS FAILED: Tables or functions need to be applied.');
      console.log('   To apply all migrations to your Supabase project, run:');
      console.log('   pnpm run db:push');
      console.log('   OR copy the contents of supabase/migrations/*.sql into Supabase SQL Editor.');
    }
    console.log('==============================================================\n');
  } catch (error: any) {
    const rawMsg = error?.message || 'Unknown database error';
    const sanitizedMsg = rawMsg
      .replace(/:\/\/[^@]+@/g, '://****:****@')
      .replace(/:[^:@/]+@/g, ':****@');
    console.error('❌ Connection Error:', sanitizedMsg);
    console.error('\nTips to fix:');
    console.error(
      '1. Check that your password in DATABASE_URL has special characters URL-encoded.'
    );
    console.error('2. If using Supabase Connection Pooler, use port 6543 with ?sslmode=require.');
    console.error(
      '3. Check that your IP is allowed in Supabase Network Restrictions (usually 0.0.0.0/0 allowed by default).'
    );
  } finally {
    await sql.end();
  }
}

verifySupabase();
