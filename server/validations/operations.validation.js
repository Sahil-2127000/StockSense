import { z } from 'zod';
import {
  countedQuantityField,
  idParam,
  optionalText,
  paginationQuery,
  positiveId,
  quantityField,
} from '../utils/validators.js';

const OPERATION_TYPES = ['RECEIPT', 'DELIVERY', 'TRANSFER'];
const STATUSES = ['DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELLED'];

const optionalId = z.coerce.number().int().positive().optional();

const lines = z
  .array(z.object({ productId: positiveId('Product'), quantity: quantityField }), { error: 'Add at least one product' })
  .min(1, 'Add at least one product')
  .max(100, 'At most 100 products per operation')
  .superRefine((items, ctx) => {
    const seen = new Set();
    items.forEach((line, index) => {
      if (seen.has(line.productId)) {
        ctx.addIssue({ code: 'custom', path: [index, 'productId'], message: 'Product is listed twice' });
      }
      seen.add(line.productId);
    });
  });

const scheduleDate = z.coerce.date({ error: 'Enter a valid schedule date' });

export const createOperationSchema = z.object({
  type: z.enum(OPERATION_TYPES, { error: 'Type must be RECEIPT, DELIVERY or TRANSFER' }),
  contactId: optionalId,
  sourceLocationId: optionalId,
  destLocationId: optionalId,
  scheduleDate: scheduleDate.default(() => new Date()),
  notes: optionalText(500),
  lines,
});

// Only drafts can be edited; the type never changes
export const updateOperationSchema = z
  .object({
    contactId: optionalId,
    sourceLocationId: optionalId,
    destLocationId: optionalId,
    scheduleDate: scheduleDate.optional(),
    notes: optionalText(500),
    lines: lines.optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), 'Nothing to update');

const csv = (values) =>
  z
    .string()
    .transform((s) => s.split(',').map((v) => v.trim().toUpperCase()).filter(Boolean))
    .pipe(z.array(z.enum(values)))
    .optional();

export const listOperationsQuery = paginationQuery.extend({
  type: csv(['RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT']),
  status: csv(STATUSES),
  warehouseId: optionalId,
  locationId: optionalId,
  contactId: optionalId,
  productId: optionalId,
  late: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const summaryQuery = z.object({
  type: csv(['RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT']),
  warehouseId: optionalId,
});

export const adjustmentSchema = z.object({
  productId: positiveId('Product'),
  locationId: positiveId('Location'),
  countedQuantity: countedQuantityField,
  reason: optionalText(200),
});

export { idParam };
