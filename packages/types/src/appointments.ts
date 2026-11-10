import { z } from 'zod';

export const ServiceTypeSchema = z.enum([
  'tire_installation',
  'wheel_alignment',
  'wheel_balancing',
  'tire_rotation',
  'seasonal_changeover',
  'flat_repair',
  'inspection',
]);
export type ServiceType = z.infer<typeof ServiceTypeSchema>;

export const AppointmentStatusSchema = z.enum([
  'pending_payment',
  'confirmed',
  'checked_in',
  'in_service',
  'completed',
  'cancelled',
  'no_show',
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  bayId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  vehicleId: z.string().uuid().optional(),
  services: z.array(ServiceTypeSchema).min(1),
  status: AppointmentStatusSchema,
  scheduledStartTime: z.string().datetime(),
  scheduledEndTime: z.string().datetime(),
  checkedInAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  assignedTechnicianId: z.string().uuid().optional(),
  customerNotes: z.string().max(500).optional(),
  technicianNotes: z.string().max(2000).optional(),
  tireOrderId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Appointment = z.infer<typeof AppointmentSchema>;

export const CreateAppointmentSchema = z.object({
  storeId: z.string().uuid(),
  bayId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  services: z.array(ServiceTypeSchema).min(1),
  scheduledStartTime: z.string().datetime(),
  scheduledEndTime: z.string().datetime(),
  customerNotes: z.string().max(500).optional(),
});
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

export const AvailableSlotSchema = z.object({
  storeId: z.string().uuid(),
  bayId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  durationMinutes: z.number().int().positive(),
});
export type AvailableSlot = z.infer<typeof AvailableSlotSchema>;
