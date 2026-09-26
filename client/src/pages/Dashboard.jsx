import AppLayout from "../components/AppLayout";
import StatusPill from "../components/StatusPill";
import Icon from "../icons/Icon";

// Swap these constants for real data (API/state) once the backend is wired up.
const KPIS = [
  { icon: "box", tone: "accent", label: "Products in stock", value: 248, foot: "↑ 12 added this month", footColor: "var(--in)" },
  { icon: "alert", tone: "warn", label: "Low / out of stock", value: 12, foot: "4 out of stock", footColor: "var(--out)" },
  { icon: "down", tone: "in", label: "Pending receipts", value: 8, foot: "2 arriving today", footColor: "var(--muted)" },
  { icon: "up", tone: "out", label: "Pending deliveries", value: 15, foot: "3 waiting for stock", footColor: "var(--warn)" },
  { icon: "swap", tone: "int", label: "Transfers scheduled", value: 5, foot: "Next: tomorrow, 10:00", footColor: "var(--muted)" },
];

const TONE_BG = {
  accent: "var(--accent-soft)", warn: "var(--warn-soft)", in: "var(--in-soft)", out: "var(--out-soft)", int: "var(--int-soft)",
};
const TONE_FG = {
  accent: "var(--accent)", warn: "var(--warn)", in: "var(--in)", out: "var(--out)", int: "var(--int)",
};

const RECENT_OPS = [
  { ref: "WH/IN/0005", dir: "in", type: "Receipt", icon: "down", product: "Desk × 10", route: "Vendor → WH/Stock1", date: "24 Sep", late: true, status: "ready", label: "Ready" },
  { ref: "WH/OUT/0006", dir: "out", type: "Delivery", icon: "up", product: "Monitor 24″ × 12", route: "WH/Stock1 → Customer", date: "26 Sep", late: false, status: "waiting", label: "Waiting" },
  { ref: "WH/INT/0001", dir: "int", type: "Transfer", icon: "swap", product: "Steel Rod × 30 kg", route: "WH/Stock1 → WH/Prod", date: "24 Sep", late: false, status: "done", label: "Done" },
  { ref: "WH/ADJ/0002", dir: "adj", type: "Adjustment", icon: "sliders", product: "Steel Rod −3 kg", route: "WH/Prod", date: "25 Sep", late: false, status: "done", label: "Done" },
  { ref: "WH/OUT/0005", dir: "out", type: "Delivery", icon: "up", product: "Desk × 5", route: "WH/Stock1 → Customer", date: "25 Sep", late: true, status: "ready", label: "Ready" },
];

const LOW_STOCK = [
  { name: "Packing Tape", sku: "TAPE01", onHand: 0, min: 50, status: "out", label: "Out" },
  { name: "Monitor 24″", sku: "MON0024", onHand: 3, min: 10, status: "low", label: "Low" },
  { name: "Table", sku: "TABL001", onHand: 5, min: 15, status: "low", label: "Low" },
  { name: "Keyboard", sku: "KEYB001", onHand: 7, min: 20, status: "low", label: "Low" },
];

export default function Dashboard({ onNavigate, userFirstName = "Purvika" }) {
  return (
    <AppLayout active="dashboard" onNavigate={onNavigate}>
      <div className="ph">
        <div>
          <div className="sub" style={{ margin: "0 0 2px" }}>
            {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <h1>Good morning, {userFirstName}</h1>
        </div>
        <div className="sp" />
        <div className="filters">
          <span className="fsel"><small>Type</small>All documents<Icon name="chev" /></span>
          <span className="fsel"><small>Status</small>Any<Icon name="chev" /></span>
          <span className="fsel"><small>Warehouse</small>WH · Main<Icon name="chev" /></span>
          <span className="fsel"><small>Category</small>All<Icon name="chev" /></span>
        </div>
      </div>

      <div className="kpis">
        {KPIS.map((k) => (
          <div className="kpi" key={k.label}>
            <span className="ic" style={{ background: TONE_BG[k.tone], color: TONE_FG[k.tone] }}>
              <Icon name={k.icon} />
            </span>
            <span className="lbl">{k.label}</span>
            <span className="val num">{k.value}</span>
            <span className="foot" style={{ color: k.footColor }}>{k.foot}</span>
          </div>
        ))}
      </div>

      <div className="opcards">
        <div className="opc">
          <span className="big" style={{ background: "var(--in-soft)", color: "var(--in)" }}>
            <Icon name="down" size={22} />
          </span>
          <div>
            <h3>Receipts</h3>
            <div className="stat">
              <span className="l"><b>1</b>late</span>
              <span><b>6</b>operations</span>
              <span><b>2</b>today</span>
            </div>
          </div>
          <span className="btn pri" onClick={() => onNavigate?.("receipts")}>
            4 to receive<Icon name="right" />
          </span>
        </div>
        <div className="opc">
          <span className="big" style={{ background: "var(--out-soft)", color: "var(--out)" }}>
            <Icon name="up" size={22} />
          </span>
          <div>
            <h3>Deliveries</h3>
            <div className="stat">
              <span className="l"><b>1</b>late</span>
              <span className="w"><b>2</b>waiting</span>
              <span><b>6</b>operations</span>
            </div>
          </div>
          <span className="btn pri" onClick={() => onNavigate?.("deliveries")}>
            4 to deliver<Icon name="right" />
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr 1fr", gap: 14 }}>
        <div className="panel">
          <div className="panel-h">
            <div><h2>Stock movement</h2><small>Units in vs out, last 7 days</small></div>
            <div className="sp" />
            <div className="lg">
              <span><i style={{ background: "#0E9F6E" }} />Receipts</span>
              <span><i style={{ background: "#E0463A" }} />Deliveries</span>
            </div>
          </div>
          <div style={{ padding: "0 10px 8px", color: "var(--muted)", fontSize: 12, textAlign: "center" }}>
            Wire this panel up to a chart library (e.g. Recharts) once real movement data is available.
          </div>
        </div>

        <div className="panel">
          <div className="panel-h"><div><h2>Stock value</h2><small>By category · ₹14.8 L</small></div></div>
          <div style={{ display: "grid", gap: 9, fontSize: 12, fontWeight: 600, padding: "4px 18px 18px" }}>
            {[
              ["Raw material", "#2F5BEA", "38%"],
              ["Furniture", "#0E9F6E", "31%"],
              ["Electronics", "#7657EE", "19%"],
              ["Packaging", "#E8A93A", "12%"],
            ].map(([label, color, pct]) => (
              <div style={{ display: "flex", justifyContent: "space-between" }} key={label}>
                <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: color, marginRight: 7 }} />{label}</span>
                <span className="num">{pct}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-h"><h2>Needs attention</h2><div className="sp" /><span className="link">View all</span></div>
          <div className="al">
            <span className="ic" style={{ background: "var(--out-soft)", color: "var(--out)" }}><Icon name="alert" /></span>
            <div><b>Packing Tape is out <small>now</small></b><p>0 rolls left · reorder at 50</p></div>
          </div>
          <div className="al">
            <span className="ic" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}><Icon name="clock" /></span>
            <div><b>WH/OUT/0006 waiting <small>2 h</small></b><p>Needs 9 more Monitor 24″</p></div>
          </div>
          <div className="al">
            <span className="ic" style={{ background: "var(--in-soft)", color: "var(--in)" }}><Icon name="check" /></span>
            <div><b>WH/IN/0004 received <small>1 d</small></b><p>120 Carton Box, 40 Packing Tape</p></div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.9fr 1fr", gap: 14 }}>
        <div className="panel">
          <div className="panel-h">
            <h2>Recent operations</h2>
            <div className="sp" />
            <span className="link">View all <Icon name="right" size={13} /></span>
          </div>
          <table className="t">
            <thead>
              <tr><th>Reference</th><th>Type</th><th>Product</th><th>From → To</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {RECENT_OPS.map((op) => (
                <tr key={op.ref}>
                  <td><a className="ref mono">{op.ref}</a></td>
                  <td><span className={`dir ${op.dir}`}><Icon name={op.icon} />{op.type}</span></td>
                  <td>{op.product}</td>
                  <td>{op.route}</td>
                  <td className={op.late ? "late num" : "num"}>{op.date}{op.late && (
                    <span style={{ marginLeft: 6, fontSize: "9.5px", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", background: "var(--out-soft)", padding: "2px 5px", borderRadius: 4 }}>Late</span>
                  )}</td>
                  <td><StatusPill status={op.status} label={op.label} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-h"><h2>Low stock</h2><div className="sp" /><span className="link">Reorder</span></div>
          <table className="t">
            <thead><tr><th>Product</th><th className="r">On hand</th><th className="r">Min</th><th></th></tr></thead>
            <tbody>
              {LOW_STOCK.map((p) => (
                <tr key={p.sku}>
                  <td>
                    <div className="pname">
                      <span className="thumb"><Icon name="box" /></span>
                      <div><b>{p.name}</b><small>{p.sku}</small></div>
                    </div>
                  </td>
                  <td className="r num">{p.onHand}</td>
                  <td className="r num">{p.min}</td>
                  <td><StatusPill status={p.status} label={p.label} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
