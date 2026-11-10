import {
  pgTable,
  uuid,
  varchar,
  doublePrecision,
  boolean,
  timestamp,
  text,
  integer,
  time,
  index,
  customType,
} from 'drizzle-orm/pg-core';

// Custom PostGIS geography point definition for Drizzle
export const geographyPoint = customType<{
  data: { longitude: number; latitude: number };
  driverData: string;
}>({
  dataType() {
    return 'geography';
  },
  toDriver(value) {
    return `POINT(${value.longitude} ${value.latitude})`;
  },
  fromDriver(value) {
    // PostGIS text format or binary parsing
    const matches = value.match(/POINT\(([-+]?[0-9]*\.?[0-9]+)\s+([-+]?[0-9]*\.?[0-9]+)\)/);
    if (!matches) return { longitude: 0, latitude: 0 };
    return {
      longitude: parseFloat(matches[1]),
      latitude: parseFloat(matches[2]),
    };
  },
});

export const stores = pgTable(
  'stores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 150 }).notNull(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    address: varchar('address', { length: 255 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 2 }).notNull(),
    postalCode: varchar('postal_code', { length: 20 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 30 }).notNull(),
    email: varchar('email', { length: 150 }).notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    location: geographyPoint('location'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('stores_postal_code_idx').on(table.postalCode),
    index('stores_city_state_idx').on(table.city, table.state),
  ]
);

export const serviceBays = pgTable(
  'service_bays',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    bayNumber: integer('bay_number').notNull(),
    name: varchar('name', { length: 50 }).notNull(),
    isAlignmentCapable: boolean('is_alignment_capable').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => [index('service_bays_store_idx').on(table.storeId)]
);

export const storeHours = pgTable(
  'store_hours',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    openTime: time('open_time').notNull(), // '08:00:00'
    closeTime: time('close_time').notNull(), // '18:00:00'
    isClosed: boolean('is_closed').default(false).notNull(),
  },
  (table) => [index('store_hours_store_day_idx').on(table.storeId, table.dayOfWeek)]
);

export type Store = typeof stores.$inferSelect;
export type ServiceBay = typeof serviceBays.$inferSelect;
export type StoreHour = typeof storeHours.$inferSelect;
