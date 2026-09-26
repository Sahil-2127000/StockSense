import React, { useState } from 'react';
import ListView from '../../components/ListView';
import StatusPill from '../../components/StatusPill';
import Icon from '../../components/Icon';

// TODO: replace with real data (API / store) once wired up
const RECEIPTS = [
  { id: 'WH/IN/0009', from: 'Vendor', to: 'WH/Stock1', contact: 'Deco Addict', products: 'Keyboard × 40', date: '2 Oct 2026', status: 'ready' },
  { id: 'WH/IN/0008', from: 'Vendor', to: 'WH/Stock1', contact: 'Lumber Inc', products: 'Desk Lamp × 20', date: '30 Sep 2026', status: 'draft' },
  { id: 'WH/IN/0007', from: 'Vendor', to: 'WH/Stock1', contact: 'Azure Interior', products: 'Monitor 24″ × 15', date: '28 Sep 2026', status: 'ready' },
  { id: 'WH/IN/0006', from: 'Vendor', to: 'WH/Stock1', contact: 'Tata Steel Traders', products: 'Steel Sheet × 100 kg', date: 'Today', status: 'ready' },
  { id: 'WH/IN/0005', from: 'Vendor', to: 'WH/Stock1', contact: 'Gemini Furniture', products: 'Desk × 10', date: '24 Sep 2026', status: 'ready', late: true },
  { id: 'WH/IN/0004', from: 'Vendor', to: 'WH/Stock1', contact: 'Ready Mat', products: 'Carton Box × 120, +1 more', date: '24 Sep 2026', status: 'done' },
  { id: 'WH/IN/0003', from: 'Vendor', to: 'WH/Stock1', contact: 'Lumber Inc', products: 'Office Chair × 30', date: '23 Sep 2026', status: 'done' },
  { id: 'WH/IN/0002', from: 'Vendor', to: 'WH/Stock1', contact: 'Azure Interior', products: 'Desk × 20, Table × 10', date: '22 Sep 2026', status: 'done' },
];

const STATUS_FILTERS = ['all', 'draft', 'ready', 'done', 'late', 'cancel'];

const columns = [
  { key: 'ref', label: 'Reference', render: (r) => <a className="ref mono">{r.id}</a> },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To', render: (r) => <span className="mono">{r.to}</span> },
  { key: 'contact', label: 'Contact' },
  { key: 'products', label: 'Products' },
  {
    key: 'date',
    label: 'Schedule date',
    align: 'right',
    render: (r) => (
      <span className={r.late ? 'late num' : 'num'}>
        {r.date === 'Today' ? <b>Today</b> : r.date}
      </span>
    ),
  },
  { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
];

export default function ReceiptsList({ onSelectRow, onNew }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = RECEIPTS
    .filter((r) => filter === 'all' || (filter === 'late' ? r.late : r.status === filter))
    .filter((r) =>
      query.trim() === '' ||
      r.id.toLowerCase().includes(query.toLowerCase()) ||
      r.contact.toLowerCase().includes(query.toLowerCase())
    )
    .map((r) => ({ ...r, rowClassName: r.late ? 'bad' : undefined }));

  const countFor = (status) =>
    status === 'all' ? RECEIPTS.length
    : status === 'late' ? RECEIPTS.filter((r) => r.late).length
    : RECEIPTS.filter((r) => r.status === status).length;

  return (
    <>
      <div className="ph">
        <span className="btn pri" onClick={onNew}>
          <Icon name="plus" />
          New
        </span>
        <div><h1>Receipts</h1></div>
        <div className="sp" />
        <div className="search" style={{ maxWidth: 300, height: 36, background: '#fff' }}>
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Reference or contact"
          />
        </div>
      </div>

      <div className="filters">
        {STATUS_FILTERS.map((s) => (
          <span
            key={s}
            className={`chip${filter === s ? ' on' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} <b>{countFor(s)}</b>
          </span>
        ))}
      </div>

      <ListView columns={columns} rows={filtered} selectable onRowClick={onSelectRow} />
    </>
  );
}