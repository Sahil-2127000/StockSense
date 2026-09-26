import CrudPage from '../../components/CrudPage.jsx';
import { useWarehouse } from '../../context/WarehouseContext.jsx';
import { warehousesService } from '../../services/crud.service.js';

export default function Warehouses() {
  const { reloadWarehouses } = useWarehouse();
  const config = {
    singular: 'warehouse',
    plural: 'Warehouses',
    sub: 'Name, short code and address. The short code becomes the document reference prefix (WH/IN/0001).',
    icon: 'wh',
    service: warehousesService,
    searchPlaceholder: 'Name or short code',
    title: (r) => r.name,
    onChange: reloadWarehouses,
    deleteMessage: 'The warehouse and its empty locations will be removed. Warehouses holding stock or with history cannot be deleted.',
    columns: [
      { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
      { key: 'code', label: 'Short code', render: (r) => <span className="tag mono" style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', padding: '2px 7px', borderRadius: 6 }}>{r.shortCode}</span> },
      { key: 'address', label: 'Address', render: (r) => r.address ?? <span className="muted">—</span> },
      { key: 'locs', label: 'Locations', align: 'right', render: (r) => <span className="num">{r._count?.locations ?? r.locations?.length ?? 0}</span> },
    ],
    fields: [
      { name: 'name', label: 'Name', required: true, maxLength: 60, validate: (v) => v.length < 2 && 'At least 2 characters' },
      { name: 'shortCode', label: 'Short code', required: true, mono: true, maxLength: 5, help: '2–5 letters or digits, e.g. WH. Locked once operations exist.', validate: (v) => !/^[A-Za-z0-9]{2,5}$/.test(v) && '2–5 letters or digits' },
      { name: 'address', label: 'Address', type: 'textarea', maxLength: 200 },
    ],
    toForm: (r) => ({ name: r?.name ?? '', shortCode: r?.shortCode ?? '', address: r?.address ?? '' }),
    toBody: (f) => ({ name: f.name.trim(), shortCode: f.shortCode.trim().toUpperCase(), address: f.address.trim() }),
  };
  return <CrudPage config={config} />;
}
