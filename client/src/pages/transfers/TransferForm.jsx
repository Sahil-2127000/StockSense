import React from 'react';
import DocumentForm from '../../components/DocumentForm';
import Icon from '../../components/Icon';

/**
 * TransferForm — WH/INT/xxxx. Moves stock between locations; total on-hand
 * across the company is unchanged. Draft -> Ready -> Done.
 */

const STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'ready', label: 'Ready' },
  { key: 'done', label: 'Done' },
];

const defaultTransfer = {
  id: 'WH/INT/0002',
  status: 'ready',
  from: { name: 'Main Store', code: 'WH/Stock1' },
  to: { name: 'Branch Store', code: 'BR/Stock1' },
  scheduleDate: '27 Sep 2026',
  reason: 'Branch showroom restock',
  lines: [
    { sku: 'DESK001', name: 'Desk', atSource: 24, move: 5 },
  ],
};

export default function TransferForm({ transfer = defaultTransfer, onValidate, onCancel, onAddLine }) {
  return (
    <main className="view">
      <DocumentForm
        reference={transfer.id}
        status={transfer.status}
        steps={STEPS}
        actions={[
          { label: 'Validate', icon: 'check', variant: 'pri', onClick: onValidate },
          { label: 'Cancel', variant: 'dan', onClick: onCancel },
        ]}
      >
        <div className="route">
          <div className="end">
            <small>From</small><b>{transfer.from.name}</b><span className="mono">{transfer.from.code}</span>
          </div>
          <div className="arrow"><i /><Icon name="right" /></div>
          <div className="end" style={{ textAlign: 'right' }}>
            <small>To</small><b>{transfer.to.name}</b><span className="mono">{transfer.to.code}</span>
          </div>
        </div>

        <div className="grid2">
          <div className="fld"><label>Schedule date</label><div className="inp num">{transfer.scheduleDate}</div></div>
          <div className="fld"><label>Reason</label><div className="inp">{transfer.reason}</div></div>
        </div>

        <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <table className="t">
            <thead><tr><th>Product</th><th className="r">At source</th><th className="r">Move</th></tr></thead>
            <tbody>
              {transfer.lines.map(l => (
                <tr key={l.sku}>
                  <td><span className="mono" style={{ color: 'var(--muted)' }}>[{l.sku}]</span> <b>{l.name}</b></td>
                  <td className="r num">{l.atSource}</td>
                  <td className="r num"><b style={{ color: 'var(--int)' }}>{l.move}</b></td>
                </tr>
              ))}
              <tr className="addrow" onClick={onAddLine} style={{ cursor: 'pointer' }}>
                <td colSpan={3}>+ Add a product</td>
              </tr>
            </tbody>
          </table>
        </div>
      </DocumentForm>
    </main>
  );
}