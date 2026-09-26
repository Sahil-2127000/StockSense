import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DataTable, { Pagination, SearchBox } from '../components/DataTable.jsx';
import { Empty, ErrorState, Spinner } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useWarehouse } from '../context/WarehouseContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useLive } from '../hooks/useLive.js';
import { usePage } from '../hooks/usePage.js';
import { categoriesService, locationsService } from '../services/crud.service.js';
import { operationsService } from '../services/operations.service.js';
import { reportsService } from '../services/reports.service.js';
import { formatMoney, formatQty } from '../utils/format.js';

// Inline "Update": pick a location, enter the physical count, save → adjustment
function CountEditor({ row, locations, onDone, onCancel }) {
  const toast = useToast();
  const recordedAt = (id) => row.byLocation.find((b) => b.location.id === Number(id))?.quantity ?? 0;
  const [locationId, setLocationId] = useState(row.byLocation[0]?.location.id ?? locations[0]?.id ?? '');
  const recorded = recordedAt(locationId);
  const [counted, setCounted] = useState(String(recorded));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const difference = counted === '' ? 0 : Number(counted) - recorded;

  const save = async () => {
    if (!locationId) return setError('Choose a location');
    if (counted === '' || Number(counted) < 0) return setError('Enter a count of 0 or more');
    if (difference === 0) return setError('Count matches the recorded stock');
    setBusy(true);
    setError(null);
    try {
      const op = await operationsService.adjust({ productId: row.product.id, locationId: Number(locationId), countedQuantity: Number(counted), reason: 'Stock count' });
      toast.success(`${op.reference}: ${row.product.name} ${difference > 0 ? '+' : ''}${formatQty(difference, row.product.uom)}`);
      onDone();
    } catch (err) {
      setError(err.fieldErrors?.countedQuantity ?? err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <div style={{ display: 'grid', gap: 6 }} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="inp sm" style={{ width: 150 }} value={locationId} onChange={(e) => { setLocationId(e.target.value); setCounted(String(recordedAt(e.target.value))); }} aria-label="Location">
          {locations.map((l) => <option key={l.id} value={l.id}>{l.fullPath}</option>)}
        </select>
        <input
          className="inp sm"
          style={{ width: 100 }}
          type="number"
          min="0"
          step="any"
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          aria-label="Counted quantity"
          autoFocus
        />
        <span className={`diff ${difference > 0 ? 'pos' : difference < 0 ? 'neg' : ''}`}>
          {difference > 0 ? '+' : ''}{formatQty(difference)}
        </span>
        <button type="button" className="btn ok sm" onClick={save} disabled={busy}>{busy ? <Spinner /> : <Icon name="check" />} Save</button>
        <button type="button" className="btn sm" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
      {error && <span className="help e">{error}</span>}
    </div>
  );
}

export default function Stock() {
  useDocumentTitle('Stock');
  const { warehouseId } = useWarehouse();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim());
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [inStock, setInStock] = useState(params.get('inStock') === 'true');
  const [page, setPage] = usePage([q, categoryId, locationId, warehouseId, inStock].join('|'));
  const [editing, setEditing] = useState(null);

  const categories = useApi(() => categoriesService.list({ limit: 100 }), []);
  const locations = useApi(() => locationsService.list({ limit: 100, type: 'INTERNAL', warehouseId }), [warehouseId]);
  const stock = useApi(
    () => reportsService.stock({ q, page, limit: 20, categoryId, locationId, warehouseId, inStock: inStock || undefined }),
    [q, page, categoryId, locationId, warehouseId, inStock]
  );
  useLive('stock:changed', () => editing === null && stock.reload({ silent: true }));

  return (
    <div className="view">
      <PageHeader title="Stock" sub="Available stock at a glance. “Update” records a physical count as an adjustment.">
        {stock.meta && (
          <div className="panel" style={{ padding: '8px 14px', display: 'flex', gap: 18 }}>
            <div><small className="muted">Units</small><div className="strong num">{formatQty(stock.meta.totalUnits)}</div></div>
            <div><small className="muted">Total value</small><div className="strong num">{formatMoney(stock.meta.totalValue, { short: true })}</div></div>
          </div>
        )}
      </PageHeader>

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search name or SKU" />
        <select className="inp sm" style={{ width: 'auto' }} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="inp sm" style={{ width: 'auto' }} value={locationId} onChange={(e) => setLocationId(e.target.value)} aria-label="Location">
          <option value="">All locations</option>
          {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.fullPath}</option>)}
        </select>
        <label className="checkline">
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} /> Only in stock
        </label>
      </div>

      <ErrorState error={stock.error} onRetry={stock.reload} />
      <section className="panel">
        <DataTable
          loading={stock.loading}
          rows={stock.data}
          keyOf={(r) => r.product.id}
          rowClass={(r) => (r.stockStatus === 'OUT' ? 'bad' : undefined)}
          empty={<Empty icon="layers" title="No stock to show">Receive goods to bring stock in.</Empty>}
          columns={[
            {
              key: 'product', label: 'Product', render: (r) => (
                <Link to={`/products?open=${r.product.id}`} className="pname" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="thumb"><Icon name="box" /></span>
                  <div><b>{r.product.name}</b><small>{r.product.sku} · {r.product.category.name}</small></div>
                </Link>
              ),
            },
            { key: 'cost', label: 'Per unit cost', align: 'right', render: (r) => <span className="num">{formatMoney(r.unitCost)}</span> },
            { key: 'onHand', label: 'On hand', align: 'right', render: (r) => <b className="num">{formatQty(r.onHand, r.product.uom)}</b> },
            { key: 'free', label: 'Free to use', align: 'right', render: (r) => <span className="num">{formatQty(r.free)}</span> },
            {
              key: 'loc', label: 'By location', render: (r) =>
                editing === r.product.id ? (
                  <CountEditor
                    row={r}
                    locations={locations.data ?? []}
                    onCancel={() => setEditing(null)}
                    onDone={() => { setEditing(null); stock.reload({ silent: true }); }}
                  />
                ) : r.byLocation.length ? (
                  <span className="muted">{r.byLocation.map((b) => `${b.location.fullPath} ${formatQty(b.quantity)}`).join(' · ')}</span>
                ) : (
                  <span className="muted">—</span>
                ),
            },
            { key: 'value', label: 'Value', align: 'right', render: (r) => <span className="num">{formatMoney(r.value, { short: true })}</span> },
            { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.stockStatus} stock /> },
            {
              key: 'act', label: '', align: 'right', render: (r) =>
                editing !== r.product.id && (
                  <button type="button" className="btn sm" onClick={() => setEditing(r.product.id)} disabled={!locations.data?.length}>
                    <Icon name="edit" /> Update
                  </button>
                ),
            },
          ]}
        />
        <Pagination meta={stock.meta} onPage={setPage} />
      </section>
    </div>
  );
}
