import { z } from 'zod';
import {
  countedQuantityField,
  idParam,
  moneyField,
  paginationQuery,
  positiveId,
  quantityField,
} from '../../utils/validators.js';

const fields = {
  name: z.string({ error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(80),
  sku: z
    .string({ error: 'SKU is required' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,20}$/, 'SKU must be 3–20 letters, digits or dashes'),
  categoryId: positiveId('Category'),
  uom: z
    .string({ error: 'Unit of measure is required' })
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{1,10}$/, 'Unit of measure must be 1–10 letters (e.g. pcs, kg)'),
  unitCost: moneyField,
};

export const reorderRuleSchema = z
  .object({ minQty: countedQuantityField, maxQty: countedQuantityField })
  .refine((r) => r.maxQty >= r.minQty, { message: 'Max quantity must be at least the min quantity', path: ['maxQty'] });

export const createProductSchema = z.object({
  ...fields,
  unitCost: moneyField.default(0),
  reorderRule: reorderRuleSchema.optional(),
  initialStock: z.object({ locationId: positiveId('Location'), quantity: quantityField }).optional(),
});

export const updateProductSchema = z
  .object({
    name: fields.name.optional(),
    sku: fields.sku.optional(),
    categoryId: fields.categoryId.optional(),
    uom: fields.uom.optional(),
    unitCost: fields.unitCost.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), 'Nothing to update');

export const listProductsQuery = paginationQuery.extend({
  categoryId: z.coerce.number().int().positive().optional(),
  warehouseId: z.coerce.number().int().positive().optional(),
  stockStatus: z.enum(['OK', 'LOW', 'OUT']).optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

export { idParam };
