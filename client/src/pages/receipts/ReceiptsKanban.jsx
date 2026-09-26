import React from 'react';
import StatusPill from '../../components/StatusPill';
import Icon from '../../components/Icon';

/**
 * ReceiptsKanban — same records as ReceiptsList, grouped by status column
 * instead of rows. Kept as a sibling view (not built on ListView, since the
 * layout is columns-of-cards rather than a single table).
 */

const COLUMNS = [
  {
    key: 'draft', label: 'Draft',
    cards: [
      { id: 'WH/IN/0008', contact: 'Lumber Inc', products: 'Desk Lamp × 20', date: '30 Sep', to: 'WH/Stock1' },
    ],
  },
  {
    key: 'ready', label: 'Ready',
    cards: [
      { id: 'WH/IN/0005', contact: 'Gemini Furniture', products: 'Desk × 10', late: '24 Sep', who: 'PJ · Purvika', to: 'WH/Stock1' },
      { id: 'WH/IN/0006', contact: 'Tata Steel Traders', products: 'Steel Sheet × 100 kg', today: true, who: 'PJ · Purvika', to: 'WH/Stock1' },
      { id: 'WH/IN/0007', contact: 'Azure Interior', products: 'Monitor 24″ × 15', date: '28 Sep', who: 'AS · Aman', to: 'WH/Stock1' },
      { id: 'WH/IN/0009', contact: 'Deco Addict', products: 'Keyboard × 40', date: '2 Oct', who: 'PJ · Purvika', to: 'WH/Stock1' },
    ],
  },
  {
    key: 'done', label: 'Done',
    cards: [
      { id: 'WH/IN/0004', contact: 'Ready Mat', products: 'Carton Box × 120 · Packing Tape × 40', date: '24 Sep' },
      { id: 'WH/IN/0003', contact: 'Lumber Inc', products: 'Office Chair × 30', date: '23 Sep' },
      { id: 'WH/IN/0002', contact: 'Azure Interior', products: 'Desk × 20 · Table × 10', date: '22 Sep' },
    ],
    more: 3,
  },
  { key: 'cancel', label: 'Cancelled', cards: [], empty: true },
];

function Card({ card }) {
  return (
    <div className="kc">
      <div className="top2">
        <span className="mono">{card.id}</span>
        {card.late && <span className="late" style={{ fontSize: 11 }}>{card.late}</span>}
        {card.today && <span style={{ fontSize: 11, fontWeight: 700 }}>Today</span>}
        {!card.late && !card.today && (card.date
          ? <span style={{ fontSize: 11, color: 'var(--muted)' }}>{card.date}</span>
          : <Icon name="more" style={{ color: 'var(--muted)' }} />)}
      </div>
      <div className="who2">{card.contact}</div>
      <div className="items">{card.products}</div>
      {(card.who || card.to) && (
        <div className="meta">
          {card.who && <span>{card.who}</span>}
          {card.to && <span>→ {card.to}</span>}
        </div>
      )}
    </div>
  );
}

export default function ReceiptsKanban({ columns = COLUMNS, onNew, onSwitchView, query, onQueryChange }) {
  return (
    <main className="view">
      <div className="ph">
        <span className="btn pri" onClick={onNew}><Icon name="plus" />New</span>
        <div><h1>Receipts</h1></div>
        <div className="sp" />
        <div className="search" style={{ maxWidth: 300, height: 36, background: '#fff' }}>
          <Icon name="search" />
          <input value={query ?? ''} onChange={e => onQueryChange?.(e.target.value)} placeholder="Reference or contact" />
        </div>
        <div className="seg">
          <span onClick={() => onSwitchView?.('list')}><Icon name="list" /></span>
          <span className="on" onClick={() => onSwitchView?.('kanban')}><Icon name="kanban" /></span>
        </div>
      </div>

      <div className="kb">
        {columns.map(col => (
          <div className="kcol" key={col.key} style={col.empty ? { opacity: .8 } : undefined}>
            <h4><StatusPill status={col.key} /><em>{col.cards.length}</em></h4>
            {col.cards.map(c => <Card key={c.id} card={c} />)}
            {col.more && (
              <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--muted)', padding: 4 }}>
                + {col.more} more
              </div>
            )}
            {col.empty && (
              <div style={{ border: '1.5px dashed #CCD4E2', borderRadius: 11, padding: '22px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                Drop a receipt here to cancel it
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}