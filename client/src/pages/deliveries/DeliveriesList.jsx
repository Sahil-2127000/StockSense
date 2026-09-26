import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../../components/Icon";
import StatusPill from "../../components/StatusPill";

/**
 * Deliveries — list view
 * Mirrors ReceiptsList.jsx: same filters row, search, list/kanban toggle,
 * and table shell — swapped for delivery-specific columns (Waiting status,
 * short-stock inline note on the Products cell).
 *
 * Status keys are lowercase to match StatusPill's LABELS map:
 * draft | waiting | ready | done | cancel
 *
 * Assumption: deliveries come from a real data source shaped like the mock
 * rows below — { id, ref, from, to, contact, products, shortBy,
 * scheduleDate, isToday, isLate, status }. Swap MOCK_DELIVERIES out; the
 * filtering/search/table logic works off that same shape either way.
 */

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "waiting", label: "Waiting" },
  { key: "ready", label: "Ready" },
  { key: "done", label: "Done" },
  { key: "cancel", label: "Cancelled" },
];

const MOCK_DELIVERIES = [
  { id: "WH-OUT-0010", ref: "WH/OUT/0010", from: "WH/Stock1", to: "Customer", contact: "Ready Mat", products: "Desk Lamp × 2", scheduleDate: "1 Oct 2026", status: "draft" },
  { id: "WH-OUT-0009", ref: "WH/OUT/0009", from: "WH/Stock1", to: "Customer", contact: "Lumber Inc", products: "Keyboard × 5", scheduleDate: "29 Sep 2026", status: "ready" },
  { id: "WH-OUT-0008", ref: "WH/OUT/0008", from: "WH/Stock1", to: "Customer", contact: "Azure Interior", products: "Table × 4", scheduleDate: "28 Sep 2026", status: "ready" },
  { id: "WH-OUT-0007", ref: "WH/OUT/0007", from: "WH/Stock1", to: "Customer", contact: "Deco Addict", products: "Office Chair × 35", shortBy: 27, scheduleDate: "27 Sep 2026", status: "waiting" },
  { id: "WH-OUT-0006", ref: "WH/OUT/0006", from: "WH/Stock1", to: "Customer", contact: "Gemini Furniture", products: "Monitor 24″ × 12", shortBy: 9, scheduleDate: "Today", isToday: true, status: "waiting" },
  { id: "WH-OUT-0005", ref: "WH/OUT/0005", from: "WH/Stock1", to: "Customer", contact: "Azure Interior", products: "Desk × 5", scheduleDate: "25 Sep 2026", isLate: true, status: "ready" },
  { id: "WH-OUT-0004", ref: "WH/OUT/0004", from: "WH/Stock1", to: "Customer", contact: "Deco Addict", products: "Table × 8", scheduleDate: "25 Sep 2026", status: "done" },
  { id: "WH-OUT-0003", ref: "WH/OUT/0003", from: "WH/Stock1", to: "Customer", contact: "Gemini Furniture", products: "Steel Rod × 20 kg", scheduleDate: "23 Sep 2026", status: "done" },
];

export default function DeliveriesList({ deliveries = MOCK_DELIVERIES }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c = { all: deliveries.length };
    STATUS_FILTERS.slice(1).forEach(({ key }) => {
      c[key] = deliveries.filter((d) => d.status === key).length;
    });
    return c;
  }, [deliveries]);

  const rows = useMemo(() => {
    return deliveries.filter((d) => {
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q || d.ref.toLowerCase().includes(q) || d.contact.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [deliveries, statusFilter, query]);

  return (
    <main className="view">
      <div className="ph">
        <button className="btn pri" onClick={() => navigate("/operations/deliveries/new")}>
          <Icon name="plus" /> New
        </button>
        <div>
          <h1>Deliveries</h1>
        </div>
        <div className="sp" />
        <div className="search" style={{ maxWidth: 300, height: 36, background: "#fff" }}>
          <Icon name="search" />
          <input
            className="ph-txt"
            style={{ border: 0, background: "transparent", outline: "none", width: "100%" }}
            placeholder="Reference or contact"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="seg">
          <span className="on">
            <Icon name="list" />
          </span>
          <Link to="/operations/deliveries?view=kanban" style={{ display: "contents" }}>
            <span>
              <Icon name="kanban" />
            </span>
          </Link>
        </div>
      </div>

      <div className="filters">
        {STATUS_FILTERS.map(({ key, label }) => (
          <span
            key={key}
            className={`chip ${statusFilter === key ? "on" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter(key)}
          >
            {label} <b>{counts[key] ?? 0}</b>
          </span>
        ))}
      </div>

      <div className="panel">
        <table className="t">
          <thead>
            <tr>
              <th>Reference</th>
              <th>From</th>
              <th>To</th>
              <th>Contact</th>
              <th>Products</th>
              <th>Schedule date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className={d.shortBy ? "bad" : ""}>
                <td>
                  <Link className="ref mono" to={`/operations/deliveries/${d.id}`}>
                    {d.ref}
                  </Link>
                </td>
                <td className="mono">{d.from}</td>
                <td>{d.to}</td>
                <td>{d.contact}</td>
                <td>
                  {d.products}
                  {d.shortBy ? <span className="help e"> · short {d.shortBy}</span> : null}
                </td>
                <td className={d.isLate ? "late num" : "num"}>
                  {d.isToday ? <b>Today</b> : d.scheduleDate}
                </td>
                <td>
                  <StatusPill status={d.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>
                  No deliveries match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}