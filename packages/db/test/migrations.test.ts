import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Database Architecture & Supabase Migrations', () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.resolve(currentDir, '../../../supabase/migrations');

  it('contains all required sequential Supabase migrations', () => {
    assert.strictEqual(fs.existsSync(migrationsDir), true);
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    assert.strictEqual(files.length >= 5, true);
    assert.strictEqual(files[0].includes('init_postgis'), true);
  });

  it('enforces PostGIS extension initialization', () => {
    const initSql = fs.readFileSync(
      path.join(migrationsDir, '20261108000000_init_postgis_and_rls.sql'),
      'utf8'
    );
    assert.strictEqual(initSql.includes('CREATE EXTENSION IF NOT EXISTS postgis'), true);
  });

  it('enforces composite fitment indexing on (year, make, model, trim)', () => {
    const tablesSql = fs.readFileSync(
      path.join(migrationsDir, '20261108000001_core_tables.sql'),
      'utf8'
    );
    assert.strictEqual(
      tablesSql.includes('vehicle_fitments') && tablesSql.includes('(year, make, model, trim)'),
      true
    );
  });

  it('enforces PostGIS spatial indexing with ST_DWithin and ST_Distance in store locator RPC', () => {
    const locatorSql = fs.readFileSync(
      path.join(migrationsDir, '20261108000002_postgis_locator_rpc.sql'),
      'utf8'
    );
    assert.strictEqual(locatorSql.includes('find_stores_within_radius'), true);
    assert.strictEqual(locatorSql.includes('ST_DWithin'), true);
    assert.strictEqual(locatorSql.includes('ST_Distance'), true);
  });

  it('enforces atomic booking and payment checkout RPC', () => {
    const checkoutSql = fs.readFileSync(
      path.join(migrationsDir, '20261108000003_atomic_checkout_rpc.sql'),
      'utf8'
    );
    assert.strictEqual(checkoutSql.includes('complete_atomic_checkout'), true);
    assert.strictEqual(checkoutSql.includes('appointments'), true);
    assert.strictEqual(checkoutSql.includes('orders'), true);
  });

  it('verifies 100% table RLS enablement across all database entities', () => {
    const rlsSql = fs.readFileSync(
      path.join(migrationsDir, '20261108000004_rls_policies.sql'),
      'utf8'
    );
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
    for (const table of requiredTables) {
      assert.strictEqual(
        rlsSql.includes(`${table} ENABLE ROW LEVEL SECURITY;`),
        true,
        `Table ${table} must explicitly have RLS enabled`
      );
    }
  });

  it('enforces RBAC role isolation via Supabase JWT claims (customer, shop_worker, store_manager, super_admin)', () => {
    const rlsSql = fs.readFileSync(
      path.join(migrationsDir, '20261108000004_rls_policies.sql'),
      'utf8'
    );
    assert.strictEqual(rlsSql.includes('auth.jwt()'), true);
    assert.strictEqual(rlsSql.includes('customer'), true);
    assert.strictEqual(rlsSql.includes('shop_worker'), true);
    assert.strictEqual(rlsSql.includes('store_manager'), true);
    assert.strictEqual(rlsSql.includes('super_admin'), true);
  });
});
