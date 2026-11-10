import http from 'node:http';
import { parse } from 'node:url';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { calculateBayDuration } from '@tire-store/types';

// Safely look for environment file
const candidateEnvFiles = [
  process.env.DATABASE_ENV_PATH,
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../../.env.local'),
].filter(Boolean) as string[];

for (const candidate of candidateEnvFiles) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

const PORT = Number(process.env.PORT) || 4000;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://znffmbnroaewfqsmjjcp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const parsedUrl = parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '/';

  try {
    // 1. Health Status Route
    if (pathname === '/health' || pathname === '/api/health') {
      sendJson(res, 200, {
        status: 'online',
        service: '@tire-store/api',
        timestamp: new Date().toISOString(),
        supabaseUrl: SUPABASE_URL,
        version: '1.0.0',
      });
      return;
    }

    // 2. Vehicle Fitments Makes Route
    if (pathname === '/api/fitments/makes') {
      const { data, error } = await supabase
        .from('vehicle_fitments')
        .select('make')
        .order('make', { ascending: true });

      if (error) {
        sendJson(res, 500, { error: error.message });
        return;
      }

      const uniqueMakes = Array.from(new Set(data.map((d: any) => d.make)));
      sendJson(res, 200, { makes: uniqueMakes });
      return;
    }

    // 3. Vehicle Fitments Models Route
    if (pathname === '/api/fitments/models') {
      const make = parsedUrl.query.make as string;
      if (!make) {
        sendJson(res, 400, { error: 'Query parameter "make" is required' });
        return;
      }

      const { data, error } = await supabase
        .from('vehicle_fitments')
        .select('model')
        .eq('make', make)
        .order('model', { ascending: true });

      if (error) {
        sendJson(res, 500, { error: error.message });
        return;
      }

      const uniqueModels = Array.from(new Set(data.map((d: any) => d.model)));
      sendJson(res, 200, { models: uniqueModels });
      return;
    }

    // 4. Vehicle Fitment Trims & Tire Specs
    if (pathname === '/api/fitments/trims') {
      const { make, model, year } = parsedUrl.query;
      let query = supabase.from('vehicle_fitments').select('*');

      if (make) query = query.eq('make', make as string);
      if (model) query = query.eq('model', model as string);
      if (year) query = query.eq('year', Number(year));

      const { data, error } = await query;
      if (error) {
        sendJson(res, 500, { error: error.message });
        return;
      }
      sendJson(res, 200, { fitments: data });
      return;
    }

    // 5. Tire Catalog Route
    if (pathname === '/api/tires') {
      let query = supabase.from('tires').select('*').order('price_cents', { ascending: true });

      if (parsedUrl.query.season) {
        query = query.eq('season', parsedUrl.query.season as string);
      }
      if (parsedUrl.query.width) {
        query = query.eq('width', Number(parsedUrl.query.width));
      }
      if (parsedUrl.query.rim_diameter) {
        query = query.eq('rim_diameter', Number(parsedUrl.query.rim_diameter));
      }

      const { data, error } = await query;
      if (error) {
        sendJson(res, 500, { error: error.message });
        return;
      }
      sendJson(res, 200, { tires: data });
      return;
    }

    // 6. PostGIS Store Locator Route
    if (pathname === '/api/stores/nearby') {
      const lat = Number(parsedUrl.query.lat) || 30.2687;
      const lng = Number(parsedUrl.query.lng) || -97.7377;
      const radiusMeters = Number(parsedUrl.query.radiusMeters) || 40233.6;

      const { data, error } = await supabase.rpc('find_stores_within_radius', {
        p_latitude: lat,
        p_longitude: lng,
        p_radius_meters: radiusMeters,
        p_limit: 10,
      });

      if (error) {
        sendJson(res, 500, { error: error.message });
        return;
      }
      sendJson(res, 200, { stores: data });
      return;
    }

    // 7. Dynamic Bay Duration Calculator Route
    if (pathname === '/api/bays/calculate-duration') {
      const tireCount = Number(parsedUrl.query.tireCount) || 4;
      const includeAlignment = parsedUrl.query.alignment === 'true';
      const includeBalancing = parsedUrl.query.balancing === 'true';

      const durationMinutes = calculateBayDuration({
        tireCount: tireCount as 2 | 4,
        includeAlignment,
        includeBalancing,
      });

      sendJson(res, 200, {
        durationMinutes,
        breakdown: {
          tireMountAndBalance: tireCount === 4 ? 60 : 35,
          laserAlignment: includeAlignment ? 30 : 0,
          roadForceBalancing: includeBalancing ? 15 : 0,
        },
      });
      return;
    }

    // Default 404
    sendJson(res, 404, { error: `Endpoint ${pathname} not found on @tire-store/api` });
  } catch (err: any) {
    sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log('==============================================================');
  console.log(`🚀 Tire Store App — Backend API Server running on port ${PORT}`);
  console.log('==============================================================');
  console.log(`📍 Health Check: http://localhost:${PORT}/health`);
  console.log(`📍 Vehicle Makes: http://localhost:${PORT}/api/fitments/makes`);
  console.log(`📍 Tires Catalog: http://localhost:${PORT}/api/tires`);
  console.log(`📍 Nearby Stores: http://localhost:${PORT}/api/stores/nearby`);
  console.log(`📍 Bay Duration: http://localhost:${PORT}/api/bays/calculate-duration?tireCount=4&alignment=true\n`);
});

