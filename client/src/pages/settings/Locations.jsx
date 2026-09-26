import { useState } from 'react';
import CrudPage from '../../components/CrudPage.jsx';
import { useWarehouse } from '../../context/WarehouseContext.jsx';
import { locationsService } from '../../services/crud.service.js';

const TYPE_LABEL = { INTERNAL: 'Warehouse', VENDOR: 'Vendors (virtual)', CUSTOMER: 'Customers (virtual)', ADJUSTMENT: 'Adjustment (virtual)' };

export default function Locations() {
  const { warehouses, warehouseId } = useWarehouse();
  const [type, setType] = useState('INTERNAL');
  const config = {
    singular: 'location',
    plural: 'Locations',
    sub: 'Rooms, racks and floors inside each warehouse. The full path is built from the warehouse code.',
    icon: 'pin',
    service: locationsService,
    searchPlaceholder: 'Name or path',
    title: (r) => r.fullPath ?? r.name,
    canEdit: (r) => r.type === 'INTERNAL',
    canDelete: (r) => r.type === 'INTERNAL',
    columns: [
      { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
      { key: 'code', label: 'Short code', render: (r) => <span className="mono">{r.shortCode}</span> },
      { key: 'wh', label: 'Warehouse', render: (r) => r.warehouse?.name ?? <span className="muted">System</span> },
      { key: 'path', label: 'Full path', render: (r) => <span className="mono">{r.fullPath}</span> },
      { key: 'type', label: 'Type', render: (r) => <span className={`pill ${r.type === 'INTERNAL' ? 'ready' : 'draft'}`}>{TYPE_LABEL[r.type]}</span> },
    ],
    fields: [
      { name: 'warehouseId', label: 'Warehouse', type: 'select', required: true, createOnly: true, options: warehouses.map((w) => ({ value: w.id, label: `${w.shortCode} · ${w.name}` })) },
      { name: 'name', label: 'Name', required: true, maxLength: 60, validate: (v) => v.length < 2 && 'At least 2 characters' },
      { name: 'shortCode', label: 'Short code', required: true, createOnly: true, mono: true, maxLength: 10, help: 'e.g. RackA. Becomes WH/RackA and cannot change later.', validate: (v) => !/^[A-Za-z0-9-]{1,10}$/.test(v) && '1–10 letters, digits or dashes' },
    ],
    toForm: (r) => ({ warehouseId: r?.warehouseId ?? warehouseId ?? '', name: r?.name ?? '', shortCode: r?.shortCode ?? '' }),
    toBody: (f, { isNew }) => (isNew ? { warehouseId: Number(f.warehouseId), name: f.name.trim(), shortCode: f.shortCode.trim() } : { name: f.name.trim() }),
  };
  return (
    <CrudPage
      config={config}
      filterValues={{ warehouseId: type === 'INTERNAL' ? warehouseId : undefined, type: type || undefined }}
      filters={
        <select className="inp sm" style={{ width: 'auto' }} value={type} onChange={(e) => setType(e.target.value)} aria-label="Location type">
          <option value="INTERNAL">Warehouse locations</option>
          <option value="">All, including virtual</option>
        </select>
      }
    />
  );
}
