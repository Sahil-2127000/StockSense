import React, { useState } from 'react';
import Icon from '../../components/Icon';

/**
 * Warehouses — name, short code and address. The short code becomes the
 * reference prefix (e.g. "WH" -> WH/IN/0010).
 */

const WAREHOUSES = [
  { id: 'w1', code: 'WH', name: 'Main Warehouse', locations: 3, products: 214, default: true,
    address: 'Plot 14, Focal Point, Ludhiana, Punjab 141010' },
  { id: 'w2', code: 'BR', name: 'Branch Warehouse', locations: 1, products: 34, default: false,
    address: '' },
];

export default function Warehouses({ warehouses = WAREHOUSES, onSave, onDiscard, onNew }) {
  const [selected, setSelected] = useState(warehouses[0]);
  const [name, setName] = useState(selected.name);
  const [code, setCode] = useState(selected.code);
  const [address, setAddress] = useState(selected.address);

  const selectWarehouse = wh => {
    setSelected(wh);
    setName(wh.name);
    setCode(wh.code);
    setAddress(wh.address);
  };

  return (
    <main className="view">
      <div className="ph">
        <h1>Warehouses</h1>
        <div className="sp" />
        <span className="btn pri" onClick={onNew}><Icon name="plus" />New warehouse</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {warehouses.map(wh => (
          <div
            key={wh.id}
            className="panel"
            onClick={() => selectWarehouse(wh)}
            style={{
              padding: '14px 16px',
              cursor: 'pointer',
              ...(wh.id === selected.id
                ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-soft)' }
                : {}),
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="whsel" style={{ height: 'auto', border: 0, padding: 0 }}>
                <span className="tag">{wh.code}</span>
              </span>
              {wh.default && <span className="pill ok">Default</span>}
            </div>
            <b style={{ display: 'block', marginTop: 8, fontSize: 14 }}>{wh.name}</b>
            <small style={{ color: 'var(--muted)' }}>{wh.locations} locations · {wh.products} products</small>
          </div>
        ))}
      </div>

      <div className="doc">
        <div className="doc-body">
          <div className="fld">
            <label>Name</label>
            <div className="inp">
              <input value={name} onChange={e => setName(e.target.value)} style={{ border: 0, background: 'transparent', width: '100%', font: 'inherit' }} />
            </div>
          </div>
          <div className="fld">
            <label>Short code</label>
            <div className="inp mono">
              <input value={code} onChange={e => setCode(e.target.value)} style={{ border: 0, background: 'transparent', width: '100%', font: 'inherit' }} />
            </div>
            <div className="help">Used in references like <span className="mono">{code}/IN/0010</span></div>
          </div>
          <div className="fld">
            <label>Address</label>
            <div className="inp">
              <input value={address} onChange={e => setAddress(e.target.value)} style={{ border: 0, background: 'transparent', width: '100%', font: 'inherit' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <span className="btn" onClick={onDiscard}>Discard</span>
            <span className="btn pri" onClick={() => onSave?.({ ...selected, name, code, address })}>Save warehouse</span>
          </div>
        </div>
      </div>
    </main>
  );
}