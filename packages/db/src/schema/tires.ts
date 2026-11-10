import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
  index,
} from 'drizzle-orm/pg-core';

export const tires = pgTable(
  'tires',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brand: varchar('brand', { length: 100 }).notNull(),
    model: varchar('model', { length: 150 }).notNull(),
    season: varchar('season', { length: 50 }).notNull(), // 'all_season', 'summer', 'winter', etc.
    category: varchar('category', { length: 50 }).notNull(), // 'passenger', 'performance', etc.
    width: integer('width').notNull(), // 225
    aspectRatio: integer('aspect_ratio').notNull(), // 45
    rimDiameter: integer('rim_diameter').notNull(), // 17
    loadIndex: integer('load_index').notNull(),
    speedRating: varchar('speed_rating', { length: 5 }).notNull(),
    priceCents: integer('price_cents').notNull(),
    imageUrl: text('image_url'),
    runFlat: boolean('run_flat').default(false).notNull(),
    warrantyMiles: integer('warranty_miles'),
    treadwearRating: integer('treadwear_rating'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('tires_dimensions_idx').on(table.width, table.aspectRatio, table.rimDiameter),
    index('tires_brand_season_idx').on(table.brand, table.season),
  ]
);

export type Tire = typeof tires.$inferSelect;
export type NewTire = typeof tires.$inferInsert;
