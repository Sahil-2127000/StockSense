import React, { useMemo, useState } from 'react';
import Icon from '../../components/Icon';

/**
 * AdjustmentForm — pick product + location, enter physical count.
 * The difference (counted - recorded) is logged as WH/ADJ/xxxx on Apply.
 *
 * Not built on DocumentForm: adjustments have no draft/ready/done flow in
 * the mockup, just a single "New adjustment" bar, so the stepper doesn't apply.
 */

const REASONS = ['Damaged', 'Lost', 'Count correction', 'Found'];

const defaultAdjustment = {
  reference: 'WH/ADJ/0003',
  product: { sku: 'STRD001', name: 'Steel Rod' },
  location: 'WH/Prod',
  recorded: 27,
  uom: 'kg',
};

const defaultRecent = [
  { reference: 'WH/ADJ/0002', label: 'Steel Rod · WH/Prod', diff: '−3 kg' },
  { reference: 'WH/ADJ/0001', label: 'Office Chair · WH/Stock2', diff: '−3' },
];

export default function AdjustmentForm({
  adjustment = defaultAdjustment,
  recent = defaultRecent,
  onApply,
  onDiscard,
}) {
  const [counted, setCounted] = useState(adjustment.recorded);
  const [reason, setReason] = useState(REASONS[0]);

  const diff = useMemo(() => counted - adjustment.recorded, [counted, adjustment.recorded]);

  return (
    <main className="view">
      <div className="doc">
        <div className="doc-bar">
          <b style={{ fontSize: 14 }}>New adjustment</b>
          <div className="sp" />
          <span className="mono" style={{ color: 'var(--muted)' }}>{adjustment.reference}</span>
        </div>

        <div className="doc-body">
          <div className="grid2">
            <div className="fld">
              <label>Product</label>
              <div className="inp">
                <span className="mono" style={{ color: 'var(--muted)' }}>[{adjustment.product.sku}]</span> {adjustment.product.name}
                <Icon name="chev" className="i end" />
              </div>
            </div>
            <div className="fld">
              <label>Location</label>
              <div className="inp mono">{adjustment.location}<Icon name="chev" className="i end" /></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 12, alignItems: 'end' }}>
            <div className="fld">
              <label>Recorded</label>
              <div className="inp num" style={{ background: 'var(--bg)' }}>{adjustment.recorded} {adjustment.uom}</div>
            </div>
            <span style={{ paddingBottom: 10, color: 'var(--muted)' }}>→</span>
            <div className="fld">
              <label>Counted</label>
              <div className="inp focus num">
                <input
                  type="number"
                  value={counted}
                  onChange={e => setCounted(Number(e.target.value))}
                  style={{ border: 0, background: 'transparent', width: '100%', font: 'inherit', fontWeight: 700 }}
                />
                &nbsp;{adjustment.uom}
              </div>
            </div>
            <span style={{ paddingBottom: 10, color: 'var(--muted)' }}>=</span>
            <div className="fld">
              <label>Difference</label>
              <div
                className="inp num"
                style={{
                  background: diff < 0 ? 'var(--out-soft)' : diff > 0 ? 'var(--in-soft)' : 'var(--bg)',
                  borderColor: diff < 0 ? '#F6C6C0' : undefined,
                  color: diff < 0 ? 'var(--out)' : diff > 0 ? 'var(--in)' : 'var(--ink)',
                  fontWeight: 800,
                }}
              >
                {diff > 0 ? `+${diff}` : diff} {adjustment.uom}
              </div>
            </div>
          </div>

          <div className="fld">
            <label>Reason</label>
            <div className="filters">
              {REASONS.map(r => (
                <span
                  key={r}
                  className={`chip${r === reason ? ' on' : ''}`}
                  onClick={() => setReason(r)}
                  style={{ cursor: 'pointer' }}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <span className="btn" onClick={onDiscard}>Discard</span>
            <span className="btn pri" onClick={() => onApply?.({ ...adjustment, counted, diff, reason })}>
              Apply adjustment
            </span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h"><h2>Recent adjustments</h2></div>
        <table className="t">
          <tbody>
            {recent.map(r => (
              <tr key={r.reference}>
                <td className="mono">{r.reference}</td>
                <td>{r.label}</td>
                <td className="r qout num">{r.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}