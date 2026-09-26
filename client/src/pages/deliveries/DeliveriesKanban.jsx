import { useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/Icon";
import StatusPill from "../../components/StatusPill";

/**
 * Deliveries — kanban view
 * Same records as DeliveriesList.jsx, grouped into columns by status.
 * Deliveries get 5 columns (Draft/Waiting/Ready/Done/Cancelled) — one more
 * than the Receipts kanban, since Waiting only applies to deliveries
 * (short-stock at the source location).
 *
 * Reuses the same MOCK_DELIVERIES shape as DeliveriesList.jsx. In the real
 * app, both views should read from the same data source/hook so switching
 * list ↔ kanban doesn't refetch or drift.
 */

const COLUMNS = [
  { key: "draft", label: "Draft" },
  { key: "waiting", label: "Waiting" },
  { key: "ready", label: "Ready" },
  { key: "done", label: "Done" },
  { key: "cancel", label: "Cancelled" },
];

const MOCK_DELIVERIES = [
  { id: "WH-OUT-0010", ref: "WH/OUT/0010", to: "WH/Stock1", contact: "Ready Mat", products: "Desk Lamp × 2", scheduleDate: "1 Oct", status: "draft" },
  { id: "WH-OUT-0009", ref: "WH/OUT/0009", to: "WH/Stock1", contact: "Lumber Inc", products: "Keyboard × 5", scheduleDate: "29 Sep", status: "ready" },
  { id: "WH-OUT-0008", ref: "WH/OUT/0008", to: "WH/Stock1", contact: "Azure Interior", products: "Table × 4", scheduleDate: "28 Sep", status: "ready" },
  { id: "WH-OUT-0007", ref: "WH/OUT/0007", to: "WH/Stock1", contact: "Deco Addict", products: "Office Chair × 35", shortBy: 27, scheduleDate: "27 Sep", status: "waiting" },
  { id: "WH-OUT-0006", ref: "WH/OUT/0006", to: "WH/Stock1", contact: "Gemini Furniture", products: "Monitor 24″ × 12", shortBy: 9, scheduleDate: "Today", isToday: true, status: "waiting" },
  { id: "WH-OUT-0005", ref: "WH/OUT/0005", to: "WH/Stock1", contact: "Azure Interior", products: "Desk × 5", scheduleDate: "25 Sep", isLate: true, status: "ready" },
  { id: "WH-OUT-0004", ref: "WH/OUT/0004", to: "WH/Stock1", contact: "Deco Addict", products: "Table × 8", scheduleDate: "25 Sep", status: "done" },
  { id: "WH-OUT-0003", ref: "WH/OUT/0003", to: "WH/Stock1", contact: "Gemini Furniture", products: "Steel Rod × 20 kg", scheduleDate: "23 Sep", status: "done" },
];

export default function DeliveriesKanban({ deliveries = MOCK_DELIVERIES }) {
  const byStatus = useMemo(() => {
    const groups = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
    deliveries.forEach((d) => {
      (groups[d.status] ??= []).push(d);
    });
    return groups;
  }, [deliveries]);

  return (
    <main className="view">
      <div className="ph">
        <span className="btn pri">
          <Icon name="plus" /> New
        </span>
        <div>
          <h1>Deliveries</h1>
        </div>
        <div className="sp" />
        <div className="search" style={{ maxWidth: 300, height: 36, background: "#fff" }}>
          <Icon name="search" />
          <span className="ph-txt">Reference or contact</span>
        </div>
        <div className="seg">
          <Link to="/operations/deliveries" style={{ display: "contents" }}>
            <span>
              <Icon name="list" />
            </span>
          </Link>
          <span className="on">
            <Icon name="kanban" />
          </span>
        </div>
      </div>

      <div className="kb">
        {COLUMNS.map(({ key, label }) => {
          const cards = byStatus[key] ?? [];
          return (
            <div className="kcol" key={key}>
              <h4>
                <StatusPill status={key} />
                <em>{cards.length}</em>
              </h4>

              {cards.map((d) => (
                <Link
                  key={d.id}
                  to={`/operations/deliveries/${d.id}`}
                  className="kc"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="top2">
                    <span className="mono">{d.ref}</span>
                    {d.isLate ? (
                      <span className="late" style={{ fontSize: 11 }}>
                        {d.scheduleDate}
                      </span>
                    ) : d.isToday ? (
                      <span style={{ fontSize: 11, fontWeight: 700 }}>Today</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{d.scheduleDate}</span>
                    )}
                  </div>
                  <div className="who2">{d.contact}</div>
                  <div className="items">
                    {d.products}
                    {d.shortBy ? <span className="help e"> · short {d.shortBy}</span> : null}
                  </div>
                  <div className="meta">
                    <span>{d.to}</span>
                  </div>
                </Link>
              ))}

              {cards.length === 0 && key === "cancel" && (
                <div
                  style={{
                    border: "1.5px dashed #CCD4E2",
                    borderRadius: 11,
                    padding: "22px 12px",
                    textAlign: "center",
                    color: "var(--muted)",
                    fontSize: 12,
                  }}
                >
                  Drop a delivery here to cancel it
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}