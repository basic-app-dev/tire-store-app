import { pgTable, uuid, varchar, timestamp, text, index } from 'drizzle-orm/pg-core';
import { stores, serviceBays } from './stores';
import { customerVehicles } from './vehicles';

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    bayId: uuid('bay_id').references(() => serviceBays.id),
    userId: uuid('user_id').notNull(), // References auth.users(id)
    vehicleId: uuid('vehicle_id').references(() => customerVehicles.id),
    status: varchar('status', { length: 50 }).notNull().default('pending_payment'), // 'pending_payment', 'confirmed', 'checked_in', 'in_service', 'completed', 'cancelled'
    scheduledStartTime: timestamp('scheduled_start_time', { withTimezone: true }).notNull(),
    scheduledEndTime: timestamp('scheduled_end_time', { withTimezone: true }).notNull(),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    assignedTechnicianId: uuid('assigned_technician_id'), // References auth.users(id)
    customerNotes: text('customer_notes'),
    technicianNotes: text('technician_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('appointments_store_time_idx').on(table.storeId, table.scheduledStartTime),
    index('appointments_bay_time_idx').on(table.bayId, table.scheduledStartTime),
    index('appointments_user_idx').on(table.userId),
  ]
);

export const appointmentServices = pgTable(
  'appointment_services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    serviceType: varchar('service_type', { length: 50 }).notNull(), // 'tire_installation', 'wheel_alignment', etc.
    priceCents: varchar('price_cents', { length: 20 }).notNull().default('0'),
  },
  (table) => [index('appointment_services_appointment_idx').on(table.appointmentId)]
);

export type Appointment = typeof appointments.$inferSelect;
export type AppointmentService = typeof appointmentServices.$inferSelect;
