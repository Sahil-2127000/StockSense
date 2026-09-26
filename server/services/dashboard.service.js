import { Prisma } from '@prisma/client';
import prisma from '../config/db.js';
import { availabilityFor } from './operations.service.js';
import { getStockSummary, productIdsByStatus, stockValue } from './stock.summary.js';

const OPEN = ['DRAFT', 'WAITING', 'READY'];
const DAYS = 7;

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

// YYYY-MM-DD in the server's local time zone (the warehouse's day, not UTC)
const localDay = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Operations touching the selected warehouse and/or location (either side of the move)
const inScope = ({ warehouseId, locationId }) => ({
  AND: [
    warehouseId ? { OR: [{ sourceLocation: { warehouseId } }, { destLocation: { warehouseId } }] } : {},
    locationId ? { OR: [{ sourceLocationId: locationId }, { destLocationId: locationId }] } : {},
  ],
});

const countOps = (type, scope, extra = {}) =>
  prisma.operation.count({ where: { AND: [{ type, status: { in: OPEN }, ...extra }, inScope(scope)] } });

// The five KPI cards from the problem statement (+ late counts for the badges)
const kpis = async ({ warehouseId, locationId, categoryId }) => {
  const filter = { warehouseId, locationId, categoryId, activeOnly: true };
  const scope = { warehouseId, locationId };
  const late = { scheduleDate: { lt: startOfToday() } };

  const [inStock, low, out, receipts, deliveries, transfers, lateReceipts, lateDeliveries, waitingDeliveries] =
    await Promise.all([
      productIdsByStatus('IN_STOCK', filter),
      productIdsByStatus('LOW', filter),
      productIdsByStatus('OUT', filter),
      countOps('RECEIPT', scope),
      countOps('DELIVERY', scope),
      countOps('TRANSFER', scope),
      countOps('RECEIPT', scope, late),
      countOps('DELIVERY', scope, late),
      countOps('DELIVERY', scope, { status: 'WAITING' }),
    ]);

  return {
    totalProductsInStock: inStock.length,
    lowStock: low.length,
    outOfStock: out.length,
    pendingReceipts: receipts,
    pendingDeliveries: deliveries,
    scheduledTransfers: transfers,
    lateReceipts,
    lateDeliveries,
    waitingDeliveries,
  };
};

// Units moved in / out / between locations per day for the last 7 days.
// Timestamps are stored in UTC, so they are shifted to the server's local time before grouping by day.
const movement = async ({ warehouseId, locationId, categoryId }) => {
  const since = startOfToday();
  since.setDate(since.getDate() - (DAYS - 1));
  const offsetMinutes = -new Date().getTimezoneOffset();

  const rows = await prisma.$queryRaw`
    SELECT DATE_FORMAT(DATE_ADD(sm.createdAt, INTERVAL ${offsetMinutes} MINUTE), '%Y-%m-%d') AS day,
      SUM(CASE WHEN tl.type = 'INTERNAL' AND fl.type <> 'INTERNAL' THEN sm.quantity ELSE 0 END) AS incoming,
      SUM(CASE WHEN fl.type = 'INTERNAL' AND tl.type <> 'INTERNAL' THEN sm.quantity ELSE 0 END) AS outgoing,
      SUM(CASE WHEN fl.type = 'INTERNAL' AND tl.type = 'INTERNAL' THEN sm.quantity ELSE 0 END) AS internal
    FROM stock_moves sm
    JOIN locations fl ON fl.id = sm.fromLocationId
    JOIN locations tl ON tl.id = sm.toLocationId
    JOIN products p ON p.id = sm.productId
    WHERE sm.createdAt >= ${since}
      ${warehouseId ? Prisma.sql`AND (fl.warehouseId = ${warehouseId} OR tl.warehouseId = ${warehouseId})` : Prisma.empty}
      ${locationId ? Prisma.sql`AND (fl.id = ${locationId} OR tl.id = ${locationId})` : Prisma.empty}
      ${categoryId ? Prisma.sql`AND p.categoryId = ${categoryId}` : Prisma.empty}
    GROUP BY day`;

  const byDay = new Map(rows.map((r) => [r.day, r]));
  return Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    const day = localDay(date);
    const row = byDay.get(day);
    return {
      day,
      incoming: new Prisma.Decimal(row?.incoming ?? 0),
      outgoing: new Prisma.Decimal(row?.outgoing ?? 0),
      internal: new Prisma.Decimal(row?.internal ?? 0),
    };
  });
};

// "Needs attention": low / out of stock products, waiting deliveries with their shortage, late operations
const attention = async ({ warehouseId, locationId, categoryId }) => {
  const filter = { warehouseId, locationId, categoryId, activeOnly: true };
  const scope = { warehouseId, locationId };
  const [lowIds, outIds] = await Promise.all([productIdsByStatus('LOW', filter), productIdsByStatus('OUT', filter)]);
  const ids = [...outIds, ...lowIds];

  const [products, summary, waiting, late] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, sku: true, uom: true, reorderRule: { select: { minQty: true, maxQty: true } } },
    }),
    getStockSummary(ids, scope),
    prisma.operation.findMany({
      where: { AND: [{ type: { in: ['DELIVERY', 'TRANSFER'] }, status: 'WAITING' }, inScope(scope)] },
      include: { contact: { select: { name: true } }, lines: { include: { product: { select: { id: true, name: true, uom: true } } } } },
      orderBy: { scheduleDate: 'asc' },
      take: 5,
    }),
    prisma.operation.findMany({
      where: { AND: [{ status: { in: OPEN }, scheduleDate: { lt: startOfToday() } }, inScope(scope)] },
      select: { id: true, reference: true, type: true, status: true, scheduleDate: true, contact: { select: { name: true } } },
      orderBy: { scheduleDate: 'asc' },
      take: 5,
    }),
  ]);

  const lowStock = products
    .map((p) => {
      const { onHand } = summary.get(p.id);
      const max = p.reorderRule?.maxQty ?? 0;
      return {
        product: { id: p.id, name: p.name, sku: p.sku, uom: p.uom },
        onHand,
        minQty: p.reorderRule?.minQty ?? null,
        status: onHand.lte(0) ? 'OUT' : 'LOW',
        suggestedReorderQty: Prisma.Decimal.max(new Prisma.Decimal(max).minus(onHand), 0),
      };
    })
    .sort((a, b) => (a.status === b.status ? a.product.name.localeCompare(b.product.name) : a.status === 'OUT' ? -1 : 1));

  const waitingOperations = await Promise.all(
    waiting.map(async (operation) => {
      const availability = await availabilityFor(prisma, operation);
      const products = Object.fromEntries(operation.lines.map((l) => [l.productId, l.product]));
      return {
        id: operation.id,
        reference: operation.reference,
        type: operation.type,
        contact: operation.contact,
        scheduleDate: operation.scheduleDate,
        shortages: availability
          .filter((a) => !a.enough)
          .map((a) => ({ product: products[a.productId], requested: a.requested, available: a.available, missing: new Prisma.Decimal(a.requested).minus(a.available) })),
      };
    })
  );

  return { lowStock, waitingOperations, lateOperations: late };
};

const recentOperations = ({ warehouseId, locationId }) =>
  prisma.operation.findMany({
    where: inScope({ warehouseId, locationId }),
    select: {
      id: true,
      reference: true,
      type: true,
      status: true,
      scheduleDate: true,
      updatedAt: true,
      contact: { select: { name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 8,
  });

// Everything the dashboard needs in one call; filters: warehouseId, locationId, categoryId
export const getDashboard = async (filters) => {
  const [cards, value, chart, needsAttention, recent] = await Promise.all([
    kpis(filters),
    stockValue(filters),
    movement(filters),
    attention(filters),
    recentOperations(filters),
  ]);
  return {
    kpis: cards,
    stockValue: value,
    movement: chart,
    needsAttention,
    recentOperations: recent,
    generatedAt: new Date(),
  };
};
