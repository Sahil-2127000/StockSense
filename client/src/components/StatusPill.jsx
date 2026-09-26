// Shared across the whole app — Draft/Waiting/Ready/Done/Canceled for documents,
// and In stock/Low stock/Out of stock for products.
// Usage: <StatusPill status="waiting" label="Waiting" />
export default function StatusPill({ status, label }) {
  return <span className={`pill ${status}`}>{label}</span>;
}
