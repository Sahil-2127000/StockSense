import prisma from '../../config/db.js';

let n = 0;
const next = () => (n += 1);

export const createWarehouse = async (overrides = {}) => {
  const i = next();
  const shortCode = overrides.shortCode ?? `W${i}`;
  return prisma.warehouse.create({
    data: {
      name: `Warehouse ${i}`,
      shortCode,
      locations: { create: { name: 'Stock', shortCode: 'Stock', fullPath: `${shortCode}/Stock`, type: 'INTERNAL' } },
      ...overrides,
    },
    include: { locations: true },
  });
};

export const createCategory = (name = `Category ${next()}`) => prisma.category.create({ data: { name } });

export const createProduct = async (overrides = {}) => {
  const i = next();
  const categoryId = overrides.categoryId ?? (await createCategory()).id;
  return prisma.product.create({
    data: { name: `Product ${i}`, sku: `SKU-${i}`, uom: 'pcs', unitCost: 10, categoryId, ...overrides },
  });
};

export const createContact = (type = 'SUPPLIER') =>
  prisma.contact.create({ data: { name: `Contact ${next()}`, type } });
