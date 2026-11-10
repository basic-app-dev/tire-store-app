import { z } from 'zod';
import { CreateAppointmentSchema } from './appointments';

export const OrderFulfillmentTypeSchema = z.enum([
  'store_installation',
  'direct_shipment',
  'in_store_pickup',
]);
export type OrderFulfillmentType = z.infer<typeof OrderFulfillmentTypeSchema>;

export const OrderPaymentStatusSchema = z.enum([
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded',
]);
export type OrderPaymentStatus = z.infer<typeof OrderPaymentStatusSchema>;

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  tireId: z.string().uuid(),
  quantity: z.number().int().min(1).max(12),
  unitPriceCents: z.number().int().nonnegative(),
  totalPriceCents: z.number().int().nonnegative(),
  tireSnapshot: z.record(z.unknown()).optional(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  fulfillmentType: OrderFulfillmentTypeSchema,
  status: OrderPaymentStatusSchema,
  subtotalCents: z.number().int().nonnegative(),
  taxCents: z.number().int().nonnegative(),
  installationFeeCents: z.number().int().nonnegative().default(0),
  totalCents: z.number().int().nonnegative(),
  stripePaymentIntentId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  items: z.array(OrderItemSchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Order = z.infer<typeof OrderSchema>;

export const AtomicCheckoutInputSchema = z.object({
  items: z
    .array(
      z.object({
        tireId: z.string().uuid(),
        quantity: z.number().int().min(1).max(12),
      })
    )
    .min(1),
  fulfillmentType: OrderFulfillmentTypeSchema,
  storeId: z.string().uuid().optional(),
  appointment: CreateAppointmentSchema.optional(),
  saveVehicleToGarage: z.boolean().default(false),
  vehicleDetails: z
    .object({
      year: z.number().int(),
      make: z.string(),
      model: z.string(),
      trim: z.string().optional(),
      vin: z.string().optional(),
    })
    .optional(),
});
export type AtomicCheckoutInput = z.infer<typeof AtomicCheckoutInputSchema>;
