import { z } from 'zod';

export const UserRoleSchema = z.enum(['customer', 'shop_worker', 'store_manager', 'super_admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const SupabaseCustomClaimsSchema = z.object({
  user_role: UserRoleSchema.default('customer'),
  store_id: z.string().uuid().optional(),
});
export type SupabaseCustomClaims = z.infer<typeof SupabaseCustomClaimsSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
  role: UserRoleSchema,
  assignedStoreId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;
