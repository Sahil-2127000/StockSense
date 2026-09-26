import { Empty, Loading } from './Feedback.jsx';
import Icon from './Icon.jsx';

/**
 * columns: [{ key, label, render?(row), align?: 'right', className? }]
 * Rows are clickable (and keyboard accessible) when onRowClick is given.
 */
export default function DataTable({ columns, rows, loading, onRowClick, rowClass, empty, keyOf = (r) => r.id }) {
  if (loading && !rows) return <Loading />;
  if (rows && rows.length === 0) return empty ?? <Empty title="Nothing here yet" />;

  return (
    <div className="table-wrap" style={loading ? { opacity: 0.6 } : undefined}>
      <table className="t">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align === 'right' ? 'r' : undefined}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((row) => (
            <tr
              key={keyOf(row)}
              className={[onRowClick && 'click', rowClass?.(row)].filter(Boolean).join(' ') || undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={[c.align === 'right' && 'r', c.className].filter(Boolean).join(' ') || undefined}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) {
    return meta ? <div className="pager"><span>{meta.total} {meta.total === 1 ? 'record' : 'records'}</span></div> : null;
  }
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return (
    <div className="pager">
      <span>{from}–{to} of {meta.total}</span>
      <div className="ctrls">
        <button type="button" className="btn sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Previous page">
          <Icon name="left" />
        </button>
        <span className="num">Page {meta.page} / {meta.totalPages}</span>
        <button type="button" className="btn sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} aria-label="Next page">
          <Icon name="right" />
        </button>
      </div>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search' }) {
  return (
    <label className="searchbox">
      <Icon name="search" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}
