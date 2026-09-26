import React, { useState } from 'react';
import ListView from '../../components/ListView';
import Icon from '../../components/Icon';
import StatusPill from '../../components/StatusPill';

/**
 * MoveHistory — every move between locations. Incoming in green, outgoing
 * in red; a reference with several products gets one row per product.
 */

const MOVES = [
  { id: 'r1', ref: 'WH/OUT/0004', dir: 'out', date: '25 Sep 2026', contact: 'Deco Addict', product: 'Table', from: 'WH/Stock1', to: 'Customer', qty: '−8', qtyClass: 'qout', status: 'done' },
  { id: 'r2', ref: 'WH/ADJ/0002', dir: 'adj', date: '25 Sep 2026', contact: '—', product: 'Steel Rod', from: 'WH/Prod', to: 'Adjustment', qty: '−3 kg', qtyClass: 'qout', status: 'done' },
  { id: 'r3', ref: 'WH/IN/0004', dir: 'in', date: '24 Sep 2026', contact: 'Ready Mat', product: 'Carton Box', from: 'Vendor', to: 'WH/Stock1', qty: '+120', qtyClass: 'qin', status: 'done' },
  { id: 'r4', ref: 'WH/IN/0004', dir: 'in', date: '24 Sep 2026', contact: 'Ready Mat', product: 'Packing Tape', from: 'Vendor', to: 'WH/Stock1', qty: '+40', qtyClass: 'qin', status: 'done' },
  { id: 'r5', ref: 'WH/INT/0001', dir: 'int', date: '24 Sep 2026', contact: '—', product: 'Steel Rod', from: 'WH/Stock1', to: 'WH/Prod', qty: '30 kg', qtyClass: 'int', status: 'done' },
  { id: 'r6', ref: 'WH/OUT/0003', dir: 'out', date: '23 Sep 2026', contact: 'Gemini Furniture', product: 'Steel Rod', from: 'WH/Stock1', to: 'Customer', qty: '−20 kg', qtyClass: 'qout', status: 'done' },
  { id: 'r7', ref: 'WH/IN/0003', dir: 'in', date: '23 Sep 2026', contact: 'Lumber Inc', product: 'Office Chair', from: 'Vendor', to: 'WH/Stock1', qty: '+30', qtyClass: 'qin', status: 'done' },
  { id: 'r8', ref: 'WH/IN/0002', dir: 'in', date: '22 Sep 2026', contact: 'Azure Interior', product: 'Desk', from: 'Vendor', to: 'WH/Stock1', qty: '+20', qtyClass: 'qin', status: 'done' },
  { id: 'r9', ref: 'WH/IN/0002', dir: 'in', date: '22 Sep 2026', contact: 'Azure Interior', product: 'Table', from: 'Vendor', to: 'WH/Stock1', qty: '+10', qtyClass: 'qin', status: 'done' },
];

const DIR_ICON = { in: 'down', out: 'up', int: 'swap', adj: 'sliders' };
const DIR_FILTERS = [
  { key: 'all', label: 'All moves' },
  { key: 'in', label: 'In', color: 'var(--in)' },
  { key: 'out', label: 'Out', color: 'var(--out)' },
  { key: 'int', label: 'Internal', color: 'var(--int)' },
  { key: 'adj', label: 'Adjustment', color: 'var(--warn)' },
];

const columns = [
  { key: 'ref', label: 'Reference', render: r => (
    <span className={`dir ${r.dir} mono`}><Icon name={DIR_ICON[r.dir]} />{r.ref}</span>
  ) },
  { key: 'date', label: 'Date', render: r => <span className="num">{r.date}</span> },
  { key: 'contact', label: 'Contact', render: r => r.contact === '—' ? <span style={{ color: 'var(--muted)' }}>—</span> : r.contact },
  { key: 'product', label: 'Product' },
  { key: 'from', label: 'From', render: r => <span className="mono">{r.from}</span> },
  { key: 'to', label: 'To', render: r => r.dir === 'in' ? r.to : <span className="mono">{r.to}</span> },
  { key: 'qty', label: 'Quantity', align: 'right', render: r => <span className={`r ${r.qtyClass} num`}>{r.qty}</span> },
  { key: 'status', label: 'Status', render: r => <StatusPill status={r.status} /> },
];

export default function MoveHistory({ moves = MOVES, onSwitchView }) {
  const [dir, setDir] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = moves
    .filter(m => dir === 'all' || m.dir === dir)
    .filter(m =>
      query.trim() === '' ||
      m.ref.toLowerCase().includes(query.toLowerCase()) ||
      m.contact.toLowerCase().includes(query.toLowerCase())
    );

  return (
    <main className="view">
      <div className="ph">
        <div><h1>Move history</h1><div className="sub">Stock ledger · {moves.length} moves this month</div></div>
        <div className="sp" />
        <div className="search" style={{ maxWidth: 300, height: 36, background: '#fff' }}>
          <Icon name="search" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Reference or contact" />
        </div>
        <span className="fsel" style={{ height: 36 }}><Icon name="filter" />Filters</span>
        <div className="seg">
          <span className="on" onClick={() => onSwitchView?.('list')}><Icon name="list" /></span>
          <span onClick={() => onSwitchView?.('kanban')}><Icon name="kanban" /></span>
        </div>
      </div>

      <div className="filters">
        {DIR_FILTERS.map(f => (
          <span key={f.key} className={`chip${dir === f.key ? ' on' : ''}`} onClick={() => setDir(f.key)}>
            {f.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color }} />}
            {f.label}
          </span>
        ))}
      </div>

      <ListView columns={columns} rows={filtered.map(m => ({ ...m }))} />
    </main>
  );
}