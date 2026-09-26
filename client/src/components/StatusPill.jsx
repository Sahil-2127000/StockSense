import { STATUS, STOCK_STATUS } from '../utils/constants.js';

// Operation status (DRAFT…CANCELLED) or stock status (OK / LOW / OUT)
export default function StatusPill({ status, stock = false }) {
  const meta = (stock ? STOCK_STATUS : STATUS)[status];
  if (!meta) return null;
  return <span className={`pill ${meta.pill}`}>{meta.label}</span>;
}

export function LateTag({ late }) {
  return late ? <span className="late" /> : null;
}
