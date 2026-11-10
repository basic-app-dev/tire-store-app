import { pgTable, uuid, varchar, integer, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { stores } from './stores';
import { appointments } from './appointments';
import { tires } from './tires';

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(), // References auth.users(id)
    storeId: uuid('store_id').references(() => stores.id),
    appointmentId: uuid('appointment_id').references(() => appointments.id),
    fulfillmentType: varchar('fulfillment_type', { length: 50 }).notNull(), // 'store_installation', 'direct_shipment', 'in_store_pickup'
    status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'processing', 'succeeded', 'failed', 'refunded'
    subtotalCents: integer('subtotal_cents').notNull(),
    taxCents: integer('tax_cents').notNull(),
    installationFeeCents: integer('installation_fee_cents').default(0).notNull(),
    totalCents: integer('total_cents').notNull(),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 150 }).unique(),
    stripeCustomerId: varchar('stripe_customer_id', { length: 150 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('orders_user_idx').on(table.userId),
    index('orders_stripe_pi_idx').on(table.stripePaymentIntentId),
  ]
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    tireId: uuid('tire_id')
      .notNull()
      .references(() => tires.id),
    quantity: integer('quantity').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    totalPriceCents: integer('total_price_cents').notNull(),
    tireSnapshot: jsonb('tire_snapshot'),
  },
  (table) => [index('order_items_order_idx').on(table.orderId)]
);

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
