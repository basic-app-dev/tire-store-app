import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tires } from './tires';

export const vehicleFitments = pgTable(
  'vehicle_fitments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    year: integer('year').notNull(),
    make: varchar('make', { length: 100 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    trim: varchar('trim', { length: 100 }).notNull(),

    // Front tire dimensions
    frontWidth: integer('front_width').notNull(),
    frontAspectRatio: integer('front_aspect_ratio').notNull(),
    frontRimDiameter: integer('front_rim_diameter').notNull(),
    frontLoadIndex: integer('front_load_index'),
    frontSpeedRating: varchar('front_speed_rating', { length: 5 }),

    // Rear tire dimensions (different for staggered setups)
    isStaggered: boolean('is_staggered').default(false).notNull(),
    rearWidth: integer('rear_width'),
    rearAspectRatio: integer('rear_aspect_ratio'),
    rearRimDiameter: integer('rear_rim_diameter'),
    rearLoadIndex: integer('rear_load_index'),
    rearSpeedRating: varchar('rear_speed_rating', { length: 5 }),

    boltPattern: varchar('bolt_pattern', { length: 20 }), // e.g. "5x114.3"
    oemWheelDiameter: integer('oem_wheel_diameter'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Composite index for ultra-fast fitment lookup: Year -> Make -> Model -> Trim
    index('fitment_lookup_idx').on(table.year, table.make, table.model, table.trim),
    uniqueIndex('fitment_unique_idx').on(table.year, table.make, table.model, table.trim),
  ]
);

export const customerVehicles = pgTable(
  'customer_vehicles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(), // References auth.users(id)
    fitmentId: uuid('fitment_id').references(() => vehicleFitments.id),
    nickname: varchar('nickname', { length: 100 }),
    year: integer('year').notNull(),
    make: varchar('make', { length: 100 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    trim: varchar('trim', { length: 100 }),
    licensePlate: varchar('license_plate', { length: 20 }),
    vin: varchar('vin', { length: 17 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('customer_vehicles_user_idx').on(table.userId)]
);

export type VehicleFitment = typeof vehicleFitments.$inferSelect;
export type CustomerVehicle = typeof customerVehicles.$inferSelect;
