import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBayDuration } from '../src/calculator';

describe('calculateBayDuration', () => {
  it('calculates 60 minutes for 4 tires installation', () => {
    const result = calculateBayDuration({
      tireQuantity: 4,
      services: ['tire_installation'],
    });
    assert.strictEqual(result.totalDurationMinutes, 60);
    assert.strictEqual(result.breakdown.length, 1);
    assert.strictEqual(result.breakdown[0].durationMinutes, 60);
  });

  it('calculates 35 minutes for 2 tires installation', () => {
    const result = calculateBayDuration({
      tireQuantity: 2,
      services: ['tire_installation'],
    });
    assert.strictEqual(result.totalDurationMinutes, 35);
  });

  it('calculates 90 minutes for 4 tires installation + wheel alignment (60 + 30)', () => {
    const result = calculateBayDuration({
      tireQuantity: 4,
      services: ['tire_installation', 'wheel_alignment'],
    });
    assert.strictEqual(result.totalDurationMinutes, 90);
    assert.deepStrictEqual(result.breakdown, [
      { service: 'Tire Installation (4 tires)', durationMinutes: 60 },
      { service: 'Wheel Alignment', durationMinutes: 30 },
    ]);
  });

  it('calculates 105 minutes for 4 tires + alignment + balancing (60 + 30 + 15)', () => {
    const result = calculateBayDuration({
      tireQuantity: 4,
      services: ['tire_installation', 'wheel_alignment', 'wheel_balancing'],
    });
    assert.strictEqual(result.totalDurationMinutes, 105);
  });

  it('calculates 45 minutes for seasonal changeover standalone', () => {
    const result = calculateBayDuration({
      services: ['seasonal_changeover'],
    });
    assert.strictEqual(result.totalDurationMinutes, 45);
  });
});
