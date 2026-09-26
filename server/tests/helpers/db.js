import prisma from '../../config/db.js';

// Children before parents, so foreign keys never block a delete.
// (Toggling FOREIGN_KEY_CHECKS is unreliable: it is per-connection and Prisma uses a pool.)
const MODELS = [
  'stockMove',
  'stockQuant',
  'operationLine',
  'operation',
  'referenceSequence',
  'reorderRule',
  'product',
  'category',
  'contact',
  'location',
  'warehouse',
  'otpCode',
  'user',
];

export const resetDatabase = async () => {
  await prisma.$transaction(MODELS.map((model) => prisma[model].deleteMany()));
};

export default prisma;
