import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── 1. CLEAN EXISTING DATA (Reverse dependency order) ───
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
  const seedPassword = process.env.SEED_PASSWORD || 'Test@1234';
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const manager = await prisma.user.create({
    data: {
      loginId: 'purvika',
      email: 'purvika_2315185@gndec.ac.in',
      fullName: 'Purvika Jain',
      passwordHash,
      role: 'MANAGER',
      isActive: true,
    },
  });

  const staff = await prisma.user.create({
    data: {
      loginId: 'aman.shaikh',
      email: 'aman.shaikh@stocksense.in',
      fullName: 'Aman Shaikh',
      passwordHash,
      role: 'STAFF',
      isActive: true,
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

  // Internal Locations
  const locStock1 = await prisma.location.create({
    data: {
      warehouseId: warehouse.id,
      name: 'Main Store',
      shortCode: 'Stock1',
      fullPath: 'WH/Stock1',
      type: 'INTERNAL',
    },
  });

  const _locStock2 = await prisma.location.create({
    data: {
      warehouseId: warehouse.id,
      name: 'Rack B',
      shortCode: 'Stock2',
      fullPath: 'WH/Stock2',
      type: 'INTERNAL',
    },
  });

  const locProd = await prisma.location.create({
    data: {
      warehouseId: warehouse.id,
      name: 'Production Floor',
      shortCode: 'Prod',
      fullPath: 'WH/Prod',
      type: 'INTERNAL',
    },
  });

  // Virtual Locations
  const locVendor = await prisma.location.create({
    data: {
      warehouseId: null,
      name: 'Vendors',
      shortCode: 'Vendor',
      fullPath: 'Vendors',
      type: 'VENDOR',
    },
  });

  const locCustomer = await prisma.location.create({
    data: {
      warehouseId: null,
      name: 'Customers',
      shortCode: 'Customer',
      fullPath: 'Customers',
      type: 'CUSTOMER',
    },
  });

  const locAdjustment = await prisma.location.create({
    data: {
      warehouseId: null,
      name: 'Inventory Adjustment',
      shortCode: 'Adjustment',
      fullPath: 'Adjustment',
      type: 'ADJUSTMENT',
    },
  });

  // ─── 4. CATEGORIES ───
  console.log('🏷️ Seeding categories...');
  const catRaw = await prisma.category.create({ data: { name: 'Raw Material' } });
  const catFurniture = await prisma.category.create({ data: { name: 'Furniture' } });
  const catElectronics = await prisma.category.create({ data: { name: 'Electronics' } });
  const catPackaging = await prisma.category.create({ data: { name: 'Packaging' } });

  // ─── 5. CONTACTS ───
  console.log('🤝 Seeding contacts...');
  const supplierTata = await prisma.contact.create({
    data: {
      name: 'Tata Steel Traders',
      type: 'SUPPLIER',
      email: 'sales@tatasteeltraders.com',
      phone: '+91-98100-11223',
      address: 'Industrial Area Phase 2, Ludhiana',
    },
  });

  const supplierLumber = await prisma.contact.create({
    data: {
      name: 'Lumber Inc',
      type: 'SUPPLIER',
      email: 'orders@lumberinc.com',
      phone: '+91-98765-43210',
      address: 'Timber Market, Sahnewal',
    },
  });

  const supplierReadyMat = await prisma.contact.create({
    data: {
      name: 'Ready Mat',
      type: 'SUPPLIER',
      email: 'contact@readymat.in',
      phone: '+91-98144-55667',
      address: 'Focal Point Extension, Ludhiana',
    },
  });

  const customerGemini = await prisma.contact.create({
    data: {
      name: 'Gemini Furniture',
      type: 'CUSTOMER',
      email: 'info@geminifurniture.com',
      phone: '+91-98200-33445',
      address: 'SCO 41, Sector 17-C, Chandigarh 160017',
    },
  });

  const customerAzure = await prisma.contact.create({
    data: {
      name: 'Azure Interior',
      type: 'CUSTOMER',
      email: 'design@azureinterior.in',
      phone: '+91-98300-66778',
      address: 'Mall Road, Civil Lines, Ludhiana',
    },
  });

  const _customerDeco = await prisma.contact.create({
    data: {
      name: 'Deco Addict',
      type: 'CUSTOMER',
      email: 'orders@decoaddict.in',
      phone: '+91-98400-88990',
      address: 'Model Town, Jalandhar',
    },
  });

  // ─── 6. PRODUCTS & REORDER RULES ───
  console.log('📦 Seeding products & reorder rules...');
  const productsData = [
    { name: 'Steel Rod', sku: 'STRD001', catId: catRaw.id, uom: 'kg', unitCost: '85.00', minQty: '50.000', maxQty: '200.000' },
    { name: 'Steel Sheet', sku: 'STSH001', catId: catRaw.id, uom: 'kg', unitCost: '120.00', minQty: '40.000', maxQty: '150.000' },
    { name: 'Office Chair', sku: 'CHAIR01', catId: catFurniture.id, uom: 'pcs', unitCost: '1200.00', minQty: '20.000', maxQty: '80.000' },
    { name: 'Desk', sku: 'DESK001', catId: catFurniture.id, uom: 'pcs', unitCost: '3000.00', minQty: '10.000', maxQty: '50.000' },
    { name: 'Table', sku: 'TABL001', catId: catFurniture.id, uom: 'pcs', unitCost: '3000.00', minQty: '15.000', maxQty: '60.000' },
    { name: 'Desk Lamp', sku: 'LAMP001', catId: catFurniture.id, uom: 'pcs', unitCost: '850.00', minQty: '10.000', maxQty: '50.000' },
    { name: 'Monitor 24"', sku: 'MON0024', catId: catElectronics.id, uom: 'pcs', unitCost: '9500.00', minQty: '10.000', maxQty: '40.000' },
    { name: 'Keyboard', sku: 'KEYB001', catId: catElectronics.id, uom: 'pcs', unitCost: '650.00', minQty: '20.000', maxQty: '80.000' },
    { name: 'Carton Box', sku: 'CBOX01', catId: catPackaging.id, uom: 'pcs', unitCost: '25.00', minQty: '200.000', maxQty: '1000.000' },
    { name: 'Packing Tape', sku: 'TAPE01', catId: catPackaging.id, uom: 'roll', unitCost: '40.00', minQty: '50.000', maxQty: '200.000' },
  ];

  const products = {};
  for (const item of productsData) {
    const p = await prisma.product.create({
      data: {
        name: item.name,
        sku: item.sku,
        categoryId: item.catId,
        uom: item.uom,
        unitCost: item.unitCost,
        reorderRule: {
          create: {
            minQty: item.minQty,
            maxQty: item.maxQty,
          },
        },
      },
    });
    products[item.sku] = p;
  }

  // Helper to record stock movement and update StockQuant synchronously
  async function applyStockMovement({ operationId, productId, fromLocationId, toLocationId, quantity, date }) {
    const qty = Number(quantity);

    // Record immutable ledger entry
    await prisma.stockMove.create({
      data: {
        operationId,
        productId,
        fromLocationId,
        toLocationId,
        quantity: qty,
        createdAt: date || new Date(),
      },
    });

    // Deduct from source if not virtual/vendor
    const fromLoc = await prisma.location.findUnique({ where: { id: fromLocationId } });
    if (fromLoc.type === 'INTERNAL') {
      await prisma.stockQuant.upsert({
        where: { productId_locationId: { productId, locationId: fromLocationId } },
        update: { quantity: { decrement: qty } },
        create: { productId, locationId: fromLocationId, quantity: -qty },
      });
    }

    // Add to dest if internal
    const toLoc = await prisma.location.findUnique({ where: { id: toLocationId } });
    if (toLoc.type === 'INTERNAL') {
      await prisma.stockQuant.upsert({
        where: { productId_locationId: { productId, locationId: toLocationId } },
        update: { quantity: { increment: qty } },
        create: { productId, locationId: toLocationId, quantity: qty },
      });
    }
  }

  // ─── 7. OPERATIONS, STOCK MOVES & BALANCES ───
  console.log('📋 Seeding operations & stock movements...');

  // Operation 1: DONE Receipt WH/IN/0002 (Desk + Table)
  const in0002 = await prisma.operation.create({
    data: {
      reference: 'WH/IN/0002',
      type: 'RECEIPT',
      status: 'DONE',
      contactId: customerAzure.id,
      sourceLocationId: locVendor.id,
      destLocationId: locStock1.id,
      scheduleDate: new Date('2026-09-22T10:00:00Z'),
      responsibleId: manager.id,
      doneAt: new Date('2026-09-22T11:30:00Z'),
      notes: 'Initial opening stock receipt',
      lines: {
        create: [
          { productId: products['DESK001'].id, quantity: '20.000' },
          { productId: products['TABL001'].id, quantity: '10.000' },
        ],
      },
    },
  });
  await applyStockMovement({ operationId: in0002.id, productId: products['DESK001'].id, fromLocationId: locVendor.id, toLocationId: locStock1.id, quantity: 20, date: new Date('2026-09-22T11:30:00Z') });
  await applyStockMovement({ operationId: in0002.id, productId: products['TABL001'].id, fromLocationId: locVendor.id, toLocationId: locStock1.id, quantity: 10, date: new Date('2026-09-22T11:30:00Z') });

  // Operation 2: DONE Receipt WH/IN/0003 (Chairs)
  const in0003 = await prisma.operation.create({
    data: {
      reference: 'WH/IN/0003',
      type: 'RECEIPT',
      status: 'DONE',
      contactId: supplierLumber.id,
      sourceLocationId: locVendor.id,
      destLocationId: locStock1.id,
      scheduleDate: new Date('2026-09-23T09:00:00Z'),
      responsibleId: staff.id,
      doneAt: new Date('2026-09-23T09:45:00Z'),
      notes: 'Standard batch shipment of office chairs',
      lines: {
        create: [{ productId: products['CHAIR01'].id, quantity: '30.000' }],
      },
    },
  });
  await applyStockMovement({ operationId: in0003.id, productId: products['CHAIR01'].id, fromLocationId: locVendor.id, toLocationId: locStock1.id, quantity: 30, date: new Date('2026-09-23T09:45:00Z') });

  // Operation 3: DONE Receipt WH/IN/0004 (Carton Box + Tape)
  const in0004 = await prisma.operation.create({
    data: {
      reference: 'WH/IN/0004',
      type: 'RECEIPT',
      status: 'DONE',
      contactId: supplierReadyMat.id,
      sourceLocationId: locVendor.id,
      destLocationId: locStock1.id,
      scheduleDate: new Date('2026-09-24T11:00:00Z'),
      responsibleId: manager.id,
      doneAt: new Date('2026-09-24T11:40:00Z'),
      notes: 'Packaging restock',
      lines: {
        create: [
          { productId: products['CBOX01'].id, quantity: '120.000' },
          { productId: products['TAPE01'].id, quantity: '40.000' },
        ],
      },
    },
  });
  await applyStockMovement({ operationId: in0004.id, productId: products['CBOX01'].id, fromLocationId: locVendor.id, toLocationId: locStock1.id, quantity: 120, date: new Date('2026-09-24T11:40:00Z') });
  await applyStockMovement({ operationId: in0004.id, productId: products['TAPE01'].id, fromLocationId: locVendor.id, toLocationId: locStock1.id, quantity: 40, date: new Date('2026-09-24T11:40:00Z') });

  // Operation 4: DONE Receipt WH/IN/0006 (Steel Sheet + Steel Rod)
  const in0006 = await prisma.operation.create({
    data: {
      reference: 'WH/IN/0006',
      type: 'RECEIPT',
      status: 'DONE',
      contactId: supplierTata.id,
      sourceLocationId: locVendor.id,
      destLocationId: locStock1.id,
      scheduleDate: new Date('2026-09-24T14:00:00Z'),
      responsibleId: manager.id,
      doneAt: new Date('2026-09-24T14:30:00Z'),
      notes: 'Heavy metal stock arrived',
      lines: {
        create: [
          { productId: products['STSH001'].id, quantity: '100.000' },
          { productId: products['STRD001'].id, quantity: '50.000' },
        ],
      },
    },
  });
  await applyStockMovement({ operationId: in0006.id, productId: products['STSH001'].id, fromLocationId: locVendor.id, toLocationId: locStock1.id, quantity: 100, date: new Date('2026-09-24T14:30:00Z') });
  await applyStockMovement({ operationId: in0006.id, productId: products['STRD001'].id, fromLocationId: locVendor.id, toLocationId: locStock1.id, quantity: 50, date: new Date('2026-09-24T14:30:00Z') });

  // Operation 5: DONE Transfer WH/INT/0001 (Move 30 kg Steel Rod to Production Floor)
  const int0001 = await prisma.operation.create({
    data: {
      reference: 'WH/INT/0001',
      type: 'TRANSFER',
      status: 'DONE',
      sourceLocationId: locStock1.id,
      destLocationId: locProd.id,
      scheduleDate: new Date('2026-09-24T16:00:00Z'),
      responsibleId: staff.id,
      doneAt: new Date('2026-09-24T16:15:00Z'),
      notes: 'Feed production line A',
      lines: {
        create: [{ productId: products['STRD001'].id, quantity: '30.000' }],
      },
    },
  });
  await applyStockMovement({ operationId: int0001.id, productId: products['STRD001'].id, fromLocationId: locStock1.id, toLocationId: locProd.id, quantity: 30, date: new Date('2026-09-24T16:15:00Z') });

  // Operation 6: DONE Adjustment WH/ADJ/0002 (3 kg Steel Rod damaged in production)
  const adj0002 = await prisma.operation.create({
    data: {
      reference: 'WH/ADJ/0002',
      type: 'ADJUSTMENT',
      status: 'DONE',
      sourceLocationId: locProd.id,
      destLocationId: locAdjustment.id,
      scheduleDate: new Date('2026-09-25T11:00:00Z'),
      responsibleId: manager.id,
      doneAt: new Date('2026-09-25T11:10:00Z'),
      notes: 'Damaged during cutting process',
      lines: {
        create: [{ productId: products['STRD001'].id, quantity: '3.000' }],
      },
    },
  });
  await applyStockMovement({ operationId: adj0002.id, productId: products['STRD001'].id, fromLocationId: locProd.id, toLocationId: locAdjustment.id, quantity: 3, date: new Date('2026-09-25T11:10:00Z') });

  // Operation 7: LATE READY Receipt WH/IN/0005 (Scheduled in past)
  await prisma.operation.create({
    data: {
      reference: 'WH/IN/0005',
      type: 'RECEIPT',
      status: 'READY',
      contactId: customerGemini.id,
      sourceLocationId: locVendor.id,
      destLocationId: locStock1.id,
      scheduleDate: new Date('2026-09-24T10:00:00Z'), // Past date => Late!
      responsibleId: manager.id,
      notes: 'Late arriving vendor shipment',
      lines: {
        create: [{ productId: products['DESK001'].id, quantity: '10.000' }],
      },
    },
  });

  // Operation 8: DRAFT Receipt WH/IN/0008 (Future)
  await prisma.operation.create({
    data: {
      reference: 'WH/IN/0008',
      type: 'RECEIPT',
      status: 'DRAFT',
      contactId: supplierLumber.id,
      sourceLocationId: locVendor.id,
      destLocationId: locStock1.id,
      scheduleDate: new Date('2026-09-30T10:00:00Z'),
      responsibleId: staff.id,
      notes: 'Desk lamp bulk order',
      lines: {
        create: [{ productId: products['LAMP001'].id, quantity: '20.000' }],
      },
    },
  });

  // Operation 9: WAITING Delivery WH/OUT/0006 (Stock shortage)
  await prisma.operation.create({
    data: {
      reference: 'WH/OUT/0006',
      type: 'DELIVERY',
      status: 'WAITING',
      contactId: customerGemini.id,
      sourceLocationId: locStock1.id,
      destLocationId: locCustomer.id,
      scheduleDate: new Date('2026-09-26T14:00:00Z'),
      responsibleId: manager.id,
      notes: 'Waiting for Monitor 24" shipment from vendor',
      lines: {
        create: [{ productId: products['MON0024'].id, quantity: '12.000' }],
      },
    },
  });

  // Operation 10: READY Delivery WH/OUT/0005
  await prisma.operation.create({
    data: {
      reference: 'WH/OUT/0005',
      type: 'DELIVERY',
      status: 'READY',
      contactId: customerAzure.id,
      sourceLocationId: locStock1.id,
      destLocationId: locCustomer.id,
      scheduleDate: new Date('2026-09-25T15:00:00Z'), // Late delivery order
      responsibleId: staff.id,
      notes: 'Ready to be packed and dispatched',
      lines: {
        create: [{ productId: products['DESK001'].id, quantity: '5.000' }],
      },
    },
  });

  // ─── 8. REFERENCE SEQUENCES ───
  console.log('🔢 Initializing reference sequences...');
  await prisma.referenceSequence.createMany({
    data: [
      { warehouseId: warehouse.id, type: 'RECEIPT', nextNumber: 9 },
      { warehouseId: warehouse.id, type: 'DELIVERY', nextNumber: 7 },
      { warehouseId: warehouse.id, type: 'TRANSFER', nextNumber: 2 },
      { warehouseId: warehouse.id, type: 'ADJUSTMENT', nextNumber: 3 },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('------------------------------------------------');
  console.log(`Default login:  purvika / ${seedPassword}`);
  console.log(`Staff login:    aman.shaikh / ${seedPassword}`);
  console.log('------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
