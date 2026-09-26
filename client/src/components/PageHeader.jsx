export default function PageHeader({ title, sub, children, crumb }) {
  return (
    <div>
      {crumb && <div className="crumb" style={{ marginBottom: 6 }}>{crumb}</div>}
      <div className="ph">
        <div>
          <h1>{title}</h1>
          {sub && <div className="sub">{sub}</div>}
        </div>
        <div className="sp" />
        {children}
      </div>
    </div>
  );
}
