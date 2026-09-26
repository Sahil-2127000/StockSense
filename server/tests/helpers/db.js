import prisma from '../../src/config/db.js';

// Child tables first; table names are constants, never user input
const TABLES = [
  'stock_moves',
  'stock_quants',
  'operation_lines',
  'operations',
  'reference_sequences',
  'reorder_rules',
  'products',
  'categories',
  'contacts',
  'locations',
  'warehouses',
  'otp_codes',
  'users',
];

export const resetDatabase = async () => {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TABLES) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
  }
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
};

export default prisma;
