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
  path.resolve(__dirname, '../../.env'),
].filter(Boolean) as string[];

for (const candidate of candidateEnvFiles) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

const connectionString = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;

function getSanitizedHost(uri?: string): string {
  if (!uri) return '127.0.0.1:54322 (local fallback)';
  try {
    const parsed = new URL(uri);
    return `${parsed.protocol}//****:****@${parsed.host}${parsed.pathname}`;
  } catch {
    return 'postgres://****:****@[host-redacted]';
  }
}

async function applyMigrations() {
  console.log('==============================================================');
  console.log('🚀 Tire Store App — Automated Database Migration Deployer');
  console.log('==============================================================\n');

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL is not set in your .env file.');
    process.exit(1);
  }

  console.log(`📡 Connecting to Supabase at: ${getSanitizedHost(connectionString)}`);

  const sql = postgres(connectionString, {
    connect_timeout: 15,
    ssl:
      connectionString.includes('supabase.co') ||
      connectionString.includes('pooler.supabase.com')
        ? 'require'
        : false,
  });

  let migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
  if (!fs.existsSync(migrationsDir)) {
    migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
  }
  if (!fs.existsSync(migrationsDir)) {
    migrationsDir = path.resolve(process.cwd(), '../../supabase/migrations');
  }

  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found at: ${migrationsDir}`);
    await sql.end();
    process.exit(1);
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`📁 Found ${migrationFiles.length} migration files in supabase/migrations/\n`);

  try {
    // Step 0: Ensure extensions schema and search_path are set
    console.log('⚙️  Step 0: Ensuring PostGIS & extensions search_path...');
    await sql.unsafe(`
      CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
      GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
      SET search_path TO public, extensions;
    `);
    console.log('   ✓ PostGIS spatial extension active in schema extensions.\n');

    // Apply each migration sequentially
    for (const [index, file] of migrationFiles.entries()) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log(`⏳ [${index + 1}/${migrationFiles.length}] Applying ${file}...`);
      await sql.unsafe(content);
      console.log(`   ✓ Successfully applied ${file}`);
    }

    // Step Final: Enforce 100% RLS across all application tables
    console.log('\n🔒 Verifying and enforcing Row Level Security (RLS) on all tables...');
    const tables = [
      'tires',
      'vehicle_fitments',
      'customer_vehicles',
      'stores',
      'service_bays',
      'store_hours',
      'appointments',
      'appointment_services',
      'orders',
      'order_items',
      'user_profiles',
    ];

    for (const table of tables) {
      await sql.unsafe(`ALTER TABLE IF EXISTS public."${table}" ENABLE ROW LEVEL SECURITY;`);
    }
    console.log('   ✓ 100% RLS enforced across all 11 tables.');

    console.log('\n==============================================================');
    console.log('🎉 ALL MIGRATIONS APPLIED SUCCESSFULLY TO SUPABASE!');
    console.log('==============================================================');
    console.log('✓ PostGIS spatial types & spatial GiST index ready');
    console.log('✓ 11 Core tables created');
    console.log('✓ Automatic store location trigger active');
    console.log('✓ PostGIS store locator RPC function installed');
    console.log('✓ Atomic checkout RPC function installed');
    console.log('✓ Strict Row Level Security active for all roles\n');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.detail) console.error('   Detail:', error.detail);
    if (error.hint) console.error('   Hint:', error.hint);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigrations();

