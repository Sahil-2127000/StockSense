import React from 'react';
import StatusPill from './StatusPill'; // assumes: <StatusPill status="draft|ready|waiting|done|cancel" />
import Icon from './Icon';             // assumes: <Icon name="check" />

/**
 * DocumentForm — shared shell for Receipt / Delivery / Transfer / Adjustment forms.
 *
 * reference:  string, e.g. "WH/IN/0005"
 * status:     current status key, must be one of `steps[].key`
 * steps:      [{ key, label }] in order, e.g.
 *             [{ key: 'draft', label: 'Draft' }, { key: 'ready', label: 'Ready' }, { key: 'done', label: 'Done' }]
 *             For delivery forms, insert a 'waiting' step between draft and ready.
 * actions:    [{ label, icon?, variant?: 'pri'|'dan'|'ghost', disabled?, onClick }]
 *             rendered left-to-right in the top bar, before the stepper.
 * meta:       optional extra text next to the reference (e.g. "Scheduled 24 Sep" / late flag)
 * banner:     optional node rendered above doc-body (e.g. the short-stock alert on Delivery)
 * sidebar:    optional node rendered in the 300px side column (e.g. "On validation" + "Activity" panels)
 * children:   the form body — grid2 fields + products table
 */
export default function DocumentForm({
  reference,
  status,
  steps,
  actions = [],
  meta,
  banner,
  sidebar,
  children,
}) {
  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <>
      {banner}
      <div style={{ display: 'grid', gridTemplateColumns: sidebar ? '1fr 300px' : '1fr', gap: 18, alignItems: 'start' }}>
        <div className="doc">
          <div className="doc-bar">
            {actions.map((a, i) => (
              <span
                key={i}
                className={`btn${a.variant ? ` ${a.variant}` : ''}${a.disabled ? ' dis' : ''}`}
                onClick={a.disabled ? undefined : a.onClick}
              >
                {a.icon && <Icon name={a.icon} />}
                {a.label}
              </span>
            ))}
            <div className="sp" />
            <div className="steps">
              {steps.map((s, i) => (
                <span
                  key={s.key}
                  className={
                    i < currentIndex ? 'past'
                    : i === currentIndex ? (s.warn ? 'cur w' : 'cur')
                    : undefined
                  }
                >
                  {i < currentIndex && <Icon name="check" style={{ width: 13, height: 13 }} />}
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          <div className="doc-body">
            <div className="doc-ref">
              <span className="mono">{reference}</span>
              <StatusPill status={status} />
              {meta && <span className={meta.late ? 'late' : undefined} style={{ fontSize: 12 }}>{meta.text}</span>}
            </div>
            {children}
          </div>
        </div>

        {sidebar && <div className="side-col">{sidebar}</div>}
      </div>
    </>
  );
}