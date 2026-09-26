import React from 'react';
import DocumentForm from '../../components/DocumentForm';
import Icon from '../../components/Icon';

/**
 * ReceiptForm — WH/IN/xxxx detail view, built on the shared DocumentForm shell.
 * Draft -> Ready -> Done. "Validate" moves Ready -> Done and adds stock
 * (previewed in the "On validation" sidebar panel).
 *
 * Mock record extends the ReceiptsList row shape with line items + activity,
 * so a real integration can pass the same record clicked from ReceiptsList.
 */

const STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'ready', label: 'Ready' },
  { key: 'done', label: 'Done' },
];

const defaultReceipt = {
  id: 'WH/IN/0005',
  status: 'ready',
  contact: 'Gemini Furniture',
  scheduleDate: '24 Sep 2026',
  late: true,
  responsible: { initials: 'PJ', name: 'Purvika Jain' },
  destination: 'WH/Stock1 · Main Store',
  lines: [
    { sku: 'DESK001', name: 'Desk', onHand: 30, qty: 10, uom: 'Units' },
    { sku: 'TABL001', name: 'Table', onHand: 5, qty: 6, uom: 'Units' },
  ],
  onValidation: [
    { label: 'Desk · WH/Stock1', before: 24, after: 34 },
    { label: 'Table · WH/Stock1', before: 5, after: 11 },
  ],
  activity: [
    { title: 'Marked To Do → Ready', by: 'Purvika Jain', when: '22 Sep, 16:05' },
    { title: 'Draft created', by: 'Purvika Jain', when: '22 Sep, 15:48' },
  ],
};

export default function ReceiptForm({ receipt = defaultReceipt, onValidate, onCancel, onAddLine, onRemoveLine }) {
  const sidebar = (
    <>
      <div className="panel">
        <div className="panel-h"><h2>On validation</h2></div>
        <div style={{ padding: '0 18px 16px', display: 'grid', gap: 10 }}>
          {receipt.onValidation.map(v => (
            <div key={v.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{v.label}</span>
              <span className="num"><span style={{ color: 'var(--muted)' }}>{v.before} →</span> <b className="qin">{v.after}</b></span>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel-h"><h2>Activity</h2></div>
        <div className="tl">
          {receipt.activity.map((a, i) => (
            <div key={i} className={i === 0 ? 'b' : ''}>
              <span />
              <div><b>{a.title}</b><small>{a.by} · {a.when}</small></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <main className="view">
      <div className="crumb">
        Receipts <Icon name="right" style={{ width: 12, height: 12 }} /> <b className="mono">{receipt.id}</b>
      </div>

      <DocumentForm
        reference={receipt.id}
        status={receipt.status}
        steps={STEPS}
        actions={[
          { label: 'Validate', icon: 'check', variant: 'pri', onClick: onValidate },
          { label: 'Print', icon: 'printer', disabled: true },
          { label: 'Cancel', variant: 'dan', onClick: onCancel },
        ]}
        meta={receipt.late ? { late: true, text: `Scheduled ${receipt.scheduleDate}` } : undefined}
        sidebar={sidebar}
      >
        <div className="grid2">
          <div className="fld">
            <label>Receive from</label>
            <div className="inp">{receipt.contact}<Icon name="chev" className="i end" /></div>
          </div>
          <div className="fld">
            <label>Schedule date</label>
            <div className="inp num"><Icon name="cal" />{receipt.scheduleDate}</div>
          </div>
          <div className="fld">
            <label>Responsible</label>
            <div className="inp">
              <span className="av" style={{ width: 22, height: 22, fontSize: 9, borderRadius: 6 }}>
                {receipt.responsible.initials}
              </span>
              {receipt.responsible.name}
              <span className="end help">auto-filled</span>
            </div>
          </div>
          <div className="fld">
            <label>Destination</label>
            <div className="inp mono">{receipt.destination}<Icon name="chev" className="i end" /></div>
          </div>
        </div>

        <div>
          <div className="sect" style={{ marginBottom: 8 }}>Products</div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
            <table className="t">
              <thead>
                <tr><th>Product</th><th className="r">On hand</th><th className="r">Quantity</th><th style={{ width: 40 }} /></tr>
              </thead>
              <tbody>
                {receipt.lines.map(l => (
                  <tr key={l.sku}>
                    <td><span className="mono" style={{ color: 'var(--muted)' }}>[{l.sku}]</span> <b>{l.name}</b></td>
                    <td className="r num">{l.onHand}</td>
                    <td className="r num"><b>{l.qty}</b> {l.uom}</td>
                    <td><Icon name="trash" style={{ color: 'var(--muted)', cursor: 'pointer' }} onClick={() => onRemoveLine?.(l.sku)} /></td>
                  </tr>
                ))}
                <tr className="addrow" onClick={onAddLine} style={{ cursor: 'pointer' }}>
                  <td colSpan={4}><Icon name="plus" style={{ verticalAlign: -3 }} /> Add a product</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DocumentForm>
    </main>
  );
}