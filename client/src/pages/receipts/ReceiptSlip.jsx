import React from 'react';
import StatusPill from '../../components/StatusPill';
import Icon from '../../components/Icon';

/**
 * ReceiptSlip — print modal shown over a blurred document view.
 * Rendered from ReceiptForm's "Print" action once a receipt is Done.
 */

const defaultSlip = {
  id: 'WH/IN/0004',
  status: 'done',
  warehouse: 'Main Warehouse, Ludhiana',
  contact: 'Ready Mat',
  receivedOn: '24 Sep 2026, 11:40',
  into: 'WH/Stock1',
  responsible: 'Purvika Jain',
  lines: [
    { sku: 'CBOX01', name: 'Carton Box', qty: '+120' },
    { sku: 'TAPE01', name: 'Packing Tape', qty: '+40' },
  ],
  totalUnits: 160,
};

export default function ReceiptSlip({ slip = defaultSlip, onClose, onPrint }) {
  return (
    <div className="app" style={{ gridTemplateColumns: '1fr', minHeight: 560, position: 'relative' }}>
      <main className="view" style={{ filter: 'blur(1.5px)', opacity: .6 }}>
        <div className="ph"><h1>Receipt</h1></div>
        <div className="doc" style={{ height: 380 }} />
      </main>
      <div className="scrim">
        <div className="slip">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="logo" style={{ padding: 0 }}>
              <Icon name="cube" style={{ width: 26, height: 26 }} />
              <b style={{ color: 'var(--ink)', fontSize: 16 }}>StockSense</b>
            </div>
            <StatusPill status={slip.status} />
          </div>

          <div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 600 }}>{slip.id}</div>
            <div className="help">Goods receipt · {slip.warehouse}</div>
          </div>

          <div className="grid2" style={{ gap: '6px 16px', fontSize: 12 }}>
            <span style={{ color: 'var(--muted)' }}>Received from</span><b>{slip.contact}</b>
            <span style={{ color: 'var(--muted)' }}>Received on</span><b className="num">{slip.receivedOn}</b>
            <span style={{ color: 'var(--muted)' }}>Into</span><b className="mono">{slip.into}</b>
            <span style={{ color: 'var(--muted)' }}>Responsible</span><b>{slip.responsible}</b>
          </div>

          <hr />

          <table className="t" style={{ fontSize: 12 }}>
            <tbody>
              {slip.lines.map(l => (
                <tr key={l.sku}>
                  <td style={{ padding: '6px 0' }}><span className="mono" style={{ color: 'var(--muted)' }}>[{l.sku}]</span> {l.name}</td>
                  <td className="r num qin" style={{ padding: '6px 0' }}>{l.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
            <span>Total units</span><span className="num">{slip.totalUnits}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <span className="btn" onClick={onClose}>Close</span>
            <span className="btn pri" onClick={onPrint}><Icon name="printer" />Print</span>
          </div>
        </div>
      </div>
    </div>
  );
}