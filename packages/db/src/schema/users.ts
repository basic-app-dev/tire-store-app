import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { stores } from './stores';

export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid('id').primaryKey(), // Matches auth.users(id)
    email: varchar('email', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 30 }),
    role: varchar('role', { length: 50 }).notNull().default('customer'), // 'customer', 'shop_worker', 'store_manager', 'super_admin'
    assignedStoreId: uuid('assigned_store_id').references(() => stores.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('user_profiles_role_idx').on(table.role),
    index('user_profiles_store_idx').on(table.assignedStoreId),
  ]
);

export type UserProfile = typeof userProfiles.$inferSelect;
