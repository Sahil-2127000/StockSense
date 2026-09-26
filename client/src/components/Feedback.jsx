import Icon from './Icon.jsx';

export function Spinner({ large = false }) {
  return <span className={`spinner${large ? ' lg' : ''}`} role="status" aria-label="Loading" />;
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading-block">
      <Spinner large />
      <span>{label}</span>
    </div>
  );
}

export function Empty({ icon = 'box', title, children, action }) {
  return (
    <div className="empty">
      <span className="ic"><Icon name={icon} /></span>
      <b>{title}</b>
      {children && <span>{children}</span>}
      {action}
    </div>
  );
}

// Error banner for a failed load, with retry
export function ErrorState({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="banner e" role="alert">
      <Icon name="alert" className="i ic" />
      <div style={{ flex: 1 }}>
        <b>Something went wrong</b>
        <p>{error.message}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn sm" onClick={() => onRetry()}>
          <Icon name="refresh" /> Retry
        </button>
      )}
    </div>
  );
}

// Banner for a failed submit (message + any errors that do not belong to a visible field)
export function FormError({ error, fields = [] }) {
  if (!error) return null;
  const extra = (error.errors || []).filter((e) => !fields.includes(e.field));
  return (
    <div className="banner e" role="alert">
      <Icon name="alert" className="i ic" />
      <div>
        <b>{error.message}</b>
        {extra.map((e) => (
          <p key={e.field + e.message}>{e.message}</p>
        ))}
      </div>
    </div>
  );
}
