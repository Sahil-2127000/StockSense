import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable, { Pagination, SearchBox } from '../components/DataTable.jsx';
import { Empty, ErrorState } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useWarehouse } from '../context/WarehouseContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useLive } from '../hooks/useLive.js';
import { usePage } from '../hooks/usePage.js';
import { reportsService } from '../services/reports.service.js';
import { OPERATION_TYPES, operationPath } from '../utils/constants.js';
import { formatDateTime, formatQty } from '../utils/format.js';

const DIRECTIONS = [
  ['', 'All'],
  ['IN', 'Incoming'],
  ['OUT', 'Outgoing'],
  ['INTERNAL', 'Internal'],
];
const DIR_META = { IN: ['in', 'down', '+'], OUT: ['out', 'up', '−'], INTERNAL: ['int', 'swap', ''] };

export default function MoveHistory() {
  useDocumentTitle('Move history');
  const navigate = useNavigate();
  const { warehouseId } = useWarehouse();
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim());
  const [direction, setDirection] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = usePage([q, direction, type, warehouseId, from, to].join('|'));

  const moves = useApi(
    () => reportsService.moves({
      q, direction, type, warehouseId, page, limit: 25,
      from: from ? `${from}T00:00:00` : undefined, to: to ? `${to}T23:59:59` : undefined,
    }),
    [q, direction, type, warehouseId, from, to, page]
  );
  useLive('stock:changed', () => page === 1 && moves.reload({ silent: true }));

  return (
    <div className="view">
      <PageHeader title="Move history" sub="Every stock movement between locations. Incoming in green, outgoing in red; one row per product." />
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Reference, contact, product or SKU" />
        <div className="filters" role="group" aria-label="Direction">
          {DIRECTIONS.map(([value, label]) => (
            <button type="button" key={label} className={`chip${direction === value ? ' on' : ''}`} onClick={() => setDirection(value)}>{label}</button>
          ))}
        </div>
        <select className="inp sm" style={{ width: 'auto' }} value={type} onChange={(e) => setType(e.target.value)} aria-label="Operation type">
          <option value="">All types</option>
          {Object.entries(OPERATION_TYPES).map(([key, m]) => <option key={key} value={key}>{m.plural}</option>)}
        </select>
        <input className="inp sm" style={{ width: 'auto' }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <input className="inp sm" style={{ width: 'auto' }} type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
      </div>
      <ErrorState error={moves.error} onRetry={moves.reload} />
      <section className="panel">
        <DataTable
          loading={moves.loading}
          rows={moves.data}
          onRowClick={(m) => navigate(operationPath(m.operation))}
          empty={<Empty icon="clock" title="No moves found">Validated operations appear here.</Empty>}
          columns={[
            { key: 'ref', label: 'Reference', render: (m) => <span className="ref mono">{m.operation.reference}</span> },
            { key: 'date', label: 'Date', render: (m) => <span className="nowrap">{formatDateTime(m.createdAt)}</span> },
            { key: 'contact', label: 'Contact', render: (m) => m.operation.contact?.name ?? <span className="muted">{OPERATION_TYPES[m.operation.type].label}</span> },
            { key: 'product', label: 'Product', render: (m) => <div><b>{m.product.name}</b><span className="sub mono">{m.product.sku}</span></div> },
            { key: 'from', label: 'From', render: (m) => <span className="mono">{m.fromLocation.fullPath}</span> },
            { key: 'to', label: 'To', render: (m) => <span className="mono">{m.toLocation.fullPath}</span> },
            {
              key: 'qty', label: 'Quantity', align: 'right', render: (m) => {
                const [tone, icon, sign] = DIR_META[m.direction];
                return <span className={`dir ${tone}`}><Icon name={icon} />{sign}{formatQty(m.quantity, m.product.uom)}</span>;
              },
            },
          ]}
        />
        <Pagination meta={moves.meta} onPage={setPage} />
      </section>
    </div>
  );
}
