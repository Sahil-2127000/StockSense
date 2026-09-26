import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma, { resetDatabase } from './helpers/db.js';
import { loginAs } from './helpers/auth.js';
import { createCategory, createContact, createProduct, createWarehouse } from './helpers/factories.js';

let manager;
let staff;

beforeEach(async () => {
  await resetDatabase();
  manager = (await loginAs('MANAGER')).agent;
  staff = (await loginAs('STAFF')).agent;
});

describe('permissions', () => {
  it.each(['/api/warehouses', '/api/locations', '/api/categories', '/api/contacts', '/api/products'])(
    '%s needs login, is readable by STAFF and writable only by MANAGER',
    async (url) => {
      expect((await request(app).get(url)).status).toBe(401);
      expect((await staff.get(url)).status).toBe(200);
      expect((await staff.post(url).send({})).status).toBe(403);
    }
  );
});

describe('warehouses', () => {
  it('creates a warehouse with its default Stock location', async () => {
    const res = await manager.post('/api/warehouses').send({ name: 'Branch Office', shortCode: 'br1' });

    expect(res.status).toBe(201);
    expect(res.body.data.shortCode).toBe('BR1');
    expect(res.body.data.locations.map((l) => l.fullPath)).toEqual(['BR1/Stock']);
  });

  it('rejects a duplicate or invalid short code', async () => {
    await createWarehouse({ shortCode: 'WH' });

    const dup = await manager.post('/api/warehouses').send({ name: 'Other', shortCode: 'wh' });
    const bad = await manager.post('/api/warehouses').send({ name: 'Other', shortCode: 'TOOLONG' });

    expect(dup.status).toBe(409);
    expect(bad.status).toBe(400);
    expect(bad.body.errors[0].field).toBe('shortCode');
  });

  it('renames location paths when the short code changes', async () => {
    const wh = await createWarehouse({ shortCode: 'OLD' });

    const res = await manager.patch(`/api/warehouses/${wh.id}`).send({ shortCode: 'NEW' });

    expect(res.status).toBe(200);
    expect(res.body.data.locations[0].fullPath).toBe('NEW/Stock');
  });

  it('cannot be deleted while it holds stock', async () => {
    const wh = await createWarehouse();
    const product = await createProduct();
    await prisma.stockQuant.create({ data: { productId: product.id, locationId: wh.locations[0].id, quantity: 5 } });

    const res = await manager.delete(`/api/warehouses/${wh.id}`);

    expect(res.status).toBe(409);
  });

  it('can be deleted when empty', async () => {
    const wh = await createWarehouse();
    expect((await manager.delete(`/api/warehouses/${wh.id}`)).status).toBe(200);
    expect(await prisma.location.count({ where: { warehouseId: wh.id } })).toBe(0);
  });
});

describe('locations', () => {
  it('builds the full path on the server and rejects duplicates', async () => {
    const wh = await createWarehouse({ shortCode: 'WH' });

    const first = await manager.post('/api/locations').send({ warehouseId: wh.id, name: 'Rack A', shortCode: 'RackA' });
    const dup = await manager.post('/api/locations').send({ warehouseId: wh.id, name: 'Rack A2', shortCode: 'RackA' });

    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ fullPath: 'WH/RackA', type: 'INTERNAL' });
    expect(dup.status).toBe(409);
  });

  it('filters by warehouse and shows stock on the detail page', async () => {
    const wh = await createWarehouse();
    await createWarehouse();
    const product = await createProduct();
    await prisma.stockQuant.create({ data: { productId: product.id, locationId: wh.locations[0].id, quantity: 7.5 } });

    const list = await staff.get(`/api/locations?warehouseId=${wh.id}`);
    const detail = await staff.get(`/api/locations/${wh.locations[0].id}`);

    expect(list.body.meta.total).toBe(1);
    expect(detail.body.data.stock).toEqual([{ product: expect.objectContaining({ id: product.id }), quantity: 7.5 }]);
  });

  it('never deletes system locations', async () => {
    const vendor = await prisma.location.create({
      data: { name: 'Vendors', shortCode: 'Vendor', fullPath: 'Vendors', type: 'VENDOR' },
    });
    expect((await manager.delete(`/api/locations/${vendor.id}`)).status).toBe(409);
  });

  it('returns 400 for a bad id and 404 for an unknown one', async () => {
    expect((await staff.get('/api/locations/abc')).status).toBe(400);
    expect((await staff.get('/api/locations/9999')).status).toBe(404);
  });
});

describe('categories', () => {
  it('rejects duplicate names regardless of case', async () => {
    await createCategory('Furniture');
    const res = await manager.post('/api/categories').send({ name: 'furniture' });
    expect(res.status).toBe(409);
  });

  it('cannot delete a category that has products', async () => {
    const category = await createCategory();
    await createProduct({ categoryId: category.id });

    const res = await manager.delete(`/api/categories/${category.id}`);

    expect(res.status).toBe(409);
  });
});

describe('contacts', () => {
  it('validates email and phone, and filters by type', async () => {
    const bad = await manager.post('/api/contacts').send({ name: 'Tata Steel', type: 'SUPPLIER', email: 'nope' });
    const ok = await manager.post('/api/contacts').send({ name: 'Tata Steel', type: 'SUPPLIER', phone: '+91-98100-11223' });
    await createContact('CUSTOMER');

    const suppliers = await staff.get('/api/contacts?type=SUPPLIER');

    expect(bad.status).toBe(400);
    expect(ok.status).toBe(201);
    expect(suppliers.body.meta.total).toBe(1);
  });
});
