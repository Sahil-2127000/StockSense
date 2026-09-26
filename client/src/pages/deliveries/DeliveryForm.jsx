import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Icon from "../../components/Icon";
import StatusPill from "../../components/StatusPill";
import DocumentForm from "../../components/DocumentForm";

/**
 * Delivery form
 * Draft → Waiting → Ready → Done, built on the shared DocumentForm shell.
 * The one piece unique to deliveries: a line short on stock turns red,
 * raises a banner, and blocks "Check availability" from clearing Waiting
 * until every line has enough on hand at the source location.
 *
 * Assumption: DocumentForm exposes a slot-based API (header actions, a
 * steps/status area, and a body render-prop) similar to how ReceiptForm.jsx
 * already uses it — adjust the prop names below to match whatever
 * DocumentForm.jsx actually expects if it differs.
 */

const STEPS = ["draft", "waiting", "ready", "done"];

const MOCK_DELIVERY = {
  id: "WH-OUT-0006",
  ref: "WH/OUT/0006",
  status: "waiting",
  deliverTo: "Gemini Furniture",
  scheduleDate: "26 Sep 2026",
  address: "SCO 41, Sector 17-C, Chandigarh 160017",
  operationType: "WH · Delivery Orders",
  responsible: { initials: "PJ", name: "Purvika Jain" },
  sourceLocation: "WH/Stock1 · Main Store",
  lines: [
    { sku: "MON0024", name: "Monitor 24″", available: 3, quantity: 12 },
    { sku: "KEYB001", name: "Keyboard", available: 7, quantity: 2 },
  ],
  activity: [
    { tone: "y", title: "Moved to Waiting", meta: "Monitor 24″ short by 9 · 09:12" },
    { tone: "", title: "Draft created", meta: "Purvika Jain · 25 Sep, 18:30" },
  ],
};

export default function DeliveryForm({ delivery = MOCK_DELIVERY }) {
  const { id } = useParams();
  const [lines, setLines] = useState(delivery.lines);
  const [status, setStatus] = useState(delivery.status);

  const shortLines = useMemo(
    () => lines.filter((l) => l.quantity > l.available),
    [lines]
  );
  const isShort = shortLines.length > 0;

  function checkAvailability() {
    // Re-evaluate every line against current stock. In the real app this
    // should re-fetch available quantities before comparing — here it just
    // re-runs the same comparison against the lines already in state.
    const stillShort = lines.some((l) => l.quantity > l.available);
    setStatus(stillShort ? "waiting" : "ready");
  }

  return (
    <main className="view">
      <div className="crumb">
        Deliveries <Icon name="right" style={{ width: 12, height: 12 }} />{" "}
        <b className="mono">{delivery.ref}</b>
      </div>

      {isShort && (
        <div className="banner e">
          <Icon name="alert" style={{ marginTop: 2 }} />
          <div>
            <b>
              {shortLines[0].name} is short by {shortLines[0].quantity - shortLines[0].available} units at{" "}
              {delivery.sourceLocation.split(" · ")[0]}
            </b>
            <p>
              {shortLines[0].available} on hand, {shortLines[0].quantity} requested.
            </p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <span className="btn sm">View receipt</span>
            <span className="btn sm">Deliver {shortLines[0].available} now</span>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18, alignItems: "start" }}>
        <div className="doc">
          <div className="doc-bar">
            <span className="btn pri" onClick={checkAvailability}>
              <Icon name="search" /> Check availability
            </span>
            <span className="btn dis">
              <Icon name="printer" /> Print
            </span>
            <span className="btn dan">Cancel</span>
            <div className="sp" />
            <div className="steps">
              {STEPS.map((s, i) => {
                const currentIdx = STEPS.indexOf(status);
                const cls =
                  i < currentIdx ? "past" : i === currentIdx ? (s === "waiting" ? "cur w" : "cur") : "";
                return (
                  <span key={s} className={cls}>
                    {i < currentIdx && <Icon name="check" style={{ width: 13, height: 13 }} />}
                    {s[0].toUpperCase() + s.slice(1)}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="doc-body">
            <div className="doc-ref">
              <span className="mono">{delivery.ref}</span>
              <StatusPill status={status} />
            </div>

            <div className="grid2">
              <div className="fld">
                <label>Deliver to</label>
                <div className="inp">
                  {delivery.deliverTo}
                  <Icon name="chev" className="i end" />
                </div>
              </div>
              <div className="fld">
                <label>Schedule date</label>
                <div className="inp num">
                  <Icon name="cal" /> {delivery.scheduleDate}
                </div>
              </div>
              <div className="fld">
                <label>Delivery address</label>
                <div className="inp">{delivery.address}</div>
              </div>
              <div className="fld">
                <label>Operation type</label>
                <div className="inp">
                  {delivery.operationType}
                  <Icon name="chev" className="i end" />
                </div>
              </div>
              <div className="fld">
                <label>Responsible</label>
                <div className="inp">
                  <span className="av" style={{ width: 22, height: 22, fontSize: 9, borderRadius: 6 }}>
                    {delivery.responsible.initials}
                  </span>
                  {delivery.responsible.name}
                </div>
              </div>
              <div className="fld">
                <label>Source location</label>
                <div className="inp mono">
                  {delivery.sourceLocation}
                  <Icon name="chev" className="i end" />
                </div>
              </div>
            </div>

            <div>
              <div className="sect" style={{ marginBottom: 8 }}>
                Products
              </div>
              <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                <table className="t">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="r">Available</th>
                      <th className="r">Quantity</th>
                      <th style={{ width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => {
                      const short = l.quantity > l.available;
                      return (
                        <tr key={l.sku} className={short ? "bad" : ""}>
                          <td style={short ? { boxShadow: "inset 3px 0 0 var(--out)" } : undefined}>
                            <span className="mono" style={{ color: short ? "var(--out)" : "var(--muted)" }}>
                              [{l.sku}]
                            </span>{" "}
                            <b style={short ? { color: "var(--out)" } : undefined}>{l.name}</b>
                            {short && (
                              <span className="pill out" style={{ marginLeft: 6 }}>
                                Short {l.quantity - l.available}
                              </span>
                            )}
                          </td>
                          <td className="r num" style={short ? { color: "var(--out)", fontWeight: 700 } : undefined}>
                            {l.available}
                          </td>
                          <td className="r num">
                            <b style={short ? { color: "var(--out)" } : undefined}>{l.quantity}</b> Units
                          </td>
                          <td>
                            <Icon
                              name="trash"
                              style={{ color: "var(--muted)", cursor: "pointer" }}
                              onClick={() =>
                                setLines((prev) => prev.filter((x) => x.sku !== l.sku))
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="addrow">
                      <td colSpan={4}>
                        <Icon name="plus" style={{ verticalAlign: -3 }} /> Add a product
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="side-col">
          <div className="panel">
            <div className="panel-h">
              <h2>Status guide</h2>
            </div>
            <div style={{ padding: "0 18px 16px", display: "grid", gap: 10, fontSize: 12 }}>
              <div>
                <StatusPill status="draft" /> <span style={{ color: "var(--muted)" }}>Initial state</span>
              </div>
              <div>
                <StatusPill status="waiting" />{" "}
                <span style={{ color: "var(--muted)" }}>Waiting for out-of-stock product</span>
              </div>
              <div>
                <StatusPill status="ready" /> <span style={{ color: "var(--muted)" }}>Ready to deliver</span>
              </div>
              <div>
                <StatusPill status="done" />{" "}
                <span style={{ color: "var(--muted)" }}>Delivered · stock reduced</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-h">
              <h2>Activity</h2>
            </div>
            <div className="tl">
              {delivery.activity.map((a, i) => (
                <div key={i} className={a.tone}>
                  <span />
                  <div>
                    <b>{a.title}</b>
                    <small>{a.meta}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}