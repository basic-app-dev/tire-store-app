import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function seedDatabase() {
  console.log('==============================================================');
  console.log('🌱 Tire Store App — Database Seeder (TIRE-11)');
  console.log('==============================================================\n');

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL is not set in your .env file.');
    process.exit(1);
  }

  console.log(`📡 Connecting to Supabase at: ${getSanitizedHost(connectionString)}\n`);

  const sql = postgres(connectionString, {
    connect_timeout: 15,
    ssl:
      connectionString.includes('supabase.co') ||
      connectionString.includes('pooler.supabase.com')
        ? 'require'
        : false,
  });

  try {
    console.log('⚙️  Step 0: Ensuring unique constraints for idempotent seeding...');
    await sql.unsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_fitment ON public.vehicle_fitments (year, make, model, trim);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_store_code ON public.stores (code);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_store_bay_number ON public.service_bays (store_id, bay_number);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_store_day_of_week ON public.store_hours (store_id, day_of_week);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_tires_spec ON public.tires (brand, model, width, aspect_ratio, rim_diameter);
    `);
    console.log('   ✓ Seed constraints verified.\n');

    console.log('⏳ 1. Seeding Vehicle Fitments (Top 6 Makes: Toyota, Honda, Ford, Tesla, Chevy, BMW)...');
    const fitments = [
      // Toyota Camry (2024)
      { year: 2024, make: 'Toyota', model: 'Camry', trim: 'LE', f_w: 205, f_ar: 65, f_r: 16, f_li: 95, f_sr: 'H' },
      { year: 2024, make: 'Toyota', model: 'Camry', trim: 'XSE', f_w: 235, f_ar: 40, f_r: 19, f_li: 96, f_sr: 'V' },
      // Toyota RAV4 (2024)
      { year: 2024, make: 'Toyota', model: 'RAV4', trim: 'XLE', f_w: 225, f_ar: 65, f_r: 17, f_li: 102, f_sr: 'H' },
      // Honda Civic (2024)
      { year: 2024, make: 'Honda', model: 'Civic', trim: 'Sport', f_w: 235, f_ar: 40, f_r: 18, f_li: 91, f_sr: 'W' },
      { year: 2024, make: 'Honda', model: 'Civic', trim: 'EX', f_w: 215, f_ar: 50, f_r: 17, f_li: 91, f_sr: 'H' },
      // Honda CR-V (2024)
      { year: 2024, make: 'Honda', model: 'CR-V', trim: 'EX-L', f_w: 235, f_ar: 60, f_r: 18, f_li: 103, f_sr: 'H' },
      // Ford F-150 (2024)
      { year: 2024, make: 'Ford', model: 'F-150', trim: 'XLT', f_w: 275, f_ar: 65, f_r: 18, f_li: 116, f_sr: 'T' },
      // Tesla Model 3 (2024)
      { year: 2024, make: 'Tesla', model: 'Model 3', trim: 'Long Range', f_w: 235, f_ar: 45, f_r: 18, f_li: 98, f_sr: 'W' },
      // Tesla Model Y (2024)
      { year: 2024, make: 'Tesla', model: 'Model Y', trim: 'Long Range AWD', f_w: 255, f_ar: 45, f_r: 19, f_li: 104, f_sr: 'W' },
      // Chevrolet Silverado 1500 (2024)
      { year: 2024, make: 'Chevrolet', model: 'Silverado 1500', trim: 'LT', f_w: 265, f_ar: 65, f_r: 18, f_li: 114, f_sr: 'T' },
      // BMW 3 Series (2024)
      { year: 2024, make: 'BMW', model: '330i', trim: 'Base', f_w: 225, f_ar: 45, f_r: 18, f_li: 95, f_sr: 'Y' },
    ];

    for (const f of fitments) {
      await sql`
        INSERT INTO public.vehicle_fitments (
          year, make, model, trim,
          front_width, front_aspect_ratio, front_rim_diameter, front_load_index, front_speed_rating,
          is_staggered
        ) VALUES (
          ${f.year}, ${f.make}, ${f.model}, ${f.trim},
          ${f.f_w}, ${f.f_ar}, ${f.f_r}, ${f.f_li}, ${f.f_sr},
          false
        )
        ON CONFLICT (year, make, model, trim) DO UPDATE SET
          front_width = EXCLUDED.front_width,
          front_aspect_ratio = EXCLUDED.front_aspect_ratio,
          front_rim_diameter = EXCLUDED.front_rim_diameter;
      `;
    }
    console.log(`   ✓ Seeded ${fitments.length} vehicle fitments.`);

    console.log('⏳ 2. Seeding Core Tire Catalog...');
    const tires = [
      {
        brand: 'Michelin',
        model: 'CrossClimate 2',
        season: 'all_season',
        category: 'touring',
        width: 235,
        aspect_ratio: 45,
        rim_diameter: 18,
        load_index: 98,
        speed_rating: 'V',
        price_cents: 24899,
        image_url: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
        warranty_miles: 60000,
        treadwear_rating: 640,
        description: 'Exceptional all-season traction with revolutionary 3D SipeLock technology and severe snow certification.',
      },
      {
        brand: 'Michelin',
        model: 'Defender 2',
        season: 'all_season',
        category: 'passenger',
        width: 215,
        aspect_ratio: 50,
        rim_diameter: 17,
        load_index: 95,
        speed_rating: 'H',
        price_cents: 19899,
        image_url: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
        warranty_miles: 80000,
        treadwear_rating: 840,
        description: 'Engineered for ultimate tread longevity and quiet, comfortable highway cruising across passenger sedans and crossovers.',
      },
      {
        brand: 'Continental',
        model: 'ExtremeContact DWS06 Plus',
        season: 'all_season',
        category: 'ultra_high_performance',
        width: 235,
        aspect_ratio: 40,
        rim_diameter: 19,
        load_index: 96,
        speed_rating: 'Y',
        price_cents: 26599,
        image_url: 'https://images.unsplash.com/photo-1543465077-db45d34b88a5?auto=format&fit=crop&w=800&q=80',
        warranty_miles: 50000,
        treadwear_rating: 560,
        description: 'Premium ultra-high-performance all-season tire delivering precise cornering, wet grip, and tuned indicators for snow and dry performance.',
      },
      {
        brand: 'Bridgestone',
        model: 'Turanza QuietTrack',
        season: 'all_season',
        category: 'touring',
        width: 225,
        aspect_ratio: 45,
        rim_diameter: 18,
        load_index: 95,
        speed_rating: 'V',
        price_cents: 22999,
        image_url: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
        warranty_miles: 80000,
        treadwear_rating: 800,
        description: 'Designed to dampen road noise and absorb road vibrations while delivering confident all-season control.',
      },
      {
        brand: 'Goodyear',
        model: 'Wrangler All-Terrain Adventure',
        season: 'all_terrain',
        category: 'truck_suv',
        width: 275,
        aspect_ratio: 65,
        rim_diameter: 18,
        load_index: 116,
        speed_rating: 'T',
        price_cents: 28999,
        image_url: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
        warranty_miles: 60000,
        treadwear_rating: 640,
        description: 'Rugged DuPont Kevlar layered construction for superior strength on highway and off-road trails.',
      },
      {
        brand: 'Pirelli',
        model: 'P Zero All Season Plus 3',
        season: 'all_season',
        category: 'performance',
        width: 255,
        aspect_ratio: 45,
        rim_diameter: 19,
        load_index: 104,
        speed_rating: 'Y',
        price_cents: 29599,
        image_url: 'https://images.unsplash.com/photo-1543465077-db45d34b88a5?auto=format&fit=crop&w=800&q=80',
        warranty_miles: 50000,
        treadwear_rating: 500,
        description: 'Developed specifically for North American drivers demanding luxury performance sports handling and longevity.',
      },
    ];

    for (const t of tires) {
      await sql`
        INSERT INTO public.tires (
          brand, model, season, category, width, aspect_ratio, rim_diameter,
          load_index, speed_rating, price_cents, image_url, warranty_miles, treadwear_rating, description
        ) VALUES (
          ${t.brand}, ${t.model}, ${t.season}, ${t.category}, ${t.width}, ${t.aspect_ratio}, ${t.rim_diameter},
          ${t.load_index}, ${t.speed_rating}, ${t.price_cents}, ${t.image_url}, ${t.warranty_miles}, ${t.treadwear_rating}, ${t.description}
        )
        ON CONFLICT (brand, model, width, aspect_ratio, rim_diameter) DO UPDATE SET
          price_cents = EXCLUDED.price_cents,
          image_url = EXCLUDED.image_url,
          warranty_miles = EXCLUDED.warranty_miles,
          description = EXCLUDED.description;
      `;
    }
    console.log(`   ✓ Seeded ${tires.length} core tire models.`);

    console.log('⏳ 3. Seeding Sample Retail Stores & Service Bays...');
    const stores = [
      {
        name: 'Apex Tire Center — Austin Downtown Flagship',
        code: 'ATX-001',
        address: '500 E 7th St',
        city: 'Austin',
        state: 'TX',
        postal_code: '78701',
        phone_number: '(512) 555-0142',
        email: 'austin-flagship@apextire.com',
        latitude: 30.2687,
        longitude: -97.7377,
        bays: [
          { bay_number: 1, name: 'Bay 1 — Express Mount & Balance', is_alignment: false },
          { bay_number: 2, name: 'Bay 2 — Express Mount & Balance', is_alignment: false },
          { bay_number: 3, name: 'Bay 3 — Hawkeye Elite 3D Alignment', is_alignment: true },
          { bay_number: 4, name: 'Bay 4 — Heavy Duty Truck Bay', is_alignment: true },
        ],
      },
      {
        name: 'Apex Tire Center — Dallas North Park',
        code: 'DAL-002',
        address: '8687 N Central Expy',
        city: 'Dallas',
        state: 'TX',
        postal_code: '75225',
        phone_number: '(214) 555-0198',
        email: 'dallas-north@apextire.com',
        latitude: 32.8688,
        longitude: -96.7725,
        bays: [
          { bay_number: 1, name: 'Bay 1 — Rapid Mount & Road Force Balance', is_alignment: false },
          { bay_number: 2, name: 'Bay 2 — Computerized Alignment Rack', is_alignment: true },
          { bay_number: 3, name: 'Bay 3 — General Tire Service', is_alignment: false },
        ],
      },
    ];

    for (const s of stores) {
      const [insertedStore] = await sql`
        INSERT INTO public.stores (
          name, code, address, city, state, postal_code, phone_number, email, latitude, longitude
        ) VALUES (
          ${s.name}, ${s.code}, ${s.address}, ${s.city}, ${s.state}, ${s.postal_code}, ${s.phone_number}, ${s.email}, ${s.latitude}, ${s.longitude}
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude
        RETURNING id;
      `;

      for (const bay of s.bays) {
        await sql`
          INSERT INTO public.service_bays (store_id, bay_number, name, is_alignment_capable, is_active)
          VALUES (${insertedStore.id}, ${bay.bay_number}, ${bay.name}, ${bay.is_alignment}, true)
          ON CONFLICT (store_id, bay_number) DO UPDATE SET
            name = EXCLUDED.name,
            is_alignment_capable = EXCLUDED.is_alignment_capable;
        `;
      }

      // Add operating hours (Mon-Sat 8am-6pm)
      for (let day = 1; day <= 6; day++) {
        await sql`
          INSERT INTO public.store_hours (store_id, day_of_week, open_time, close_time, is_closed)
          VALUES (${insertedStore.id}, ${day}, '08:00:00', '18:00:00', false)
          ON CONFLICT (store_id, day_of_week) DO NOTHING;
        `;
      }
      // Sunday closed
      await sql`
        INSERT INTO public.store_hours (store_id, day_of_week, open_time, close_time, is_closed)
        VALUES (${insertedStore.id}, 0, '00:00:00', '00:00:00', true)
        ON CONFLICT (store_id, day_of_week) DO NOTHING;
      `;
    }
    console.log(`   ✓ Seeded ${stores.length} retail stores, operating hours, and 7 service bays.`);

    console.log('\n==============================================================');
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('==============================================================');
    console.log('✓ 11 Vehicle fitments seeded across Toyota, Honda, Ford, Tesla, Chevy, BMW');
    console.log('✓ 6 Core brand tires seeded with specs, warranty, and pricing');
    console.log('✓ 2 Retail stores seeded with PostGIS geography coordinates');
    console.log('✓ 7 Service bays configured with alignment capabilities and operating hours\n');
  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seedDatabase();

