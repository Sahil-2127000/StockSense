import { Prisma } from '@prisma/client';

// Prisma returns DECIMAL columns as Decimal objects (JSON strings like "85.00").
// Convert them to plain numbers so clients get { "quantity": 85 }.
const serialize = (value) => {
  if (value === null || value === undefined) return value;
  if (Prisma.Decimal.isDecimal(value)) return value.toNumber();
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, serialize(val)]));
  }
  return value;
};

const sendSuccess = (res, data = null, statusCode = 200, meta = undefined) => {
  const responsePayload = {
    success: true,
    data: serialize(data),
  };

  if (meta !== undefined) {
    responsePayload.meta = serialize(meta);
  }

  return res.status(statusCode).json(responsePayload);
};

export { sendSuccess, serialize };
export default sendSuccess;
