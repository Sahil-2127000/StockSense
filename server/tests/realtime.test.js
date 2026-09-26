import http from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { io as connect } from 'socket.io-client';
import request from 'supertest';
import app from '../app.js';
import prisma, { resetDatabase } from './helpers/db.js';
import { createUser, TEST_PASSWORD } from './helpers/auth.js';
import { createContact, createProduct, createWarehouse } from './helpers/factories.js';
import { closeSocket, initSocket } from '../utils/socket.js';

// This file runs its own server with Socket.IO attached
const server = http.createServer(app);
let url;
let cookie;
let agent;
const sockets = [];

const open = (options) =>
  new Promise((resolve, reject) => {
    const socket = connect(url, { transports: ['websocket'], reconnection: false, ...options });
    sockets.push(socket);
    socket.on('connected', () => resolve(socket));
    socket.on('connect_error', reject);
  });

const nextEvent = (socket, event) => new Promise((resolve) => socket.once(event, resolve));

beforeAll(async () => {
  initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://localhost:${server.address().port}`;
});

afterAll(async () => {
  sockets.forEach((s) => s.close());
  await closeSocket();
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(async () => {
  await resetDatabase();
  const user = await createUser({ role: 'STAFF' });
  agent = request.agent(server);
  const login = await agent.post('/api/auth/login').send({ loginId: user.loginId, password: TEST_PASSWORD });
  cookie = login.headers['set-cookie'][0].split(';')[0];
});

describe('Socket.IO', () => {
  it('refuses connections without a valid login', async () => {
    await expect(open({})).rejects.toThrow('Please log in');
    await expect(open({ auth: { token: 'forged' } })).rejects.toThrow('Please log in');
  });

  it('accepts the login cookie and the token in auth', async () => {
    const byCookie = await open({ extraHeaders: { cookie } });
    const byToken = await open({ auth: { token: cookie.split('=')[1] } });
    expect(byCookie.connected && byToken.connected).toBe(true);
  });

  it('pushes operation, stock and low-stock events when stock moves', async () => {
    const socket = await open({ extraHeaders: { cookie } });
    const warehouse = await createWarehouse({ shortCode: 'WH' });
    const supplier = await createContact('SUPPLIER');
    const customer = await createContact('CUSTOMER');
    const chair = await createProduct({ name: 'Chair', reorderRule: { create: { minQty: 10, maxQty: 40 } } });
    const stock = warehouse.locations[0];

    const receipt = (await agent.post('/api/operations').send({ type: 'RECEIPT', contactId: supplier.id, destLocationId: stock.id, lines: [{ productId: chair.id, quantity: 12 }] })).body.data;
    await agent.post(`/api/operations/${receipt.id}/confirm`);
    await agent.post(`/api/operations/${receipt.id}/validate`);

    const delivery = (await agent.post('/api/operations').send({ type: 'DELIVERY', contactId: customer.id, sourceLocationId: stock.id, lines: [{ productId: chair.id, quantity: 5 }] })).body.data;
    await agent.post(`/api/operations/${delivery.id}/confirm`);

    const updated = nextEvent(socket, 'operation:updated');
    const changed = nextEvent(socket, 'stock:changed');
    const low = nextEvent(socket, 'stock:low');
    await agent.post(`/api/operations/${delivery.id}/validate`);

    expect(await updated).toMatchObject({ id: delivery.id, reference: 'WH/OUT/0001', status: 'DONE' });
    expect(await changed).toEqual({ productIds: [chair.id] });
    expect(await low).toMatchObject({ product: { id: chair.id, name: 'Chair' }, onHand: 7, minQty: 10, status: 'LOW' });
  });
});

describe('session security', () => {
  it('changing the password logs out other sessions but keeps the current one', async () => {
    const user = await createUser();
    const phone = request.agent(server);
    const laptop = request.agent(server);
    await phone.post('/api/auth/login').send({ loginId: user.loginId, password: TEST_PASSWORD });
    await laptop.post('/api/auth/login').send({ loginId: user.loginId, password: TEST_PASSWORD });

    const change = await laptop.patch('/api/users/me/password').send({ currentPassword: TEST_PASSWORD, password: 'Fresh@Pass123', confirmPassword: 'Fresh@Pass123' });

    expect(change.status).toBe(200);
    expect((await laptop.get('/api/users/me')).status).toBe(200);
    expect((await phone.get('/api/users/me')).status).toBe(401);
  });

  it('a password reset invalidates existing logins', async () => {
    const user = await createUser();
    const session = request.agent(server);
    await session.post('/api/auth/login').send({ loginId: user.loginId, password: TEST_PASSWORD });
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: 'changed-by-reset' } });

    expect((await session.get('/api/users/me')).status).toBe(401);
  });

  it('health check reports the database', async () => {
    const res = await request(server).get('/api/health');
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('serves the API docs', async () => {
    const spec = await request(server).get('/api/docs/openapi.json');
    expect(spec.body.openapi).toBe('3.0.3');
    expect(Object.keys(spec.body.paths)).toContain('/operations/{id}/validate');
  });
});
