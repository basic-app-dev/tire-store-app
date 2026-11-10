import { z } from 'zod';

export const TireSeasonSchema = z.enum([
  'all_season',
  'summer',
  'winter',
  'all_weather',
  'all_terrain',
  'mud_terrain',
]);
export type TireSeason = z.infer<typeof TireSeasonSchema>;

export const TireCategorySchema = z.enum([
  'passenger',
  'performance',
  'touring',
  'truck_suv',
  'commercial',
]);
export type TireCategory = z.infer<typeof TireCategorySchema>;

export const TireDimensionSchema = z.object({
  width: z.number().int().min(100).max(400), // e.g. 225 (mm)
  aspectRatio: z.number().int().min(20).max(90), // e.g. 45 (%)
  rimDiameter: z.number().int().min(10).max(30), // e.g. 17 (inches)
  loadIndex: z.number().int().min(60).max(130).optional(), // e.g. 91
  speedRating: z
    .string()
    .length(1)
    .regex(/^[H-Z]$/)
    .optional(), // e.g. 'W'
});
export type TireDimension = z.infer<typeof TireDimensionSchema>;

export const TireProductSchema = z.object({
  id: z.string().uuid(),
  brand: z.string().min(1),
  model: z.string().min(1),
  season: TireSeasonSchema,
  category: TireCategorySchema,
  width: z.number().int(),
  aspectRatio: z.number().int(),
  rimDiameter: z.number().int(),
  loadIndex: z.number().int(),
  speedRating: z.string(),
  priceCents: z.number().int().nonnegative(),
  imageUrl: z.string().url().optional(),
  runFlat: z.boolean().default(false),
  warrantyMiles: z.number().int().nonnegative().optional(),
  treadwearRating: z.number().int().optional(),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TireProduct = z.infer<typeof TireProductSchema>;

export const TireFilterQuerySchema = z.object({
  brand: z.string().optional(),
  season: TireSeasonSchema.optional(),
  category: TireCategorySchema.optional(),
  width: z.coerce.number().int().optional(),
  aspectRatio: z.coerce.number().int().optional(),
  rimDiameter: z.coerce.number().int().optional(),
  runFlat: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().int().optional(),
  maxPrice: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type TireFilterQuery = z.infer<typeof TireFilterQuerySchema>;
