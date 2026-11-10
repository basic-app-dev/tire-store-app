import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Safely load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') });

const connectionString = process.env.DATABASE_URL;

async function prepareDatabase() {
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL is not set in your .env file.');
    process.exit(1);
  }

  console.log('📡 Connecting to your Supabase database...');

  const sql = postgres(connectionString, {
    connect_timeout: 15,
    ssl: connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com') ? 'require' : false,
  });

  try {
    console.log('⏳ Step 1: Installing PostGIS spatial extension...');
    await sql`CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;`;

    console.log('⏳ Step 2: Granting usage permissions on "extensions" schema...');
    await sql`GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;`;

    console.log('⏳ Step 3: Configuring database search_path (public, extensions)...');
    await sql`ALTER DATABASE postgres SET search_path TO public, extensions;`;
    await sql`ALTER ROLE CURRENT_USER SET search_path TO public, extensions;`;
    await sql`SET search_path TO public, extensions;`;

    console.log('\n🎉 SUCCESS! PostGIS is now active in your Supabase database.');
    console.log('👉 You can now run: pnpm --filter @tire-store/db run db:push\n');
  } catch (error: any) {
    console.error('❌ Database initialization error:', error.message);
    console.log('\nFallback: Open your Supabase SQL Editor and run:');
    console.log('CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;\n');
  } finally {
    await sql.end();
  }
}

prepareDatabase();
