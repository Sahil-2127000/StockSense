import prisma from '../config/db.js';
import { emit, isSocketEnabled } from '../utils/socket.js';
import { getStockSummary, stockStatus } from './stock.summary.js';

/*
 * Real-time notifications, sent after a change is committed.
 *   operation:updated  { id, reference, type, status }   → refresh lists / kanban / detail
 *   stock:changed      { productIds }                     → refresh stock views
 *   stock:low          { product, onHand, minQty, status } → low / out of stock alert
 *   dashboard:refresh  {}                                 → re-fetch GET /api/dashboard
 * Failures here never break the request that caused them.
 */

export const operationChanged = (operation) => {
  emit('operation:updated', {
    id: operation.id,
    reference: operation.reference,
    type: operation.type,
    status: operation.status,
  });
  emit('dashboard:refresh', {});
};

const lowStockAlerts = async (productIds) => {
  const [products, summary] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: { id: true, name: true, sku: true, uom: true, reorderRule: { select: { minQty: true } } },
    }),
    getStockSummary(productIds),
  ]);

  for (const product of products) {
    const { onHand } = summary.get(product.id);
    const status = stockStatus(onHand, product.reorderRule?.minQty);
    if (status !== 'OK') {
      const { reorderRule, ...info } = product;
      emit('stock:low', { product: info, onHand: onHand.toNumber(), minQty: reorderRule?.minQty?.toNumber() ?? null, status });
    }
  }
};

export const stockChanged = async (productIds) => {
  if (!isSocketEnabled() || !productIds.length) return;
  emit('stock:changed', { productIds });
  emit('dashboard:refresh', {});
  try {
    await lowStockAlerts(productIds);
  } catch (error) {
    console.error('Could not send low stock alerts:', error.message);
  }
};
