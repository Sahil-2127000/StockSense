import { Prisma } from '@prisma/client';
import prisma from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { buildMeta, getPagination } from '../utils/pagination.js';
import { operationChanged, stockChanged } from './events.service.js';
import { getSystemLocation, lockQuantity, moveStock, nextReference } from './stock.engine.js';

/*
 * Receipts, deliveries, transfers and adjustments.
 *
 * Status flow:
 *   RECEIPT            DRAFT → READY → DONE
 *   DELIVERY/TRANSFER  DRAFT → WAITING (short on stock) ⇄ READY → DONE
 *   any of the above   DRAFT / WAITING / READY → CANCELLED
 *   ADJUSTMENT         created directly as DONE
 * Stock only changes on DONE, through the stock engine.
 */

const RULES = {
  RECEIPT: { contactType: 'SUPPLIER', source: 'VENDOR', dest: 'INTERNAL' },
  DELIVERY: { contactType: 'CUSTOMER', source: 'INTERNAL', dest: 'CUSTOMER' },
  TRANSFER: { contactType: null, source: 'INTERNAL', dest: 'INTERNAL' },
};

const OPEN_STATUSES = ['DRAFT', 'WAITING', 'READY'];
const NEEDS_STOCK = ['DELIVERY', 'TRANSFER'];

const locationSelect = { select: { id: true, name: true, fullPath: true, type: true, warehouseId: true } };

const include = {
  contact: { select: { id: true, name: true, type: true } },
  sourceLocation: locationSelect,
  destLocation: locationSelect,
  responsible: { select: { id: true, loginId: true, fullName: true } },
  lines: {
    include: { product: { select: { id: true, name: true, sku: true, uom: true } } },
    orderBy: { id: 'asc' },
  },
};

const fieldError = (field, message) => ApiError.badRequest('Validation failed', [{ field, message }]);

// Design rule: "Late" = still open and scheduled before today (compared by day, not by second)
const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};
const lateFilter = () => ({ status: { in: OPEN_STATUSES }, scheduleDate: { lt: startOfToday() } });

const isLate = (operation) => OPEN_STATUSES.includes(operation.status) && operation.scheduleDate < startOfToday();

const shape = (operation) => ({ ...operation, isLate: isLate(operation) });

const findOr404 = async (id, db = prisma) => {
  const operation = await db.operation.findUnique({ where: { id }, include });
  if (!operation) throw ApiError.notFound('Operation not found');
  return operation;
};

const assertStatus = (operation, allowed, action) => {
  if (!allowed.includes(operation.status)) {
    throw ApiError.conflict(`Cannot ${action} an operation that is ${operation.status}`);
  }
};

// ─── Input checks shared by create and update ───

const resolveLocations = async (tx, type, { sourceLocationId, destLocationId }) => {
  const rule = RULES[type];

  const pick = async (kind, id, field) => {
    if (rule[kind] !== 'INTERNAL') return getSystemLocation(tx, rule[kind]);
    if (!id) throw fieldError(field, 'Choose a warehouse location');
    const location = await tx.location.findUnique({ where: { id } });
    if (!location || location.type !== 'INTERNAL') throw fieldError(field, 'Choose a warehouse location');
    return location;
  };

  const source = await pick('source', sourceLocationId, 'sourceLocationId');
  const dest = await pick('dest', destLocationId, 'destLocationId');
  if (source.id === dest.id) throw fieldError('destLocationId', 'Destination must differ from the source');
  return { source, dest };
};

const assertContact = async (tx, type, contactId) => {
  const expected = RULES[type].contactType;
  if (!expected) return null;
  const label = expected === 'SUPPLIER' ? 'supplier' : 'customer';
  if (!contactId) throw fieldError('contactId', `Choose a ${label}`);
  const contact = await tx.contact.findUnique({ where: { id: contactId } });
  if (!contact || contact.type !== expected) throw fieldError('contactId', `Choose a ${label}`);
  return contact.id;
};

const assertProducts = async (tx, lines) => {
  const products = await tx.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) }, isActive: true },
    select: { id: true },
  });
  const found = new Set(products.map((p) => p.id));
  const index = lines.findIndex((l) => !found.has(l.productId));
  if (index !== -1) throw fieldError(`lines.${index}.productId`, 'Product not found or inactive');
};

// ─── Availability ───

/**
 * Quantity of each product that this operation can still use at its source location:
 * stock on hand there minus what other READY deliveries / transfers from there have reserved.
 */
export const availabilityFor = async (db, operation) => {
  const productIds = operation.lines.map((l) => l.productId);
  const locationId = operation.sourceLocationId;

  const [quants, reserved] = await Promise.all([
    db.stockQuant.findMany({ where: { locationId, productId: { in: productIds } } }),
    db.operationLine.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        operation: { id: { not: operation.id }, status: 'READY', type: { in: NEEDS_STOCK }, sourceLocationId: locationId },
      },
      _sum: { quantity: true },
    }),
  ]);

  const onHand = new Map(quants.map((q) => [q.productId, q.quantity]));
  const held = new Map(reserved.map((r) => [r.productId, r._sum.quantity]));

  return operation.lines.map((line) => {
    const available = Prisma.Decimal.max(
      new Prisma.Decimal(onHand.get(line.productId) ?? 0).minus(held.get(line.productId) ?? 0),
      0
    );
    return { productId: line.productId, requested: line.quantity, available, enough: available.gte(line.quantity) };
  });
};

// ─── Queries ───

export const list = async (query) => {
  const { skip, take, page, limit } = getPagination(query);
  const where = {
    ...(query.type && { type: { in: query.type } }),
    ...(query.status && { status: { in: query.status } }),
    ...(query.contactId && { contactId: query.contactId }),
    ...(query.productId && { lines: { some: { productId: query.productId } } }),
    ...((query.from || query.to) && { scheduleDate: { ...(query.from && { gte: query.from }), ...(query.to && { lte: query.to }) } }),
    AND: [
      query.warehouseId
        ? { OR: [{ sourceLocation: { warehouseId: query.warehouseId } }, { destLocation: { warehouseId: query.warehouseId } }] }
        : {},
      query.locationId ? { OR: [{ sourceLocationId: query.locationId }, { destLocationId: query.locationId }] } : {},
      query.q ? { OR: [{ reference: { contains: query.q } }, { contact: { name: { contains: query.q } } }] } : {},
      query.late === true ? lateFilter() : {},
      query.late === false ? { NOT: lateFilter() } : {},
    ],
  };

  const [items, total] = await prisma.$transaction([
    prisma.operation.findMany({ where, include, orderBy: [{ scheduleDate: 'desc' }, { id: 'desc' }], skip, take }),
    prisma.operation.count({ where }),
  ]);
  return { items: items.map(shape), meta: buildMeta(total, page, limit) };
};

// Counts per status (+ late) for kanban columns, badges and dashboard cards
export const summary = async ({ type, warehouseId }) => {
  const where = {
    ...(type && { type: { in: type } }),
    ...(warehouseId && {
      OR: [{ sourceLocation: { warehouseId } }, { destLocation: { warehouseId } }],
    }),
  };
  const [byStatus, late] = await Promise.all([
    prisma.operation.groupBy({ by: ['status'], where, _count: true }),
    prisma.operation.count({ where: { AND: [where, lateFilter()] } }),
  ]);
  const counts = Object.fromEntries(['DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELLED'].map((s) => [s, 0]));
  byStatus.forEach((row) => (counts[row.status] = row._count));
  return { ...counts, late, total: Object.values(counts).reduce((a, b) => a + b, 0) };
};

export const getById = async (id) => {
  const operation = await findOr404(id);
  const result = shape(operation);

  if (NEEDS_STOCK.includes(operation.type) && OPEN_STATUSES.includes(operation.status)) {
    result.availability = await availabilityFor(prisma, operation);
  }
  if (operation.status === 'DONE') {
    result.stockMoves = await prisma.stockMove.findMany({
      where: { operationId: id },
      include: { fromLocation: locationSelect, toLocation: locationSelect },
      orderBy: { id: 'asc' },
    });
  }
  return result;
};

// ─── Commands ───

// Sends real-time events after a committed change; stock: true when stock moved
const notify = (operation, { stock = false } = {}) => {
  operationChanged(operation);
  if (stock) stockChanged(operation.lines.map((l) => l.productId));
  return operation;
};

export const create = async ({ type, contactId, scheduleDate, notes, lines, ...locationIds }, user) => {
  const id = await prisma.$transaction(async (tx) => {
    const { source, dest } = await resolveLocations(tx, type, locationIds);
    const validContactId = await assertContact(tx, type, contactId);
    await assertProducts(tx, lines);

    // Numbered by the warehouse the goods leave (or arrive at, for receipts)
    const warehouseId = type === 'RECEIPT' ? dest.warehouseId : source.warehouseId;
    const operation = await tx.operation.create({
      data: {
        reference: await nextReference(tx, warehouseId, type),
        type,
        contactId: validContactId,
        sourceLocationId: source.id,
        destLocationId: dest.id,
        scheduleDate,
        notes,
        responsibleId: user.id,
        lines: { create: lines },
      },
    });
    return operation.id;
  });
  return notify(await getById(id));
};

export const update = async (id, { lines, contactId, scheduleDate, notes, ...locationIds }) => {
  const existing = await findOr404(id);
  assertStatus(existing, ['DRAFT'], 'edit');

  await prisma.$transaction(async (tx) => {
    const { source, dest } = await resolveLocations(tx, existing.type, {
      sourceLocationId: locationIds.sourceLocationId ?? existing.sourceLocationId,
      destLocationId: locationIds.destLocationId ?? existing.destLocationId,
    });
    const validContactId = await assertContact(tx, existing.type, contactId ?? existing.contactId);
    if (lines) await assertProducts(tx, lines);

    const { count } = await tx.operation.updateMany({
      where: { id, status: 'DRAFT' },
      data: { contactId: validContactId, sourceLocationId: source.id, destLocationId: dest.id, scheduleDate, notes },
    });
    if (!count) throw ApiError.conflict('Operation is no longer a draft');

    if (lines) {
      await tx.operationLine.deleteMany({ where: { operationId: id } });
      await tx.operationLine.createMany({ data: lines.map((l) => ({ ...l, operationId: id })) });
    }
  });
  return notify(await getById(id));
};

// Moves the status only if it is still what we expect (guards against double clicks / races)
const transition = async (db, id, from, to, extra = {}) => {
  const { count } = await db.operation.updateMany({ where: { id, status: { in: from } }, data: { status: to, ...extra } });
  if (!count) throw ApiError.conflict('Operation status changed. Refresh and try again.');
};

// DRAFT → READY (or WAITING when a delivery / transfer is short on stock)
export const confirm = async (id) => {
  const operation = await findOr404(id);
  assertStatus(operation, ['DRAFT'], 'confirm');

  let next = 'READY';
  if (NEEDS_STOCK.includes(operation.type)) {
    const availability = await availabilityFor(prisma, operation);
    if (!availability.every((a) => a.enough)) next = 'WAITING';
  }
  await transition(prisma, id, ['DRAFT'], next);
  return notify(await getById(id));
};

// Re-tests stock for WAITING / READY deliveries and transfers and updates the status
export const checkAvailability = async (id) => {
  const operation = await findOr404(id);
  if (!NEEDS_STOCK.includes(operation.type)) throw ApiError.badRequest('Only deliveries and transfers need stock');
  assertStatus(operation, ['WAITING', 'READY'], 'check availability of');

  const availability = await availabilityFor(prisma, operation);
  const next = availability.every((a) => a.enough) ? 'READY' : 'WAITING';
  if (next !== operation.status) await transition(prisma, id, [operation.status], next);
  return notify(await getById(id));
};

// READY → DONE: the moment stock actually moves
export const validate = async (id) => {
  const operation = await findOr404(id);
  if (operation.status === 'WAITING') {
    throw ApiError.conflict('Not enough stock yet. Use "Check availability" when stock arrives.');
  }
  assertStatus(operation, ['READY'], 'validate');

  await prisma.$transaction(async (tx) => {
    // Locks the operation row: a second validate waits here, then finds it DONE and fails
    await transition(tx, id, ['READY'], 'DONE', { doneAt: new Date() });
    const products = Object.fromEntries(operation.lines.map((l) => [l.productId, l.product]));
    await moveStock(tx, {
      operationId: id,
      from: operation.sourceLocation,
      to: operation.destLocation,
      lines: operation.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      products,
    });
  });
  return notify(await getById(id), { stock: true });
};

export const cancel = async (id) => {
  const operation = await findOr404(id);
  assertStatus(operation, OPEN_STATUSES, 'cancel');
  await transition(prisma, id, OPEN_STATUSES, 'CANCELLED');
  return notify(await getById(id));
};

// Only drafts can be deleted; anything confirmed stays for the audit trail (cancel it instead)
export const remove = async (id) => {
  const operation = await findOr404(id);
  assertStatus(operation, ['DRAFT'], 'delete');
  await prisma.operation.delete({ where: { id } });
  operationChanged({ ...operation, status: 'DELETED' });
};

/**
 * Stock adjustment: the user enters the physical count; the difference is booked
 * as a DONE adjustment (gain: Adjustment → location, loss: location → Adjustment).
 */
export const createAdjustment = async ({ productId, locationId, countedQuantity, reason }, user) => {
  const id = await prisma.$transaction(async (tx) => {
    const location = await tx.location.findUnique({ where: { id: locationId } });
    if (!location || location.type !== 'INTERNAL') throw fieldError('locationId', 'Choose a warehouse location');
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw fieldError('productId', 'Product not found');

    const recorded = await lockQuantity(tx, productId, locationId);
    const difference = new Prisma.Decimal(countedQuantity).minus(recorded);
    if (difference.isZero()) {
      throw fieldError('countedQuantity', `Counted quantity equals the recorded stock (${recorded})`);
    }

    const adjustmentLocation = await getSystemLocation(tx, 'ADJUSTMENT');
    const gain = difference.gt(0);
    const [from, to] = gain ? [adjustmentLocation, location] : [location, adjustmentLocation];
    const lines = [{ productId, quantity: difference.abs() }];

    const operation = await tx.operation.create({
      data: {
        reference: await nextReference(tx, location.warehouseId, 'ADJUSTMENT'),
        type: 'ADJUSTMENT',
        status: 'DONE',
        sourceLocationId: from.id,
        destLocationId: to.id,
        scheduleDate: new Date(),
        doneAt: new Date(),
        responsibleId: user.id,
        notes: reason ?? `Physical count: ${countedQuantity} (recorded ${recorded})`,
        lines: { create: lines },
      },
    });
    await moveStock(tx, { operationId: operation.id, from, to, lines, products: { [productId]: product } });
    return operation.id;
  });
  return notify(await getById(id), { stock: true });
};
