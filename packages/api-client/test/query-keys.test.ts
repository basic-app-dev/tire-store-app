import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { queryKeys } from '../src/query-keys';

describe('Query Key Factories', () => {
  it('generates consistent keys for tire searches', () => {
    const filter = { brand: 'Michelin', width: 225 };
    const key = queryKeys.tires.list(filter);
    assert.deepStrictEqual(key, ['tires', 'list', { brand: 'Michelin', width: 225 }]);
  });

  it('generates hierarchical fitment keys for vehicle dropdowns', () => {
    const yearKey = queryKeys.vehicles.years();
    const makeKey = queryKeys.vehicles.makes(2023);
    const modelKey = queryKeys.vehicles.models(2023, 'Tesla');
    const trimKey = queryKeys.vehicles.trims(2023, 'Tesla', 'Model 3');

    assert.deepStrictEqual(yearKey, ['vehicles', 'years']);
    assert.deepStrictEqual(makeKey, ['vehicles', 'makes', 2023]);
    assert.deepStrictEqual(modelKey, ['vehicles', 'models', 2023, 'Tesla']);
    assert.deepStrictEqual(trimKey, ['vehicles', 'trims', 2023, 'Tesla', 'Model 3']);
  });

  it('generates store locator query keys with coordinate parameters', () => {
    const locatorKey = queryKeys.stores.locator(37.7749, -122.4194, 25);
    assert.deepStrictEqual(locatorKey, [
      'stores',
      'locator',
      { lat: 37.7749, lng: -122.4194, radiusMiles: 25 },
    ]);
  });
});
