import { useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import StatusPill from "../components/StatusPill";
import Icon from "../icons/Icon";

// Replace with a real fetch from your API. Keep the shape the same and every
// screen below keeps working.
const PRODUCTS = [
  { sku: "DESK001", name: "Desk", icon: "box", category: "Furniture", uom: "Units", unitCost: 3000, onHand: 30, free: 25, status: "ok", label: "In stock",
    locations: [{ name: "WH/Prod · Production Floor", qty: 27, pct: 57 }, { name: "WH/Stock1 · Main Store", qty: 20, pct: 43 }],
    reorder: { min: 50, max: 200 } },
  { sku: "TABL001", name: "Table", icon: "box", category: "Furniture", uom: "Units", unitCost: 3000, onHand: 5, free: 1, status: "low", label: "Low stock",
    locations: [{ name: "WH/Stock1 · Main Store", qty: 5, pct: 100 }], reorder: { min: 15, max: 60 } },
  { sku: "STRD001", name: "Steel Rod", icon: "layers", category: "Raw material", uom: "kg", unitCost: 85, onHand: 47, free: 47, status: "low", label: "Low stock",
    locations: [{ name: "WH/Prod · Production Floor", qty: 27, pct: 57 }, { name: "WH/Stock1 · Main Store", qty: 20, pct: 43 }, { name: "BR/Stock1 · Branch Store", qty: 0, pct: 0 }],
    reorder: { min: 50, max: 200 } },
  { sku: "STSH001", name: "Steel Sheet", icon: "layers", category: "Raw material", uom: "kg", unitCost: 120, onHand: 60, free: 60, status: "ok", label: "In stock",
    locations: [{ name: "WH/Stock1 · Main Store", qty: 60, pct: 100 }], reorder: { min: 30, max: 120 } },
  { sku: "CHAIR01", name: "Office Chair", icon: "box", category: "Furniture", uom: "Units", unitCost: 1200, onHand: 18, free: 18, status: "low", label: "Low stock",
    locations: [{ name: "WH/Stock1 · Main Store", qty: 18, pct: 100 }], reorder: { min: 20, max: 80 } },
  { sku: "MON0024", name: "Monitor 24″", icon: "box", category: "Electronics", uom: "Units", unitCost: 9500, onHand: 3, free: 3, status: "low", label: "Low stock",
    locations: [{ name: "WH/Stock1 · Main Store", qty: 3, pct: 100 }], reorder: { min: 10, max: 40 } },
  { sku: "CBOX01", name: "Carton Box", icon: "box", category: "Packaging", uom: "Units", unitCost: 25, onHand: 600, free: 600, status: "ok", label: "In stock",
    locations: [{ name: "WH/Stock1 · Main Store", qty: 420, pct: 70 }, { name: "WH/Stock2", qty: 180, pct: 30 }], reorder: { min: 200, max: 800 } },
  { sku: "TAPE01", name: "Packing Tape", icon: "box", category: "Packaging", uom: "Rolls", unitCost: 40, onHand: 0, free: 0, status: "out", label: "Out of stock",
    locations: [{ name: "WH/Stock1 · Main Store", qty: 0, pct: 0 }], reorder: { min: 50, max: 250 } },
];

const CATEGORIES = ["All", "Raw material", "Furniture", "Electronics", "Packaging"];

export default function Products({ onNavigate }) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedSku, setSelectedSku] = useState(PRODUCTS[2].sku); // Steel Rod selected, matching the mockup

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchesCategory = category === "All" || p.category === category;
      const matchesQuery = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const selected = PRODUCTS.find((p) => p.sku === selectedSku);
  const countFor = (cat) => (cat === "All" ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === cat).length);

  return (
    <AppLayout active="products" onNavigate={onNavigate}>
      <div className="ph">
        <div>
          <h1>Products</h1>
          <div className="sub">{PRODUCTS.length} products · {CATEGORIES.length - 1} categories</div>
        </div>
        <div className="sp" />
        <span className="btn">Categories</span>
        <span className="btn pri"><Icon name="plus" />New product</span>
      </div>

      <div className="filters">
        {CATEGORIES.map((cat) => (
          <span key={cat} className={`chip ${category === cat ? "on" : ""}`} onClick={() => setCategory(cat)}>
            {cat} <b>{countFor(cat)}</b>
          </span>
        ))}
        <div style={{ flex: 1 }} />
        <div className="search" style={{ maxWidth: 280, height: 34, background: "#fff" }}>
          <Icon name="search" />
          <input
            className="ph-txt"
            style={{ border: "none", outline: "none", background: "none", font: "inherit", color: "inherit", width: "100%" }}
            placeholder="Search name or SKU"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="split">
        <div className="panel">
          <table className="t">
            <thead>
              <tr><th>Product</th><th>Category</th><th>UoM</th><th className="r">Unit cost</th><th className="r">On hand</th><th className="r">Free</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.sku} className={p.sku === selectedSku ? "hl" : ""} onClick={() => setSelectedSku(p.sku)} style={{ cursor: "pointer" }}>
                  <td>
                    <div className="pname">
                      <span className="thumb" style={p.icon === "layers" ? { background: "var(--accent-soft)", color: "var(--accent)" } : undefined}>
                        <Icon name={p.icon} />
                      </span>
                      <div><b>{p.name}</b><small>{p.sku}</small></div>
                    </div>
                  </td>
                  <td>{p.category}</td>
                  <td>{p.uom}</td>
                  <td className="r num">₹{p.unitCost.toLocaleString("en-IN")}</td>
                  <td className="r num">{p.onHand}</td>
                  <td className="r num">{p.free}</td>
                  <td><StatusPill status={p.status} label={p.label} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <aside className="drawer">
            <div className="drawer-h">
              <span className="thumb" style={{ width: 40, height: 40, background: "var(--accent-soft)", color: "var(--accent)" }}>
                <Icon name={selected.icon} size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 15 }}>{selected.name}</b>
                <div className="mono" style={{ color: "var(--muted)" }}>{selected.sku} · {selected.uom}</div>
              </div>
              <Icon name="x" style={{ color: "var(--muted)", cursor: "pointer" }} />
            </div>
            <div className="drawer-b">
              <div className="grid2" style={{ gap: 12 }}>
                <div className="fld"><label>Category</label><div className="inp">{selected.category}<Icon name="chev" className="i end" /></div></div>
                <div className="fld"><label>Unit of measure</label><div className="inp">{selected.uom}<Icon name="chev" className="i end" /></div></div>
                <div className="fld"><label>Unit cost</label><div className="inp num">₹ {selected.unitCost.toFixed(2)}</div></div>
                <div className="fld"><label>SKU / Code</label><div className="inp mono">{selected.sku}</div></div>
              </div>

              <div className="sect">Stock by location</div>
              {selected.locations.map((loc) => (
                <div className="locbar" key={loc.name}>
                  <div className="l">
                    <span style={loc.qty === 0 ? { color: "var(--muted)" } : undefined}>{loc.name}</span>
                    <span className="num" style={loc.qty === 0 ? { color: "var(--muted)" } : undefined}>{loc.qty} {selected.uom === "Units" ? "" : selected.uom}</span>
                  </div>
                  <div className="track"><i style={{ width: `${loc.pct}%` }} /></div>
                </div>
              ))}

              <div className="sect">Reordering rule</div>
              <div className="rule">
                <div><small>Minimum</small><b className="num">{selected.reorder.min}</b> {selected.uom === "Units" ? "" : selected.uom}</div>
                <div><small>Reorder up to</small><b className="num">{selected.reorder.max}</b> {selected.uom === "Units" ? "" : selected.uom}</div>
              </div>

              {selected.onHand < selected.reorder.min && (
                <div className="banner e" style={{ padding: "10px 12px" }}>
                  <Icon name="alert" />
                  <div>
                    <b>{selected.reorder.min - selected.onHand} {selected.uom === "Units" ? "units" : selected.uom} below minimum</b>
                    <p>Suggested receipt: {selected.reorder.max - selected.onHand} {selected.uom === "Units" ? "units" : selected.uom} from your usual supplier.</p>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <span className="btn pri" style={{ flex: 1, justifyContent: "center" }}>Save changes</span>
                <span className="btn" onClick={() => onNavigate?.("receipts")}>Create receipt</span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </AppLayout>
  );
}
