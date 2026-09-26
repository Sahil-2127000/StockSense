import React from 'react';

/**
 * Generic list/table view.
 *
 * columns: [{ key, label, align?: 'right', render?: (row) => node }]
 * rows: [{ id, ...data }]
 * onRowClick: (row) => void
 * selectable: show a leading checkbox column
 */
export default function ListView({ columns, rows, onRowClick, selectable = false }) {
  return (
    <div className="panel">
      <table className="t">
        <thead>
          <tr>
            {selectable && <th style={{ width: 36 }}><span className="box" /></th>}
            {columns.map((col) => (
              <th key={col.key} className={col.align === 'right' ? 'r' : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={row.rowClassName}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {selectable && (
                <td>
                  <span className="box" />
                </td>
              )}
              {columns.map((col) => (
                <td key={col.key} className={col.align === 'right' ? 'r' : undefined}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}