import type { ServiceType } from './appointments';

export interface BayDurationCalculationInput {
  tireQuantity?: number;
  services: ServiceType[];
}

export interface BayDurationResult {
  totalDurationMinutes: number;
  breakdown: {
    service: string;
    durationMinutes: number;
  }[];
}

/**
 * Calculates the required service bay duration in minutes based on tire count and requested services.
 * - 4 Tires Installation: 60 minutes
 * - 2 Tires Installation: 35 minutes
 * - 1 Tire Installation: 20 minutes
 * - Wheel Alignment: +30 minutes
 * - Wheel Balancing: +15 minutes
 * - Tire Rotation: +20 minutes
 * - Seasonal Changeover: 45 minutes
 * - Flat Repair: 30 minutes
 * - Vehicle / Tire Inspection: 15 minutes
 */
export function calculateBayDuration(input: BayDurationCalculationInput): BayDurationResult {
  const breakdown: { service: string; durationMinutes: number }[] = [];
  let totalMinutes = 0;

  const { tireQuantity = 0, services } = input;

  // 1. Tire Installation duration based on quantity
  if (services.includes('tire_installation')) {
    let installMinutes = 60; // default 4 tires
    if (tireQuantity <= 1) {
      installMinutes = 20;
    } else if (tireQuantity === 2 || tireQuantity === 3) {
      installMinutes = 35;
    } else {
      installMinutes = 60;
    }
    breakdown.push({
      service: `Tire Installation (${tireQuantity > 0 ? tireQuantity : 4} tires)`,
      durationMinutes: installMinutes,
    });
    totalMinutes += installMinutes;
  }

  // 2. Additional services
  for (const service of services) {
    if (service === 'tire_installation') continue; // already handled

    switch (service) {
      case 'wheel_alignment': {
        const mins = 30;
        breakdown.push({ service: 'Wheel Alignment', durationMinutes: mins });
        totalMinutes += mins;
        break;
      }
      case 'wheel_balancing': {
        const mins = 15;
        breakdown.push({ service: 'Wheel Balancing', durationMinutes: mins });
        totalMinutes += mins;
        break;
      }
      case 'tire_rotation': {
        const mins = 20;
        breakdown.push({ service: 'Tire Rotation', durationMinutes: mins });
        totalMinutes += mins;
        break;
      }
      case 'seasonal_changeover': {
        const mins = 45;
        breakdown.push({ service: 'Seasonal Changeover', durationMinutes: mins });
        totalMinutes += mins;
        break;
      }
      case 'flat_repair': {
        const mins = 30;
        breakdown.push({ service: 'Flat Repair', durationMinutes: mins });
        totalMinutes += mins;
        break;
      }
      case 'inspection': {
        const mins = 15;
        breakdown.push({ service: 'Vehicle & Tire Inspection', durationMinutes: mins });
        totalMinutes += mins;
        break;
      }
    }
  }

  // Minimum appointment time: 15 minutes
  if (totalMinutes === 0) {
    totalMinutes = 30;
    breakdown.push({ service: 'Standard Service Block', durationMinutes: 30 });
  }

  return {
    totalDurationMinutes: totalMinutes,
    breakdown,
  };
}
