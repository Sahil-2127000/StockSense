import Icon from '../../components/Icon.jsx';

// Left: brand panel with a sample ledger (from the design). Right: the form.
export default function AuthShell({ children }) {
  return (
    <div className="auth" style={{ minHeight: '100vh' }}>
      <div className="auth-art">
        <div className="logo" style={{ padding: 0 }}>
          <Icon name="cube" style={{ width: 30, height: 30 }} />
          <div>
            <b>StockSense</b>
            <small>Inventory &amp; warehouse</small>
          </div>
        </div>
        <h2>
          Every unit, every rack, <em>in one live ledger.</em>
        </h2>
        <p>Receipts, deliveries, transfers and adjustments in one place. No registers, no stray spreadsheets.</p>
        <div className="ledger" aria-hidden="true">
          <div><span className="mono">WH/IN/0006</span><span>Steel Rod · Tata Steel Traders</span><span className="p">+50</span></div>
          <div><span className="mono">WH/OUT/0001</span><span>Office Chair · Azure Interior</span><span className="m">−10</span></div>
          <div><span className="mono">WH/INT/0001</span><span>Steel Rod · Stock1 → Prod</span><span>30</span></div>
          <div><span className="mono">WH/ADJ/0001</span><span>Steel Rod · damaged</span><span className="m">−3</span></div>
        </div>
      </div>
      <div className="auth-form">
        <div className="af">
          <div className="brand-sm">
            <Icon name="cube" style={{ width: 26, height: 26 }} /> StockSense
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function RuleList({ rules, value }) {
  return (
    <div className="rules" aria-label="Password rules">
      {rules.map((rule) => {
        const ok = rule.test(value);
        return (
          <span key={rule.key} className={value ? (ok ? 'y' : 'n') : undefined}>
            <Icon name={ok ? 'check' : 'x'} /> {rule.label}
          </span>
        );
      })}
    </div>
  );
}
