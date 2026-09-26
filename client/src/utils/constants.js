// One source of truth for operation types and statuses used across the UI

export const OPERATION_TYPES = {
  RECEIPT: {
    label: 'Receipt', plural: 'Receipts', path: '/receipts', icon: 'down', tone: 'in',
    contactType: 'SUPPLIER', contactLabel: 'Receive from', needsSource: false, needsDest: true,
    description: 'Goods arriving from vendors. Validating adds the stock.',
  },
  DELIVERY: {
    label: 'Delivery', plural: 'Deliveries', path: '/deliveries', icon: 'up', tone: 'out',
    contactType: 'CUSTOMER', contactLabel: 'Deliver to', needsSource: true, needsDest: false,
    description: 'Goods leaving for customers. Validating removes the stock.',
  },
  TRANSFER: {
    label: 'Internal transfer', plural: 'Internal transfers', path: '/transfers', icon: 'swap', tone: 'int',
    contactType: null, contactLabel: null, needsSource: true, needsDest: true,
    description: 'Moves stock between locations; the total stays the same.',
  },
  ADJUSTMENT: {
    label: 'Adjustment', plural: 'Adjustments', path: '/adjustments', icon: 'sliders', tone: 'adj',
    description: 'Corrects recorded stock to match a physical count.',
  },
};

export const STATUS = {
  DRAFT: { label: 'Draft', pill: 'draft' },
  WAITING: { label: 'Waiting', pill: 'waiting' },
  READY: { label: 'Ready', pill: 'ready' },
  DONE: { label: 'Done', pill: 'done' },
  CANCELLED: { label: 'Cancelled', pill: 'cancel' },
};

export const STOCK_STATUS = {
  OK: { label: 'In stock', pill: 'ok' },
  LOW: { label: 'Low stock', pill: 'low' },
  OUT: { label: 'Out of stock', pill: 'out' },
};

export const OPEN_STATUSES = ['DRAFT', 'WAITING', 'READY'];

export const typeFromPath = (pathname) =>
  Object.entries(OPERATION_TYPES).find(([, meta]) => pathname.startsWith(meta.path))?.[0];

export const operationPath = (operation) => `${OPERATION_TYPES[operation.type].path}/${operation.id}`;

export const PASSWORD_RULES = [
  { key: 'lower', label: 'Lowercase a–z', test: (v) => /[a-z]/.test(v) },
  { key: 'upper', label: 'Uppercase A–Z', test: (v) => /[A-Z]/.test(v) },
  { key: 'special', label: 'Special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
  { key: 'length', label: 'More than 8 characters', test: (v) => v.length > 8 },
];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const LOGIN_ID_RE = /^[A-Za-z0-9_]{6,12}$/;
