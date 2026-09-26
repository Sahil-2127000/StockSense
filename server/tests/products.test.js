import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma, { resetDatabase } from './helpers/db.js';
import { loginAs } from './helpers/auth.js';
import { createCategory, createProduct, createWarehouse } from './helpers/factories.js';

let manager;
let category;
let warehouse;

const base = () => ({ name: 'Steel Rod', sku: 'strd-001', categoryId: category.id, uom: 'KG', unitCost: 85.5 });

beforeEach(async () => {
  await resetDatabase();
  manager = (await loginAs('MANAGER')).agent;
  category = await createCategory('Raw Material');
  warehouse = await createWarehouse({ shortCode: 'WH' });
});

describe('create product', () => {
  it('normalises SKU and UoM and returns numbers, not strings', async () => {
    const res = await manager.post('/api/products').send(base());

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ sku: 'STRD-001', uom: 'kg', unitCost: 85.5, onHand: 0, stockStatus: 'OUT' });
  });

  it.each([
    ['sku', { sku: 'a' }],
    ['unitCost', { unitCost: -1 }],
    ['unitCost', { unitCost: 1.234 }],
    ['categoryId', { categoryId: undefined }],
    ['reorderRule.maxQty', { reorderRule: { minQty: 50, maxQty: 10 } }],
    ['initialStock.quantity', { initialStock: { locationId: 1, quantity: 0 } }],
  ])('rejects invalid %s', async (field, override) => {
    const res = await manager.post('/api/products').send({ ...base(), ...override });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toContain(field);
  });

  it('rejects a duplicate SKU and an unknown category', async () => {
    await createProduct({ sku: 'STRD-001' });

    expect((await manager.post('/api/products').send(base())).status).toBe(409);
    expect((await manager.post('/api/products').send({ ...base(), sku: 'X-1', categoryId: 999 })).status).toBe(400);
  });

  it('books initial stock as a DONE adjustment in the ledger', async () => {
    const location = warehouse.locations[0];

    const res = await manager.post('/api/products').send({
      ...base(),
      reorderRule: { minQty: 50, maxQty: 200 },
      initialStock: { locationId: location.id, quantity: 40 },
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ onHand: 40, free: 40, stockStatus: 'LOW', suggestedReorderQty: 160 });
    expect(res.body.data.stockByLocation).toEqual([
      { location: expect.objectContaining({ fullPath: 'WH/Stock' }), quantity: 40 },
    ]);

    const operation = await prisma.operation.findFirst({ include: { stockMoves: true } });
    expect(operation).toMatchObject({ reference: 'WH/ADJ/0001', type: 'ADJUSTMENT', status: 'DONE' });
    expect(operation.stockMoves).toHaveLength(1);
  });
});

describe('list products', () => {
  const addStock = (productId, quantity) =>
    prisma.stockQuant.create({ data: { productId, locationId: warehouse.locations[0].id, quantity } });

  it('filters by stock status and search', async () => {
    const out = await createProduct({ name: 'Chair' });
    const low = await createProduct({ name: 'Desk', reorderRule: { create: { minQty: 10, maxQty: 50 } } });
    const ok = await createProduct({ name: 'Lamp' });
    await addStock(low.id, 5);
    await addStock(ok.id, 100);

    const status = async (s) => (await manager.get(`/api/products?stockStatus=${s}`)).body.data.map((p) => p.id);

    expect(await status('OUT')).toEqual([out.id]);
    expect(await status('LOW')).toEqual([low.id]);
    expect(await status('OK')).toEqual([ok.id]);
    expect((await manager.get('/api/products?q=des')).body.data.map((p) => p.name)).toEqual(['Desk']);
  });

  it('subtracts stock reserved by READY deliveries from "free"', async () => {
    const product = await createProduct();
    await addStock(product.id, 20);
    const { user } = await loginAs('STAFF');
    const customers = await prisma.location.create({
      data: { name: 'Customers', shortCode: 'Customer', fullPath: 'Customers', type: 'CUSTOMER' },
    });
    await prisma.operation.create({
      data: {
        reference: 'WH/OUT/0001',
        type: 'DELIVERY',
        status: 'READY',
        sourceLocationId: warehouse.locations[0].id,
        destLocationId: customers.id,
        scheduleDate: new Date(),
        responsibleId: user.id,
        lines: { create: [{ productId: product.id, quantity: 8 }] },
      },
    });

    const res = await manager.get(`/api/products/${product.id}`);

    expect(res.body.data).toMatchObject({ onHand: 20, reserved: 8, free: 12 });
  });
});

describe('update, reorder rule and delete', () => {
  it('sets and removes a reorder rule', async () => {
    const product = await createProduct();

    const set = await manager.put(`/api/products/${product.id}/reorder-rule`).send({ minQty: 5, maxQty: 20 });
    const removed = await manager.delete(`/api/products/${product.id}/reorder-rule`);

    expect(set.body.data.reorderRule).toEqual({ minQty: 5, maxQty: 20 });
    expect(removed.body.data.reorderRule).toBeNull();
  });

  it('deletes a product without history but only deactivates one with history', async () => {
    const fresh = await createProduct();
    const created = await manager.post('/api/products').send({
      ...base(),
      initialStock: { locationId: warehouse.locations[0].id, quantity: 1 },
    });

    expect((await manager.delete(`/api/products/${fresh.id}`)).status).toBe(200);
    expect((await manager.delete(`/api/products/${created.body.data.id}`)).status).toBe(409);

    const deactivated = await manager.patch(`/api/products/${created.body.data.id}`).send({ isActive: false });
    expect(deactivated.body.data.isActive).toBe(false);
  });

  it('STAFF cannot change products', async () => {
    const product = await createProduct();
    const { agent } = await loginAs('STAFF');
    expect((await agent.patch(`/api/products/${product.id}`).send({ name: 'Hacked' })).status).toBe(403);
    expect((await request(app).get(`/api/products/${product.id}`)).status).toBe(401);
  });
});
