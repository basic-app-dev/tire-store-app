import { z } from 'zod';

export const OperatingHoursSchema = z.object({
  day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), // "08:00"
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), // "18:00"
  isClosed: z.boolean().default(false),
});
export type OperatingHours = z.infer<typeof OperatingHoursSchema>;

export const ServiceBaySchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  bayNumber: z.number().int().positive(),
  name: z.string().min(1),
  isAlignmentCapable: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export type ServiceBay = z.infer<typeof ServiceBaySchema>;

export const StoreLocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  postalCode: z.string().min(5),
  phoneNumber: z.string().min(10),
  email: z.string().email(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  operatingHours: z.array(OperatingHoursSchema).optional(),
  distanceMeters: z.number().nonnegative().optional(), // Computed by PostGIS ST_Distance
  distanceMiles: z.number().nonnegative().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type StoreLocation = z.infer<typeof StoreLocationSchema>;

export const StoreSearchQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMiles: z.coerce.number().positive().max(250).default(25),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type StoreSearchQuery = z.infer<typeof StoreSearchQuerySchema>;
