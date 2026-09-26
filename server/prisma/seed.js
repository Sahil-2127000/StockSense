import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from '../config/db.js';

// Dates are relative to "now" so late / upcoming operations stay correct whenever the seed runs.
const daysFromNow = (days, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

/**
 * Creates a DONE operation, its ledger rows (StockMove) and updates balances (StockQuant)
 * inside one transaction, so the ledger and the balances can never disagree.
 */
async function createDoneOperation({ lines, doneAt, ...operation }, locationTypes) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.operation.create({
      data: {
        ...operation,
        status: 'DONE',
        doneAt,
        lines: { create: lines.map(({ productId, quantity }) => ({ productId, quantity })) },
      },
    });

    for (const { productId, quantity } of lines) {
      await tx.stockMove.create({
        data: {
          operationId: created.id,
          productId,
          fromLocationId: operation.sourceLocationId,
          toLocationId: operation.destLocationId,
          quantity,
          createdAt: doneAt,
        },
      });

      // Only INTERNAL locations hold real stock; virtual locations are just the other side of the move.
      if (locationTypes[operation.sourceLocationId] === 'INTERNAL') {
        const source = await tx.stockQuant.findUnique({
          where: { productId_locationId: { productId, locationId: operation.sourceLocationId } },
        });
        if (!source || Number(source.quantity) < quantity) {
          throw new Error(`Seed error: not enough stock for product ${productId} in ${created.reference}`);
        }
        await tx.stockQuant.update({
          where: { id: source.id },
          data: { quantity: { decrement: quantity } },
        });
      }

      if (locationTypes[operation.destLocationId] === 'INTERNAL') {
        await tx.stockQuant.upsert({
          where: { productId_locationId: { productId, locationId: operation.destLocationId } },
          update: { quantity: { increment: quantity } },
          create: { productId, locationId: operation.destLocationId, quantity },
        });
      }
    }

    return created;
  });
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is production (the seed deletes all data).');
  }

  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword) {
    throw new Error('SEED_PASSWORD is missing. Add it to server/.env (see .env.example).');
  }

  console.log('🌱 Starting database seed...');

  // ─── 1. CLEAN EXISTING DATA (reverse dependency order) ───
  console.log('🧹 Clearing existing records...');
  await prisma.stockMove.deleteMany();
  await prisma.stockQuant.deleteMany();
  await prisma.operationLine.deleteMany();
  await prisma.operation.deleteMany();
  await prisma.referenceSequence.deleteMany();
  await prisma.reorderRule.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.location.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();

  // ─── 2. USERS ───
  console.log('👤 Seeding users...');
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const manager = await prisma.user.create({
    data: {
      loginId: 'purvika',
      email: 'purvika_2315185@gndec.ac.in',
      fullName: 'Purvika Jain',
      passwordHash,
      emailVerifiedAt: new Date(),
      role: 'MANAGER',
    },
  });

  const staff = await prisma.user.create({
    data: {
      loginId: 'aman_shaikh',
      email: 'aman.shaikh@stocksense.in',
      fullName: 'Aman Shaikh',
      passwordHash,
      emailVerifiedAt: new Date(),
      role: 'STAFF',
    },
  });

  // ─── 3. WAREHOUSES & LOCATIONS ───
  console.log('🏢 Seeding warehouses & locations...');
  const warehouse = await prisma.warehouse.create({
    data: {
      name: 'Main Warehouse',
      shortCode: 'WH',
      address: 'Plot 14, Focal Point, Ludhiana, Punjab 141010',
    },
  });

  const createLocation = (data) => prisma.location.create({ data });

  // Internal (physical) locations
  const locStock1 = await createLocation({ warehouseId: warehouse.id, name: 'Main Store', shortCode: 'Stock1', fullPath: 'WH/Stock1', type: 'INTERNAL' });
  await createLocation({ warehouseId: warehouse.id, name: 'Rack B', shortCode: 'Stock2', fullPath: 'WH/Stock2', type: 'INTERNAL' });
  const locProd = await createLocation({ warehouseId: warehouse.id, name: 'Production Floor', shortCode: 'Prod', fullPath: 'WH/Prod', type: 'INTERNAL' });

  // Virtual (system) locations: the "other side" of receipts, deliveries and adjustments
  const locVendor = await createLocation({ name: 'Vendors', shortCode: 'Vendor', fullPath: 'Vendors', type: 'VENDOR' });
  const locCustomer = await createLocation({ name: 'Customers', shortCode: 'Customer', fullPath: 'Customers', type: 'CUSTOMER' });
  const locAdjustment = await createLocation({ name: 'Inventory Adjustment', shortCode: 'Adjustment', fullPath: 'Adjustment', type: 'ADJUSTMENT' });

  const allLocations = await prisma.location.findMany({ select: { id: true, type: true } });
  const locationTypes = Object.fromEntries(allLocations.map((l) => [l.id, l.type]));

  // ─── 4. CATEGORIES ───
  console.log('🏷️  Seeding categories...');
  const catRaw = await prisma.category.create({ data: { name: 'Raw Material' } });
  const catFurniture = await prisma.category.create({ data: { name: 'Furniture' } });
  const catElectronics = await prisma.category.create({ data: { name: 'Electronics' } });
  const catPackaging = await prisma.category.create({ data: { name: 'Packaging' } });

  // ─── 5. CONTACTS ───
  console.log('🤝 Seeding contacts...');
  const createContact = (data) => prisma.contact.create({ data });

  const supplierTata = await createContact({ name: 'Tata Steel Traders', type: 'SUPPLIER', email: 'sales@tatasteeltraders.com', phone: '+91-98100-11223', address: 'Industrial Area Phase 2, Ludhiana' });
  const supplierLumber = await createContact({ name: 'Lumber Inc', type: 'SUPPLIER', email: 'orders@lumberinc.com', phone: '+91-98765-43210', address: 'Timber Market, Sahnewal' });
  const supplierReadyMat = await createContact({ name: 'Ready Mat', type: 'SUPPLIER', email: 'contact@readymat.in', phone: '+91-98144-55667', address: 'Focal Point Extension, Ludhiana' });
  const customerGemini = await createContact({ name: 'Gemini Furniture', type: 'CUSTOMER', email: 'info@geminifurniture.com', phone: '+91-98200-33445', address: 'SCO 41, Sector 17-C, Chandigarh 160017' });
  const customerAzure = await createContact({ name: 'Azure Interior', type: 'CUSTOMER', email: 'design@azureinterior.in', phone: '+91-98300-66778', address: 'Mall Road, Civil Lines, Ludhiana' });
  await createContact({ name: 'Deco Addict', type: 'CUSTOMER', email: 'orders@decoaddict.in', phone: '+91-98400-88990', address: 'Model Town, Jalandhar' });

  // ─── 6. PRODUCTS & REORDER RULES ───
  console.log('📦 Seeding products & reorder rules...');
  const productsData = [
    { name: 'Steel Rod', sku: 'STRD001', categoryId: catRaw.id, uom: 'kg', unitCost: '85.00', minQty: '50.000', maxQty: '200.000' },
    { name: 'Steel Sheet', sku: 'STSH001', categoryId: catRaw.id, uom: 'kg', unitCost: '120.00', minQty: '40.000', maxQty: '150.000' },
    { name: 'Office Chair', sku: 'CHAIR01', categoryId: catFurniture.id, uom: 'pcs', unitCost: '1200.00', minQty: '20.000', maxQty: '80.000' },
    { name: 'Desk', sku: 'DESK001', categoryId: catFurniture.id, uom: 'pcs', unitCost: '3000.00', minQty: '10.000', maxQty: '50.000' },
    { name: 'Table', sku: 'TABL001', categoryId: catFurniture.id, uom: 'pcs', unitCost: '3000.00', minQty: '15.000', maxQty: '60.000' },
    { name: 'Desk Lamp', sku: 'LAMP001', categoryId: catFurniture.id, uom: 'pcs', unitCost: '850.00', minQty: '10.000', maxQty: '50.000' },
    { name: 'Monitor 24"', sku: 'MON0024', categoryId: catElectronics.id, uom: 'pcs', unitCost: '9500.00', minQty: '10.000', maxQty: '40.000' },
    { name: 'Keyboard', sku: 'KEYB001', categoryId: catElectronics.id, uom: 'pcs', unitCost: '650.00', minQty: '20.000', maxQty: '80.000' },
    { name: 'Carton Box', sku: 'CBOX01', categoryId: catPackaging.id, uom: 'pcs', unitCost: '25.00', minQty: '200.000', maxQty: '1000.000' },
    { name: 'Packing Tape', sku: 'TAPE01', categoryId: catPackaging.id, uom: 'roll', unitCost: '40.00', minQty: '50.000', maxQty: '200.000' },
  ];

  const products = {};
  for (const { minQty, maxQty, ...product } of productsData) {
    products[product.sku] = await prisma.product.create({
      data: { ...product, reorderRule: { create: { minQty, maxQty } } },
    });
  }
  const id = (sku) => products[sku].id;

  // ─── 7. DONE OPERATIONS (ledger + balances) ───
  console.log('📋 Seeding operations & stock movements...');
  const receipt = { type: 'RECEIPT', sourceLocationId: locVendor.id, destLocationId: locStock1.id };
  const delivery = { type: 'DELIVERY', sourceLocationId: locStock1.id, destLocationId: locCustomer.id };

  await createDoneOperation(
    {
      ...receipt,
      reference: 'WH/IN/0001',
      contactId: supplierReadyMat.id,
      scheduleDate: daysFromNow(-6),
      doneAt: daysFromNow(-6, 11),
      responsibleId: staff.id,
      notes: 'Electronics opening stock',
      lines: [
        { productId: id('MON0024'), quantity: 3 },
        { productId: id('KEYB001'), quantity: 40 },
      ],
    },
    locationTypes
  );

  await createDoneOperation(
    {
      ...receipt,
      reference: 'WH/IN/0002',
      contactId: supplierLumber.id,
      scheduleDate: daysFromNow(-4),
      doneAt: daysFromNow(-4, 11),
      responsibleId: manager.id,
      notes: 'Initial opening stock receipt',
      lines: [
        { productId: id('DESK001'), quantity: 20 },
        { productId: id('TABL001'), quantity: 10 },
      ],
    },
    locationTypes
  );

  await createDoneOperation(
    {
      ...receipt,
      reference: 'WH/IN/0003',
      contactId: supplierLumber.id,
      scheduleDate: daysFromNow(-3, 9),
      doneAt: daysFromNow(-3, 10),
      responsibleId: staff.id,
      notes: 'Standard batch shipment of office chairs',
      lines: [{ productId: id('CHAIR01'), quantity: 30 }],
    },
    locationTypes
  );

  await createDoneOperation(
    {
      ...receipt,
      reference: 'WH/IN/0004',
      contactId: supplierReadyMat.id,
      scheduleDate: daysFromNow(-2, 11),
      doneAt: daysFromNow(-2, 12),
      responsibleId: manager.id,
      notes: 'Packaging restock',
      lines: [
        { productId: id('CBOX01'), quantity: 120 },
        { productId: id('TAPE01'), quantity: 40 },
      ],
    },
    locationTypes
  );

  await createDoneOperation(
    {
      ...receipt,
      reference: 'WH/IN/0006',
      contactId: supplierTata.id,
      scheduleDate: daysFromNow(-2, 14),
      doneAt: daysFromNow(-2, 15),
      responsibleId: manager.id,
      notes: 'Heavy metal stock arrived',
      lines: [
        { productId: id('STSH001'), quantity: 100 },
        { productId: id('STRD001'), quantity: 50 },
      ],
    },
    locationTypes
  );

  // Transfer: total stock unchanged, only the location changes
  await createDoneOperation(
    {
      type: 'TRANSFER',
      reference: 'WH/INT/0001',
      sourceLocationId: locStock1.id,
      destLocationId: locProd.id,
      scheduleDate: daysFromNow(-2, 16),
      doneAt: daysFromNow(-2, 17),
      responsibleId: staff.id,
      notes: 'Feed production line A',
      lines: [{ productId: id('STRD001'), quantity: 30 }],
    },
    locationTypes
  );

  // Adjustment: 3 kg damaged, moved out to the virtual adjustment location
  await createDoneOperation(
    {
      type: 'ADJUSTMENT',
      reference: 'WH/ADJ/0001',
      sourceLocationId: locProd.id,
      destLocationId: locAdjustment.id,
      scheduleDate: daysFromNow(-1, 11),
      doneAt: daysFromNow(-1, 11),
      responsibleId: manager.id,
      notes: 'Damaged during cutting process',
      lines: [{ productId: id('STRD001'), quantity: 3 }],
    },
    locationTypes
  );

  await createDoneOperation(
    {
      ...delivery,
      reference: 'WH/OUT/0001',
      contactId: customerAzure.id,
      scheduleDate: daysFromNow(-1, 14),
      doneAt: daysFromNow(-1, 15),
      responsibleId: staff.id,
      notes: 'Chairs for Azure Interior showroom',
      lines: [{ productId: id('CHAIR01'), quantity: 10 }],
    },
    locationTypes
  );

  // ─── 8. PENDING OPERATIONS (no stock moves yet) ───
  const createPending = ({ lines, ...data }) =>
    prisma.operation.create({ data: { ...data, lines: { create: lines } } });

  // READY receipt scheduled in the past → shows as "Late"
  await createPending({
    ...receipt,
    reference: 'WH/IN/0005',
    status: 'READY',
    contactId: supplierLumber.id,
    scheduleDate: daysFromNow(-2),
    responsibleId: manager.id,
    notes: 'Late arriving vendor shipment',
    lines: [{ productId: id('DESK001'), quantity: 10 }],
  });

  // READY receipt that will cover the waiting delivery below
  await createPending({
    ...receipt,
    reference: 'WH/IN/0007',
    status: 'READY',
    contactId: supplierReadyMat.id,
    scheduleDate: daysFromNow(2),
    responsibleId: staff.id,
    notes: 'Monitor restock',
    lines: [{ productId: id('MON0024'), quantity: 15 }],
  });

  await createPending({
    ...receipt,
    reference: 'WH/IN/0008',
    status: 'DRAFT',
    contactId: supplierLumber.id,
    scheduleDate: daysFromNow(4),
    responsibleId: staff.id,
    notes: 'Desk lamp bulk order',
    lines: [{ productId: id('LAMP001'), quantity: 20 }],
  });

  // WAITING delivery: 12 monitors requested, only 3 on hand
  await createPending({
    ...delivery,
    reference: 'WH/OUT/0006',
    status: 'WAITING',
    contactId: customerGemini.id,
    scheduleDate: daysFromNow(0, 14),
    responsibleId: manager.id,
    notes: 'Waiting for Monitor 24" shipment from vendor',
    lines: [{ productId: id('MON0024'), quantity: 12 }],
  });

  // READY delivery scheduled yesterday → late
  await createPending({
    ...delivery,
    reference: 'WH/OUT/0005',
    status: 'READY',
    contactId: customerAzure.id,
    scheduleDate: daysFromNow(-1, 15),
    responsibleId: staff.id,
    notes: 'Ready to be packed and dispatched',
    lines: [{ productId: id('DESK001'), quantity: 5 }],
  });

  // ─── 9. REFERENCE SEQUENCES (next free number per type) ───
  console.log('🔢 Initializing reference sequences...');
  await prisma.referenceSequence.createMany({
    data: [
      { warehouseId: warehouse.id, type: 'RECEIPT', nextNumber: 9 },
      { warehouseId: warehouse.id, type: 'DELIVERY', nextNumber: 7 },
      { warehouseId: warehouse.id, type: 'TRANSFER', nextNumber: 2 },
      { warehouseId: warehouse.id, type: 'ADJUSTMENT', nextNumber: 2 },
    ],
  });

  console.log('✅ Seed completed. Users: purvika (MANAGER), aman_shaikh (STAFF), password = SEED_PASSWORD');
}

main()
  .catch((error) => {
    console.error('❌ Error during database seed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
