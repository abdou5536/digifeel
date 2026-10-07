import { z } from 'zod';

export const chipIdSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

export const scanSchema = z.object({ chipId: chipIdSchema, deviceId: z.unknown().optional() });

// Un avis est toujours acceptÃƒÆ’Ã‚Â© 1 ÃƒÆ’Ã‚Â  5 ÃƒÆ’Ã‚Â©toiles : aucun filtrage selon la note.
export const reviewSchema = z.object({
  chipId: chipIdSchema,
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).default(''),
  serverId: z.union([uuid, z.literal(''), z.null()]).optional().transform(v => (v ? v : null)),
  tipAmountMinor: z.number().int().min(0).max(1_000_000).default(0),
  deviceId: z.unknown().optional()
});

export const posSaleSchema = z.object({
  id: uuid,
  paymentMethod: z.enum(['cash', 'card', 'baridimob']),
  paymentReference: z.string().max(120).optional(),
  items: z.array(z.object({ productId: uuid, quantity: z.number().int().min(1).max(100) })).min(1).max(200)
});

export const posSaleIdSchema = uuid;
export const voidPosSaleSchema = z.object({ reason: z.string().trim().max(300).optional() });

export const paymentRequestSchema = z.object({
  billId: uuid,
  amountDzd: z.number().int().positive().max(100_000_000),
  tipDzd: z.number().int().min(0).max(100_000_000).default(0),
  method: z.enum(['cash', 'card', 'baridimob', 'stripe']),
  idempotencyKey: z.string().min(8).max(120)
});
export const openBillSchema = z.object({ table: z.string().trim().min(1).max(40) });
export const addBillItemSchema = z.object({ productId: uuid, quantity: z.number().int().min(1).max(100) });
export const billIdSchema = uuid;

export const tableCodeSchema = z.string().regex(/^[a-z2-7]{16}$/);
export const guestTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const guestOrderSchema = z.object({
  token: guestTokenSchema,
  items: z.array(z.object({
    productId: uuid,
    quantity: z.number().int().min(1).max(20)
  }).strict()).min(1).max(20),
  note: z.string().trim().max(300).default(''),
  idempotencyKey: z.string().min(8).max(120)
}).strict().refine(
  order => new Set(order.items.map(item => item.productId)).size === order.items.length,
  { message: 'Un produit ne peut apparaître qu’une seule fois.', path: ['items'] }
);
export const guestPaymentRequestSchema = z.object({
  token: guestTokenSchema,
  amountDzd: z.number().int().positive().max(100_000_000),
  tipDzd: z.number().int().min(0).max(100_000_000).default(0),
  method: z.enum(['cash', 'baridimob']),
  idempotencyKey: z.string().min(8).max(120)
});
export const guestReviewSchema = z.object({
  token: guestTokenSchema,
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).default(''),
  serverId: z.union([uuid, z.literal(''), z.null()]).optional().transform(v => (v ? v : null))
});
export const paymentIdSchema = uuid;
export const diningTableLabelSchema = z.string().trim().min(1).max(40);
export const diningTableUpdateSchema = z.object({ active: z.boolean() });
export const kitchenStatusSchema = z.enum(['preparing', 'ready', 'served']);
