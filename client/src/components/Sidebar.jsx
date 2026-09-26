import Icon from "../icons/Icon";

// `active` should match one of the item keys below (e.g. "dashboard", "products").
// This component is shared with your teammate's screens too — keep it in one place.
const NAV = [
  { section: "Overview" },
  { key: "dashboard", icon: "home", label: "Dashboard" },
  { section: "Inventory" },
  { key: "products", icon: "box", label: "Products" },
  { key: "stock", icon: "layers", label: "Stock" },
  { section: "Operations" },
  { key: "receipts", icon: "down", label: "Receipts", count: 4 },
  { key: "deliveries", icon: "up", label: "Deliveries", count: 6 },
  { key: "transfers", icon: "swap", label: "Internal transfers" },
  { key: "adjust", icon: "sliders", label: "Adjustments" },
  { key: "moves", icon: "clock", label: "Move history" },
  { section: "Settings" },
  { key: "warehouses", icon: "box", label: "Warehouses" },
  { key: "locations", icon: "box", label: "Locations" },
];

export default function Sidebar({ active, onNavigate, user = { name: "Purvika Jain", role: "Inventory Manager", initials: "PJ" } }) {
  return (
    <aside className="side">
      <div className="logo">
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#5C84FF,#2F5BEA)" }} />
        <div>
          <b>StockSense</b>
          <small>Inventory &amp; warehouse</small>
        </div>
      </div>

      {NAV.map((item, i) =>
        item.section ? (
          <h6 key={`s${i}`}>{item.section}</h6>
        ) : (
          <a
            key={item.key}
            className={active === item.key ? "on" : ""}
            onClick={() => onNavigate?.(item.key)}
          >
            <Icon name={item.icon} />
            {item.label}
            {item.count != null && <span className="cnt">{item.count}</span>}
          </a>
        )
      )}

      <div className="grow" />

      <div className="me">
        <div className="row">
          <span className="av">{user.initials}</span>
          <div>
            <b>{user.name}</b>
            <small>{user.role}</small>
          </div>
        </div>
        <div className="acts">
          <span onClick={() => onNavigate?.("profile")}>
            <Icon name="user" size={14} />My profile
          </span>
          <span onClick={() => onNavigate?.("logout")}>
            <Icon name="logout" size={14} />Log out
          </span>
        </div>
      </div>
    </aside>
  );
}
