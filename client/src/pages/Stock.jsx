import { useState } from "react";
import AppLayout from "../components/AppLayout";
import Icon from "../icons/Icon";

const INITIAL_STOCK = [
  { sku: "DESK001", name: "Desk", icon: "box", unitCost: "₹3,000", onHand: 30, free: 25, locations: [{ tag: "Stock1", qty: 24 }, { tag: "Stock2", qty: 6 }], value: 90000 },
  { sku: "TABL001", name: "Table", icon: "box", unitCost: "₹3,000", onHand: 5, free: 1, locations: [{ tag: "Stock1", qty: 5 }], value: 24000, recorded: 5 },
  { sku: "CHAIR01", name: "Office Chair", icon: "box", unitCost: "₹1,200", onHand: 18, free: 18, locations: [{ tag: "Stock1", qty: 8 }, { tag: "Stock2", qty: 4 }, { tag: "BR", qty: 6 }], value: 21600 },
  { sku: "STRD001", name: "Steel Rod", icon: "layers", unitCost: "₹85 / kg", onHand: 47, free: 47, locations: [{ tag: "Stock1", qty: 20 }, { tag: "Prod", qty: 27 }], value: 3995 },
  { sku: "MON0024", name: "Monitor 24″", icon: "box", unitCost: "₹9,500", onHand: 3, free: 3, locations: [{ tag: "Stock1", qty: 3 }], value: 28500 },
  { sku: "CBOX01", name: "Carton Box", icon: "box", unitCost: "₹25", onHand: 600, free: 600, locations: [{ tag: "Stock1", qty: 420 }, { tag: "Stock2", qty: 180 }], value: 15000 },
];

export default function Stock({ onNavigate }) {
  const [rows, setRows] = useState(INITIAL_STOCK);
  const [editingSku, setEditingSku] = useState(null);
  const [countValue, setCountValue] = useState("");
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState("");

  function startEdit(row) {
    setEditingSku(row.sku);
    setCountValue(String(row.onHand));
  }

  function cancelEdit() {
    setEditingSku(null);
    setCountValue("");
  }

  function saveCount(row) {
    const counted = Number(countValue);
    if (Number.isNaN(counted)) return;
    const delta = counted - row.onHand;

    setRows((prev) => prev.map((r) => (r.sku === row.sku ? { ...r, onHand: counted, recorded: undefined } : r)));
    setEditingSku(null);

    if (delta !== 0) {
      // In the real app: POST an adjustment (WH/ADJ/xxxx) here, then refresh.
      const ref = `WH/ADJ/${String(Math.floor(Math.random() * 900) + 100)}`;
      setToast(`Saved · ${ref} logged for ${row.name} (${delta > 0 ? "+" : ""}${delta})`);
      setTimeout(() => setToast(null), 4000);
    }
  }

  const filtered = rows.filter((r) => !query || r.name.toLowerCase().includes(query.toLowerCase()) || r.sku.toLowerCase().includes(query.toLowerCase()));

  return (
    <AppLayout active="stock" onNavigate={onNavigate}>
      <div className="ph">
        <div>
          <h1>Stock</h1>
          <div className="sub">Main Warehouse · valued at ₹14,82,450</div>
        </div>
        <div className="sp" />
        <div className="search" style={{ maxWidth: 280, height: 36, background: "#fff" }}>
          <Icon name="search" />
          <input
            style={{ border: "none", outline: "none", background: "none", font: "inherit", color: "inherit", width: "100%" }}
            placeholder="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span className="fsel" style={{ height: 36 }}><small>Location</small>All<Icon name="chev" /></span>
      </div>

      <div className="panel">
        <table className="t">
          <thead>
            <tr><th>Product</th><th className="r">Per unit cost</th><th className="r">On hand</th><th className="r">Free to use</th><th>By location</th><th className="r">Value</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const editing = editingSku === row.sku;
              const delta = editing ? Number(countValue) - row.onHand : 0;
              return (
                <tr key={row.sku} className={editing ? "hl" : ""}>
                  <td>
                    <div className="pname">
                      <span className="thumb"><Icon name={row.icon} /></span>
                      <div><b>{row.name}</b><small>{row.sku}</small></div>
                    </div>
                  </td>
                  <td className="r num">{row.unitCost}</td>
                  <td className="r">
                    {editing ? (
                      <input
                        autoFocus
                        className="inp focus num"
                        style={{ height: 32, width: 84, marginLeft: "auto", textAlign: "right" }}
                        value={countValue}
                        onChange={(e) => setCountValue(e.target.value.replace(/[^\d-]/g, ""))}
                      />
                    ) : (
                      <b className="num">{row.onHand}</b>
                    )}
                  </td>
                  <td className="r num">{row.free}</td>
                  <td>
                    {editing ? (
                      <span className="help">
                        Recorded {row.onHand} · counted {countValue || 0} ·{" "}
                        <b className={delta >= 0 ? "qin" : "qout"}>{delta > 0 ? "+" : ""}{delta}</b>
                      </span>
                    ) : (
                      row.locations.map((loc) => (
                        <span className="chip" style={{ height: 24 }} key={loc.tag}>
                          <span className="mono">{loc.tag}</span> {loc.qty}
                        </span>
                      ))
                    )}
                  </td>
                  <td className="r num">₹{row.value.toLocaleString("en-IN")}</td>
                  <td className="r" style={{ whiteSpace: "nowrap" }}>
                    {editing ? (
                      <>
                        <span className="btn sm pri" onClick={() => saveCount(row)}>Save</span>{" "}
                        <span className="btn sm ghost" onClick={cancelEdit}>Cancel</span>
                      </>
                    ) : (
                      <span className="btn sm" onClick={() => startEdit(row)}>
                        <Icon name="edit" />Update
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {toast && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div className="toast"><Icon name="check" />{toast}</div>
        </div>
      )}
    </AppLayout>
  );
}
