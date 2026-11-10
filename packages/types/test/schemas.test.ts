import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TireDimensionSchema,
  VehicleFitmentSchema,
  StoreSearchQuerySchema,
  SupabaseCustomClaimsSchema,
  AtomicCheckoutInputSchema,
} from '../src/index';

describe('Zod Type Contracts & Validation Schemas', () => {
  it('validates standard tire dimensions', () => {
    const valid = TireDimensionSchema.safeParse({
      width: 225,
      aspectRatio: 45,
      rimDiameter: 17,
      loadIndex: 94,
      speedRating: 'W',
    });
    assert.strictEqual(valid.success, true);

    const invalid = TireDimensionSchema.safeParse({
      width: 50, // out of range
      aspectRatio: 120,
      rimDiameter: 5,
    });
    assert.strictEqual(invalid.success, false);
  });

  it('validates vehicle fitment schema with composite attributes', () => {
    const fitment = VehicleFitmentSchema.safeParse({
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      year: 2023,
      make: 'Tesla',
      model: 'Model 3',
      trim: 'Long Range AWD',
      frontTire: {
        width: 235,
        aspectRatio: 45,
        rimDiameter: 18,
      },
      isStaggered: false,
    });
    assert.strictEqual(fitment.success, true);
  });

  it('validates store locator search query radius constraints', () => {
    const validQuery = StoreSearchQuerySchema.safeParse({
      latitude: '37.7749',
      longitude: '-122.4194',
      radiusMiles: '25',
    });
    assert.strictEqual(validQuery.success, true);
    if (validQuery.success) {
      assert.strictEqual(validQuery.data.radiusMiles, 25);
    }
  });

  it('enforces RBAC custom JWT claims roles', () => {
    const validRoles = ['customer', 'shop_worker', 'store_manager', 'super_admin'];
    for (const role of validRoles) {
      const parsed = SupabaseCustomClaimsSchema.safeParse({ user_role: role });
      assert.strictEqual(parsed.success, true);
    }

    const invalidRole = SupabaseCustomClaimsSchema.safeParse({ user_role: 'unauthorized_hacker' });
    assert.strictEqual(invalidRole.success, false);
  });

  it('validates atomic checkout payload bundling tire items with store appointment', () => {
    const checkout = AtomicCheckoutInputSchema.safeParse({
      items: [
        {
          tireId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          quantity: 4,
        },
      ],
      fulfillmentType: 'store_installation',
      storeId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      appointment: {
        storeId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        services: ['tire_installation', 'wheel_alignment'],
        scheduledStartTime: '2026-12-01T10:00:00Z',
        scheduledEndTime: '2026-12-01T11:30:00Z',
      },
    });
    assert.strictEqual(checkout.success, true);
  });
});
