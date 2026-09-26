const qtyFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 });
const moneyFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const moneyShort = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const formatQty = (value, uom) => {
  if (value === null || value === undefined || value === '') return '—';
  const text = qtyFormat.format(Number(value));
  return uom ? `${text} ${uom}` : text;
};

export const formatMoney = (value, { short = false } = {}) =>
  value === null || value === undefined ? '—' : (short ? moneyShort : moneyFormat).format(Number(value));

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// "Today", "Tomorrow", "Yesterday" or "24 Sep 2026"
export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

// Value for <input type="date"> in local time
export const toDateInput = (value) => {
  const d = value ? new Date(value) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Date input (YYYY-MM-DD) → ISO string at 10:00 local, so "today" is never before midnight
export const fromDateInput = (value) => (value ? new Date(`${value}T10:00:00`).toISOString() : undefined);

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};
