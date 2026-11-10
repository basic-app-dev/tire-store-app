import { z } from 'zod';
import { TireDimensionSchema } from './tires';

export const VehicleFitmentSchema = z.object({
  id: z.string().uuid(),
  year: z.number().int().min(1980).max(2035),
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().min(1),
  frontTire: TireDimensionSchema,
  rearTire: TireDimensionSchema.optional(), // Present if vehicle uses staggered fitment
  isStaggered: z.boolean().default(false),
  boltPattern: z.string().optional(), // e.g. "5x114.3"
  oemWheelDiameter: z.number().int().optional(),
});
export type VehicleFitment = z.infer<typeof VehicleFitmentSchema>;

export const CustomerVehicleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  fitmentId: z.string().uuid().optional(),
  nickname: z.string().optional(),
  year: z.number().int(),
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().optional(),
  licensePlate: z.string().optional(),
  vin: z
    .string()
    .length(17)
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i)
    .optional(),
  createdAt: z.string().datetime(),
});
export type CustomerVehicle = z.infer<typeof CustomerVehicleSchema>;

export const FitmentQuerySchema = z.object({
  year: z.coerce.number().int().min(1980).max(2035),
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().optional(),
});
export type FitmentQuery = z.infer<typeof FitmentQuerySchema>;
