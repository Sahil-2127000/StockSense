import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { server } from './helpers/server.js';
import prisma, { resetDatabase } from './helpers/db.js';
import { loginAs } from './helpers/auth.js';
import { createCategory, createContact, createProduct, createWarehouse } from './helpers/factories.js';

let staff;
let stock;
let rack;
let rod;
let chair;
let lamp;
let furniture;

const flow = async (body, steps = ['confirm', 'validate']) => {
  const { body: created } = await staff.post('/api/operations').send(body);
  for (const step of steps) await staff.post(`/api/operations/${created.data.id}/${step}`);
  return created.data;
};

// One realistic day of warehouse activity, built through the API
beforeAll(async () => {
  await resetDatabase();
  ({ agent: staff } = await loginAs('STAFF'));
  const warehouse = await createWarehouse({ shortCode: 'WH' });
  stock = warehouse.locations[0];
  rack = await prisma.location.create({
    data: { warehouseId: warehouse.id, name: 'Rack B', shortCode: 'RackB', fullPath: 'WH/RackB', type: 'INTERNAL' },
  });
  const supplier = await createContact('SUPPLIER');
  const customer = await createContact('CUSTOMER');
  const raw = await createCategory('Raw Material');
  furniture = await createCategory('Furniture');

  rod = await createProduct({ name: 'Steel Rod', categoryId: raw.id, unitCost: 85, reorderRule: { create: { minQty: 50, maxQty: 200 } } });
  chair = await createProduct({ name: 'Chair', categoryId: furniture.id, unitCost: 1200, reorderRule: { create: { minQty: 10, maxQty: 40 } } });
  lamp = await createProduct({ name: 'Lamp', categoryId: furniture.id, unitCost: 850, reorderRule: { create: { minQty: 5, maxQty: 20 } } });

  // +100 rod, +10 chair
  await flow({ type: 'RECEIPT', contactId: supplier.id, destLocationId: stock.id, lines: [{ productId: rod.id, quantity: 100 }, { productId: chair.id, quantity: 10 }] });
  // −4 chair
  await flow({ type: 'DELIVERY', contactId: customer.id, sourceLocationId: stock.id, lines: [{ productId: chair.id, quantity: 4 }] });
  // 30 rod Stock → Rack
  await flow({ type: 'TRANSFER', sourceLocationId: stock.id, destLocationId: rack.id, lines: [{ productId: rod.id, quantity: 30 }] });
  // 3 rod damaged on the rack (count 27 instead of 30)
  await staff.post('/api/operations/adjustments').send({ productId: rod.id, locationId: rack.id, countedQuantity: 27, reason: 'Damaged' });
  // Waiting delivery: 20 chairs requested, 6 available
  await flow({ type: 'DELIVERY', contactId: customer.id, sourceLocationId: stock.id, lines: [{ productId: chair.id, quantity: 20 }] }, ['confirm']);
  // Late receipt still open
  const yesterday = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
  await flow({ type: 'RECEIPT', contactId: supplier.id, destLocationId: stock.id, scheduleDate: yesterday, lines: [{ productId: lamp.id, quantity: 20 }] }, ['confirm']);
});

describe('GET /api/stock', () => {
  it('lists on hand, free, value and locations per product', async () => {
    const res = await staff.get('/api/stock');
    const byName = Object.fromEntries(res.body.data.map((row) => [row.product.name, row]));

    expect(byName['Steel Rod']).toMatchObject({ onHand: 97, free: 97, value: 97 * 85, stockStatus: 'OK' });
    expect(byName['Steel Rod'].byLocation.map((l) => [l.location.fullPath, l.quantity])).toEqual([
      ['WH/RackB', 27],
      ['WH/Stock', 70],
    ]);
    expect(byName.Chair).toMatchObject({ onHand: 6, stockStatus: 'LOW' });
    expect(byName.Lamp).toMatchObject({ onHand: 0, stockStatus: 'OUT' });
    expect(res.body.meta).toMatchObject({ totalUnits: 103, totalValue: 97 * 85 + 6 * 1200 });
  });

  it('filters by location, category and in-stock', async () => {
    const names = async (qs) => (await staff.get(`/api/stock?${qs}`)).body.data.map((r) => r.product.name);

    expect(await names(`locationId=${rack.id}`)).toEqual(['Steel Rod']);
    expect(await names(`categoryId=${furniture.id}`)).toEqual(['Chair', 'Lamp']);
    expect(await names('inStock=true')).toEqual(['Chair', 'Steel Rod']);
  });
});

describe('GET /api/moves', () => {
  it('has one row per product per move, newest first, with a direction', async () => {
    const res = await staff.get('/api/moves');

    expect(res.body.meta.total).toBe(5); // receipt ×2 lines, delivery, transfer, adjustment
    expect(res.body.data[0]).toMatchObject({ direction: 'OUT', quantity: 3, operation: { type: 'ADJUSTMENT' } });
  });

  it('filters by direction, product, location and search', async () => {
    const total = async (qs) => (await staff.get(`/api/moves?${qs}`)).body.meta.total;

    expect(await total('direction=IN')).toBe(2);
    expect(await total('direction=OUT')).toBe(2);
    expect(await total('direction=INTERNAL')).toBe(1);
    expect(await total(`productId=${rod.id}`)).toBe(3);
    expect(await total(`locationId=${rack.id}`)).toBe(2);
    expect(await total('q=WH/INT')).toBe(1);
    expect(await total('type=RECEIPT,DELIVERY')).toBe(3);
  });
});

describe('GET /api/dashboard', () => {
  it('returns the KPI cards', async () => {
    const { body } = await staff.get('/api/dashboard');

    expect(body.data.kpis).toEqual({
      totalProductsInStock: 2,
      lowStock: 1,
      outOfStock: 1,
      pendingReceipts: 1,
      pendingDeliveries: 1,
      scheduledTransfers: 0,
      lateReceipts: 1,
      lateDeliveries: 0,
      waitingDeliveries: 1,
    });
    expect(body.data.stockValue).toEqual({ units: 103, value: 97 * 85 + 6 * 1200 });
  });

  it('charts the last 7 days of movement', async () => {
    const { body } = await staff.get('/api/dashboard');
    const today = body.data.movement.at(-1);

    expect(body.data.movement).toHaveLength(7);
    expect(today).toMatchObject({ incoming: 110, outgoing: 7, internal: 30 });
  });

  it('lists what needs attention', async () => {
    const { needsAttention } = (await staff.get('/api/dashboard')).body.data;

    expect(needsAttention.lowStock.map((p) => [p.product.name, p.status, p.suggestedReorderQty])).toEqual([
      ['Lamp', 'OUT', 20],
      ['Chair', 'LOW', 34],
    ]);
    expect(needsAttention.waitingOperations[0].shortages[0]).toMatchObject({ requested: 20, available: 6, missing: 14 });
    expect(needsAttention.lateOperations).toHaveLength(1);
  });

  it('filters by category', async () => {
    const { kpis } = (await staff.get(`/api/dashboard?categoryId=${furniture.id}`)).body.data;
    expect(kpis).toMatchObject({ totalProductsInStock: 1, lowStock: 1, outOfStock: 1 });
  });

  it('shows recent operations', async () => {
    const { recentOperations } = (await staff.get('/api/dashboard')).body.data;
    expect(recentOperations).toHaveLength(6); // 2 receipts, 2 deliveries, 1 transfer, 1 adjustment
  });
});

describe('access', () => {
  it('needs login, and unknown URLs are still 404', async () => {
    expect((await request(server).get('/api/dashboard')).status).toBe(401);
    expect((await request(server).get('/api/stock')).status).toBe(401);
    expect((await request(server).get('/api/nothing-here')).status).toBe(404);
  });
});
