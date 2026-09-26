import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { server } from './helpers/server.js';
import prisma, { resetDatabase } from './helpers/db.js';
import { loginAs } from './helpers/auth.js';
import { createContact, createProduct, createWarehouse } from './helpers/factories.js';

let staff;
let user;
let stock;
let rack;
let supplier;
let customer;
let rod;
let chair;

const onHand = async (productId, locationId) =>
  Number((await prisma.stockQuant.findUnique({ where: { productId_locationId: { productId, locationId } } }))?.quantity ?? 0);

const receipt = (lines, extra = {}) =>
  staff.post('/api/operations').send({ type: 'RECEIPT', contactId: supplier.id, destLocationId: stock.id, lines, ...extra });

const delivery = (lines, extra = {}) =>
  staff.post('/api/operations').send({ type: 'DELIVERY', contactId: customer.id, sourceLocationId: stock.id, lines, ...extra });

const act = (id, action) => staff.post(`/api/operations/${id}/${action}`);

// Creates a DONE receipt so the location holds stock
const receive = async (product, quantity) => {
  const { body } = await receipt([{ productId: product.id, quantity }]);
  await act(body.data.id, 'confirm');
  await act(body.data.id, 'validate');
};

beforeEach(async () => {
  await resetDatabase();
  ({ agent: staff, user } = await loginAs('STAFF'));
  const warehouse = await createWarehouse({ shortCode: 'WH' });
  stock = warehouse.locations[0];
  rack = await prisma.location.create({
    data: { warehouseId: warehouse.id, name: 'Rack B', shortCode: 'RackB', fullPath: 'WH/RackB', type: 'INTERNAL' },
  });
  supplier = await createContact('SUPPLIER');
  customer = await createContact('CUSTOMER');
  rod = await createProduct({ name: 'Steel Rod' });
  chair = await createProduct({ name: 'Chair' });
});

describe('receipts', () => {
  it('Draft → Ready → Done adds stock and logs the move', async () => {
    const created = await receipt([{ productId: rod.id, quantity: 50 }]);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      reference: 'WH/IN/0001',
      status: 'DRAFT',
      responsible: { id: user.id },
      sourceLocation: { type: 'VENDOR' },
    });

    const ready = await act(created.body.data.id, 'confirm');
    expect(ready.body.data.status).toBe('READY');
    expect(await onHand(rod.id, stock.id)).toBe(0); // nothing moves before validation

    const done = await act(created.body.data.id, 'validate');
    expect(done.body.data.status).toBe('DONE');
    expect(done.body.data.doneAt).toBeTruthy();
    expect(done.body.data.stockMoves).toHaveLength(1);
    expect(await onHand(rod.id, stock.id)).toBe(50);
  });

  it('needs a supplier and a warehouse location', async () => {
    const withCustomer = await receipt([{ productId: rod.id, quantity: 1 }], { contactId: customer.id });
    const noLocation = await receipt([{ productId: rod.id, quantity: 1 }], { destLocationId: undefined });

    expect(withCustomer.status).toBe(400);
    expect(withCustomer.body.errors[0].field).toBe('contactId');
    expect(noLocation.body.errors[0].field).toBe('destLocationId');
  });

  it('rejects empty, duplicated or invalid lines', async () => {
    const empty = await receipt([]);
    const twice = await receipt([{ productId: rod.id, quantity: 1 }, { productId: rod.id, quantity: 2 }]);
    const negative = await receipt([{ productId: rod.id, quantity: -5 }]);
    const unknown = await receipt([{ productId: 9999, quantity: 1 }]);

    expect(empty.status).toBe(400);
    expect(twice.body.errors[0].field).toBe('lines.1.productId');
    expect(negative.body.errors[0].field).toBe('lines.0.quantity');
    expect(unknown.body.errors[0].field).toBe('lines.0.productId');
  });

  it('numbers references per warehouse and type', async () => {
    const refs = [];
    refs.push((await receipt([{ productId: rod.id, quantity: 1 }])).body.data.reference);
    refs.push((await receipt([{ productId: rod.id, quantity: 1 }])).body.data.reference);
    refs.push((await delivery([{ productId: rod.id, quantity: 1 }])).body.data.reference);

    expect(refs).toEqual(['WH/IN/0001', 'WH/IN/0002', 'WH/OUT/0001']);
  });
});

describe('deliveries', () => {
  it('waits when short on stock and becomes ready once stock arrives', async () => {
    await receive(chair, 3);
    const { body } = await delivery([{ productId: chair.id, quantity: 12 }]);

    const waiting = await act(body.data.id, 'confirm');
    expect(waiting.body.data.status).toBe('WAITING');
    expect(waiting.body.data.availability[0]).toMatchObject({ requested: 12, available: 3, enough: false });
    expect((await act(body.data.id, 'validate')).status).toBe(409);

    await receive(chair, 15);
    const ready = await act(body.data.id, 'check-availability');
    expect(ready.body.data.status).toBe('READY');

    const done = await act(body.data.id, 'validate');
    expect(done.body.data.status).toBe('DONE');
    expect(await onHand(chair.id, stock.id)).toBe(6);
  });

  it('stock reserved by a READY delivery is not offered to the next one', async () => {
    await receive(chair, 10);
    const first = (await delivery([{ productId: chair.id, quantity: 8 }])).body.data;
    const second = (await delivery([{ productId: chair.id, quantity: 8 }])).body.data;

    expect((await act(first.id, 'confirm')).body.data.status).toBe('READY');
    const secondConfirm = await act(second.id, 'confirm');
    expect(secondConfirm.body.data.status).toBe('WAITING');
    expect(secondConfirm.body.data.availability[0].available).toBe(2);
  });

  it('returns the customer address for the delivery form', async () => {
    await prisma.contact.update({ where: { id: customer.id }, data: { address: 'SCO 41, Sector 17-C, Chandigarh', phone: '+91-98200-33445' } });
    const { body } = await delivery([{ productId: chair.id, quantity: 1 }]);

    const detail = await staff.get(`/api/operations/${body.data.id}`);

    expect(detail.body.data.contact).toMatchObject({
      name: customer.name,
      type: 'CUSTOMER',
      address: 'SCO 41, Sector 17-C, Chandigarh',
      phone: '+91-98200-33445',
    });
  });

  it('needs a customer', async () => {
    const res = await delivery([{ productId: chair.id, quantity: 1 }], { contactId: supplier.id });
    expect(res.body.errors[0].field).toBe('contactId');
  });
});

describe('internal transfers', () => {
  it('moves stock between locations without changing the total', async () => {
    await receive(rod, 100);
    const { body } = await staff.post('/api/operations').send({
      type: 'TRANSFER',
      sourceLocationId: stock.id,
      destLocationId: rack.id,
      lines: [{ productId: rod.id, quantity: 30 }],
    });
    expect(body.data.reference).toBe('WH/INT/0001');

    await act(body.data.id, 'confirm');
    await act(body.data.id, 'validate');

    expect(await onHand(rod.id, stock.id)).toBe(70);
    expect(await onHand(rod.id, rack.id)).toBe(30);
  });

  it('rejects the same source and destination', async () => {
    const res = await staff.post('/api/operations').send({
      type: 'TRANSFER',
      sourceLocationId: stock.id,
      destLocationId: stock.id,
      lines: [{ productId: rod.id, quantity: 1 }],
    });
    expect(res.body.errors[0].field).toBe('destLocationId');
  });
});

describe('stock adjustments', () => {
  const adjust = (countedQuantity) =>
    staff.post('/api/operations/adjustments').send({ productId: rod.id, locationId: stock.id, countedQuantity, reason: 'Count' });

  it('books a loss when the count is lower (e.g. 3 kg damaged)', async () => {
    await receive(rod, 50);

    const res = await adjust(47);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ type: 'ADJUSTMENT', status: 'DONE', reference: 'WH/ADJ/0001' });
    expect(res.body.data.lines[0].quantity).toBe(3);
    expect(res.body.data.destLocation.type).toBe('ADJUSTMENT');
    expect(await onHand(rod.id, stock.id)).toBe(47);
  });

  it('books a gain when the count is higher, and rejects "no difference"', async () => {
    await receive(rod, 10);

    const gain = await adjust(12.5);
    const same = await adjust(12.5);

    expect(gain.body.data.sourceLocation.type).toBe('ADJUSTMENT');
    expect(await onHand(rod.id, stock.id)).toBe(12.5);
    expect(same.status).toBe(400);
    expect(same.body.errors[0].field).toBe('countedQuantity');
  });
});

describe('status rules', () => {
  it('only drafts can be edited or deleted; done operations cannot be cancelled', async () => {
    const draft = (await receipt([{ productId: rod.id, quantity: 5 }])).body.data;
    const edited = await staff.patch(`/api/operations/${draft.id}`).send({ lines: [{ productId: chair.id, quantity: 9 }] });
    expect(edited.body.data.lines).toEqual([expect.objectContaining({ productId: chair.id, quantity: 9 })]);

    await act(draft.id, 'confirm');
    expect((await staff.patch(`/api/operations/${draft.id}`).send({ notes: 'late edit' })).status).toBe(409);
    expect((await staff.delete(`/api/operations/${draft.id}`)).status).toBe(409);

    await act(draft.id, 'validate');
    expect((await act(draft.id, 'cancel')).status).toBe(409);
    expect((await act(draft.id, 'confirm')).status).toBe(409);
  });

  it('cancels open operations and deletes drafts', async () => {
    const ready = (await receipt([{ productId: rod.id, quantity: 5 }])).body.data;
    const draft = (await receipt([{ productId: rod.id, quantity: 5 }])).body.data;
    await act(ready.id, 'confirm');

    expect((await act(ready.id, 'cancel')).body.data.status).toBe('CANCELLED');
    expect((await act(ready.id, 'validate')).status).toBe(409);
    expect((await staff.delete(`/api/operations/${draft.id}`)).status).toBe(200);
    expect(await prisma.operation.count({ where: { id: draft.id } })).toBe(0);
  });

  it('cannot validate a draft', async () => {
    const draft = (await receipt([{ productId: rod.id, quantity: 5 }])).body.data;
    expect((await act(draft.id, 'validate')).status).toBe(409);
  });
});

describe('concurrency', () => {
  it('validating the same operation twice at once moves stock only once', async () => {
    const { body } = await receipt([{ productId: rod.id, quantity: 50 }]);
    await act(body.data.id, 'confirm');

    const results = await Promise.all([act(body.data.id, 'validate'), act(body.data.id, 'validate')]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await onHand(rod.id, stock.id)).toBe(50);
    expect(await prisma.stockMove.count()).toBe(1);
  });

  it('two deliveries racing for the same stock never make it negative', async () => {
    await receive(chair, 10);
    const a = (await delivery([{ productId: chair.id, quantity: 8 }])).body.data;
    const b = (await delivery([{ productId: chair.id, quantity: 8 }])).body.data;
    // Force both READY, as if both were confirmed before the other reserved the stock
    await prisma.operation.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { status: 'READY' } });

    const results = await Promise.all([act(a.id, 'validate'), act(b.id, 'validate')]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(results.find((r) => r.status === 409).body.message).toBe('Not enough stock');
    expect(await onHand(chair.id, stock.id)).toBe(2);
    // The losing delivery was rolled back: still READY, no ledger row
    expect(await prisma.operation.count({ where: { status: 'READY' } })).toBe(1);
  });
});

describe('list and summary', () => {
  it('filters by type, status, search and late', async () => {
    const past = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
    const late = (await receipt([{ productId: rod.id, quantity: 1 }], { scheduleDate: past })).body.data;
    await act(late.id, 'confirm');
    await delivery([{ productId: rod.id, quantity: 1 }]);

    const refs = async (qs) => (await staff.get(`/api/operations?${qs}`)).body.data.map((o) => o.reference);

    expect(await refs('type=RECEIPT')).toEqual(['WH/IN/0001']);
    expect(await refs('status=draft,waiting')).toEqual(['WH/OUT/0001']);
    expect(await refs('late=true')).toEqual(['WH/IN/0001']);
    expect(await refs('q=OUT')).toEqual(['WH/OUT/0001']);
    expect((await staff.get(`/api/operations/${late.id}`)).body.data.isLate).toBe(true);
  });

  it('summarises counts per status', async () => {
    await receipt([{ productId: rod.id, quantity: 1 }]);
    const ready = (await receipt([{ productId: rod.id, quantity: 1 }])).body.data;
    await act(ready.id, 'confirm');

    const res = await staff.get('/api/operations/summary?type=RECEIPT');

    expect(res.body.data).toMatchObject({ DRAFT: 1, READY: 1, DONE: 0, late: 0, total: 2 });
  });

  it('requires login', async () => {
    expect((await request(server).get('/api/operations')).status).toBe(401);
  });
});
