/*
 * OpenAPI 3 description of the StockSense API, served by Swagger UI at /api/docs.
 * Full field rules and examples live in docs/API.md.
 */

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };
const q = (name, schema = { type: 'string' }, description) => ({ name, in: 'query', schema, ...(description && { description }) });
const paging = [q('page', { type: 'integer', minimum: 1 }), q('limit', { type: 'integer', minimum: 1, maximum: 100 }), q('q', undefined, 'Search')];
const body = (example, required = true) => ({ required, content: { 'application/json': { example } } });
const ok = (description = 'OK') => ({ description, content: { 'application/json': { schema: ref('Success') } } });
const errors = { 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } };

const op = (tag, summary, { params = [], requestBody, status = 200, manager = false, extra = {} } = {}) => ({
  tags: [tag],
  summary: manager ? `${summary} (MANAGER)` : summary,
  parameters: params,
  ...(requestBody && { requestBody }),
  responses: {
    [status]: ok(status === 201 ? 'Created' : 'OK'),
    ...errors,
    ...(manager && { 403: { $ref: '#/components/responses/Forbidden' } }),
    ...extra,
  },
});

// list / get / create / update / delete for a master-data resource
const crud = (tag, path, { filters = [], create, update }) => ({
  [path]: {
    get: op(tag, `List ${tag.toLowerCase()}`, { params: [...paging, ...filters] }),
    post: op(tag, 'Create', { requestBody: body(create), status: 201, manager: true, extra: { 409: { $ref: '#/components/responses/Conflict' } } }),
  },
  [`${path}/{id}`]: {
    get: op(tag, 'Get one', { params: [idParam], extra: { 404: { $ref: '#/components/responses/NotFound' } } }),
    patch: op(tag, 'Update', { params: [idParam], requestBody: body(update), manager: true }),
    delete: op(tag, 'Delete (409 when in use)', { params: [idParam], manager: true, extra: { 409: { $ref: '#/components/responses/Conflict' } } }),
  },
});

const idFilter = (name) => q(name, { type: 'integer' });
const opAction = (summary) => op('Operations', summary, { params: [idParam], extra: { 409: { $ref: '#/components/responses/Conflict' } } });

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'StockSense API',
    version: '1.0.0',
    description:
      'Inventory Management System. Log in with **POST /auth/login** first: the session is kept in an httpOnly cookie, ' +
      'so "Try it out" works right after logging in. All numbers (quantities, costs) are JSON numbers.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
      bearerAuth: { type: 'http', scheme: 'bearer' },
    },
    schemas: {
      Success: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: {}, meta: { type: 'object' } } },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
        },
      },
    },
    responses: Object.fromEntries(
      [
        ['ValidationError', 'Validation failed (see errors[])'],
        ['Unauthorized', 'Not logged in or session expired'],
        ['Forbidden', 'Your role cannot do this'],
        ['NotFound', 'Not found'],
        ['Conflict', 'Duplicate, in use, or not allowed in the current status'],
      ].map(([name, description]) => [name, { description, content: { 'application/json': { schema: ref('Error') } } }])
    ),
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  tags: ['Auth', 'Users', 'Warehouses', 'Locations', 'Categories', 'Contacts', 'Products', 'Operations', 'Reports'].map((name) => ({ name })),
  paths: {
    '/auth/signup': { post: { ...op('Auth', 'Create an account (always STAFF)', { requestBody: body({ loginId: 'sahil_01', email: 'sahil@example.com', fullName: 'Sahil Maurya', password: 'Strong@Pass1', confirmPassword: 'Strong@Pass1' }), status: 201 }), security: [] } },
    '/auth/login': { post: { ...op('Auth', 'Log in (sets the cookie)', { requestBody: body({ loginId: 'purvika', password: 'your SEED_PASSWORD' }) }), security: [] } },
    '/auth/logout': { post: { ...op('Auth', 'Log out'), security: [] } },
    '/auth/forgot-password': { post: { ...op('Auth', 'Send a 6-digit reset code (always 200)', { requestBody: body({ email: 'purvika@example.com' }) }), security: [] } },
    '/auth/verify-otp': { post: { ...op('Auth', 'Verify the code → resetToken', { requestBody: body({ email: 'purvika@example.com', code: '123456' }) }), security: [] } },
    '/auth/reset-password': { post: { ...op('Auth', 'Set a new password', { requestBody: body({ resetToken: '…', password: 'Brand@New123', confirmPassword: 'Brand@New123' }) }), security: [] } },

    '/users/me': {
      get: op('Users', 'Current user'),
      patch: op('Users', 'Update my profile', { requestBody: body({ fullName: 'Purvika Jain' }) }),
    },
    '/users/me/password': { patch: op('Users', 'Change my password', { requestBody: body({ currentPassword: 'Old@Pass123', password: 'New@Pass123', confirmPassword: 'New@Pass123' }) }) },
    '/users': { get: op('Users', 'List users', { params: [...paging, q('role', { type: 'string', enum: ['MANAGER', 'STAFF'] }), q('isActive', { type: 'boolean' })], manager: true }) },
    '/users/{id}': { patch: op('Users', 'Change role / deactivate', { params: [idParam], requestBody: body({ role: 'MANAGER' }), manager: true }) },

    ...crud('Warehouses', '/warehouses', { create: { name: 'Main Warehouse', shortCode: 'WH', address: 'Ludhiana' }, update: { name: 'Main Warehouse' } }),
    ...crud('Locations', '/locations', {
      filters: [idFilter('warehouseId'), q('type', { type: 'string', enum: ['INTERNAL', 'VENDOR', 'CUSTOMER', 'ADJUSTMENT'] })],
      create: { warehouseId: 1, name: 'Rack A', shortCode: 'RackA' },
      update: { name: 'Rack A (north)' },
    }),
    ...crud('Categories', '/categories', { create: { name: 'Furniture' }, update: { name: 'Office Furniture' } }),
    ...crud('Contacts', '/contacts', {
      filters: [q('type', { type: 'string', enum: ['SUPPLIER', 'CUSTOMER'] })],
      create: { name: 'Tata Steel Traders', type: 'SUPPLIER', email: 'sales@tata.example', phone: '+91-98100-11223' },
      update: { phone: '+91-98100-00000' },
    }),
    ...crud('Products', '/products', {
      filters: [idFilter('categoryId'), idFilter('warehouseId'), q('stockStatus', { type: 'string', enum: ['OK', 'LOW', 'OUT'] }), q('isActive', { type: 'boolean' })],
      create: { name: 'Steel Rod', sku: 'STRD-002', categoryId: 1, uom: 'kg', unitCost: 85, reorderRule: { minQty: 50, maxQty: 200 }, initialStock: { locationId: 1, quantity: 40 } },
      update: { unitCost: 90, isActive: true },
    }),
    '/products/{id}/reorder-rule': {
      put: op('Products', 'Set reorder rule', { params: [idParam], requestBody: body({ minQty: 50, maxQty: 200 }), manager: true }),
      delete: op('Products', 'Remove reorder rule', { params: [idParam], manager: true }),
    },

    '/operations': {
      get: op('Operations', 'List receipts / deliveries / transfers / adjustments', {
        params: [
          ...paging,
          q('type', undefined, 'Comma list: RECEIPT,DELIVERY,TRANSFER,ADJUSTMENT'),
          q('status', undefined, 'Comma list: DRAFT,WAITING,READY,DONE,CANCELLED'),
          idFilter('warehouseId'), idFilter('locationId'), idFilter('contactId'), idFilter('productId'),
          q('late', { type: 'boolean' }), q('from', { type: 'string', format: 'date-time' }), q('to', { type: 'string', format: 'date-time' }),
        ],
      }),
      post: op('Operations', 'Create a draft', {
        requestBody: body({ type: 'RECEIPT', contactId: 1, destLocationId: 1, scheduleDate: '2026-09-28T10:00:00.000Z', lines: [{ productId: 1, quantity: 50 }] }),
        status: 201,
      }),
    },
    '/operations/summary': { get: op('Operations', 'Counts per status (+ late)', { params: [q('type'), idFilter('warehouseId')] }) },
    '/operations/adjustments': {
      post: op('Operations', 'Stock adjustment from a physical count', { requestBody: body({ productId: 1, locationId: 1, countedQuantity: 47, reason: '3 kg damaged' }), status: 201 }),
    },
    '/operations/{id}': {
      get: op('Operations', 'Detail (availability / stock moves)', { params: [idParam] }),
      patch: op('Operations', 'Edit a draft', { params: [idParam], requestBody: body({ notes: 'Deliver before noon' }) }),
      delete: op('Operations', 'Delete a draft', { params: [idParam] }),
    },
    '/operations/{id}/confirm': { post: opAction('Draft → Ready (or Waiting if short on stock)') },
    '/operations/{id}/check-availability': { post: opAction('Re-check stock: Waiting ⇄ Ready') },
    '/operations/{id}/validate': { post: opAction('Ready → Done (moves the stock)') },
    '/operations/{id}/cancel': { post: opAction('Cancel an open operation') },

    '/stock': { get: op('Reports', 'Stock per product (+ total value)', { params: [...paging, idFilter('warehouseId'), idFilter('locationId'), idFilter('categoryId'), q('inStock', { type: 'boolean' })] }) },
    '/moves': {
      get: op('Reports', 'Move history (ledger)', {
        params: [...paging, idFilter('productId'), idFilter('locationId'), idFilter('warehouseId'), q('type'), q('direction', { type: 'string', enum: ['IN', 'OUT', 'INTERNAL'] }), q('from'), q('to')],
      }),
    },
    '/dashboard': { get: op('Reports', 'Dashboard: KPIs, value, 7-day movement, alerts', { params: [idFilter('warehouseId'), idFilter('categoryId')] }) },
  },
};

export default openapi;
