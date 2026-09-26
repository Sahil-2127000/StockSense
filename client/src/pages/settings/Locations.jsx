import React, { useState } from 'react';
import ListView from '../../components/ListView';
import Icon from '../../components/Icon';

/**
 * Locations — rooms, racks and floors inside each warehouse.
 * Selecting a row loads it into the edit form below the table.
 */

const LOCATIONS = [
  { id: 'l1', name: 'Main Store', code: 'Stock1', wh: 'WH', path: 'WH/Stock1' },
  { id: 'l2', name: 'Rack B', code: 'Stock2', wh: 'WH', path: 'WH/Stock2' },
  { id: 'l3', name: 'Production Floor', code: 'Prod', wh: 'WH', path: 'WH/Prod' },
  { id: 'l4', name: 'Branch Store', code: 'Stock1', wh: 'BR', path: 'BR/Stock1' },
];

const columns = [
  { key: 'name', label: 'Name', render: r => <b>{r.name}</b> },
  { key: 'code', label: 'Short code', render: r => <span className="mono">{r.code}</span> },
  { key: 'wh', label: 'Warehouse', render: r => (
    <span className="whsel" style={{ height: 'auto', border: 0, padding: 0 }}><span className="tag">{r.wh}</span></span>
  ) },
  { key: 'path', label: 'Full path', render: r => <span className="mono">{r.path}</span> },
];

export default function Locations({ locations = LOCATIONS, onSave, onDiscard, onNew }) {
  const [selected, setSelected] = useState(locations[2]);
  const [name, setName] = useState(selected.name);
  const [code, setCode] = useState(selected.code);

  const selectRow = row => {
    setSelected(row);
    setName(row.name);
    setCode(row.code);
  };

  return (
    <main className="view">
      <div className="ph">
        <h1>Locations</h1>
        <div className="sp" />
        <span className="btn pri" onClick={onNew}><Icon name="plus" />New location</span>
      </div>

      <ListView
        columns={columns}
        rows={locations.map(l => ({ ...l, rowClassName: l.id === selected.id ? 'hl' : undefined }))}
        onRowClick={selectRow}
      />

      <div className="doc">
        <div className="doc-body">
          <div className="grid2">
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
            </div>
          </div>
          <div className="fld">
            <label>Warehouse</label>
            <div className="inp">WH · Main Warehouse<Icon name="chev" className="i end" /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <span className="btn" onClick={onDiscard}>Discard</span>
            <span className="btn pri" onClick={() => onSave?.({ ...selected, name, code })}>Save location</span>
          </div>
        </div>
      </div>
    </main>
  );
}