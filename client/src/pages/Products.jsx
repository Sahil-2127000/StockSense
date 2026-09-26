import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable, { Pagination, SearchBox } from '../components/DataTable.jsx';
import { Empty, ErrorState, FormError, Loading, Spinner } from '../components/Feedback.jsx';
import { SelectField, TextField } from '../components/Fields.jsx';
import Icon from '../components/Icon.jsx';
import Modal, { ConfirmDialog } from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useWarehouse } from '../context/WarehouseContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useLive } from '../hooks/useLive.js';
import { usePage } from '../hooks/usePage.js';
import { categoriesService, locationsService } from '../services/crud.service.js';
import { productsService } from '../services/products.service.js';
import { formatMoney, formatQty } from '../utils/format.js';

const STATUS_CHIPS = [
  ['', 'All'],
  ['OK', 'In stock'],
  ['LOW', 'Low'],
  ['OUT', 'Out'],
];

function ProductForm({ product, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !product;
  const categories = useApi(() => categoriesService.list({ limit: 100 }), []);
  const locations = useApi(() => locationsService.list({ limit: 100, type: 'INTERNAL' }), [], { enabled: isNew });
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    categoryId: product?.category?.id ?? '',
    uom: product?.uom ?? 'pcs',
    unitCost: product?.unitCost ?? '',
    minQty: product?.reorderRule?.minQty ?? '',
    maxQty: product?.reorderRule?.maxQty ?? '',
    locationId: '',
    quantity: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((x) => ({ ...x, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter a product name';
    if (!/^[A-Za-z0-9-]{3,20}$/.test(form.sku.trim())) found.sku = '3–20 letters, digits or dashes';
    if (!form.categoryId) found.categoryId = 'Choose a category';
    if (!/^[A-Za-z]{1,10}$/.test(form.uom.trim())) found.uom = 'e.g. pcs, kg, roll';
    if (form.unitCost !== '' && !(Number(form.unitCost) >= 0)) found.unitCost = 'Enter a cost of 0 or more';
    const hasRule = form.minQty !== '' || form.maxQty !== '';
    if (hasRule && (form.minQty === '' || form.maxQty === '')) found.maxQty = 'Enter both min and max, or leave both empty';
    if (hasRule && Number(form.maxQty) < Number(form.minQty)) found.maxQty = 'Max must be at least min';
    if (isNew && (form.locationId || form.quantity) && (!form.locationId || !(Number(form.quantity) > 0))) {
      found.quantity = 'Choose a location and a quantity above 0, or leave both empty';
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    const body = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      categoryId: Number(form.categoryId),
      uom: form.uom.trim(),
      unitCost: form.unitCost === '' ? 0 : Number(form.unitCost),
    };
    setBusy(true);
    setError(null);
    try {
      let saved;
      if (isNew) {
        saved = await productsService.create({
          ...body,
          ...(hasRule && { reorderRule: { minQty: Number(form.minQty), maxQty: Number(form.maxQty) } }),
          ...(form.locationId && { initialStock: { locationId: Number(form.locationId), quantity: Number(form.quantity) } }),
        });
      } else {
        saved = await productsService.update(product.id, body);
        if (hasRule) saved = await productsService.setReorderRule(product.id, { minQty: Number(form.minQty), maxQty: Number(form.maxQty) });
        else if (product.reorderRule) saved = await productsService.removeReorderRule(product.id);
      }
      toast.success(isNew ? `${saved.name} created` : `${saved.name} saved`);
      onSaved(saved);
    } catch (err) {
      const fe = err.fieldErrors ?? {};
      setErrors({
        ...fe,
        minQty: fe['reorderRule.minQty'],
        maxQty: fe['reorderRule.maxQty'],
        quantity: fe['initialStock.quantity'] ?? fe['initialStock.locationId'],
      });
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isNew ? 'New product' : `Edit ${product.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="product-form" className="btn pri" disabled={busy}>{busy && <Spinner />} {isNew ? 'Create product' : 'Save'}</button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} noValidate className="form-grid">
        <div className="full"><TextField label="Name" required value={form.name} onChange={set('name')} error={errors.name} /></div>
        <TextField label="SKU / Code" required value={form.sku} onChange={set('sku')} error={errors.sku} className="mono" />
        <SelectField
          label="Category"
          required
          value={form.categoryId}
          onChange={set('categoryId')}
          error={errors.categoryId}
          placeholder="Choose…"
          options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        />
        <TextField label="Unit of measure" required value={form.uom} onChange={set('uom')} error={errors.uom} help="pcs, kg, roll…" />
        <TextField label="Unit cost (₹)" type="number" min="0" step="0.01" value={form.unitCost} onChange={set('unitCost')} error={errors.unitCost} />
        <div className="full sect">Reordering rule (optional)</div>
        <TextField label="Min quantity" type="number" min="0" step="any" value={form.minQty} onChange={set('minQty')} error={errors.minQty} help="Alert when stock falls to this" />
        <TextField label="Max quantity" type="number" min="0" step="any" value={form.maxQty} onChange={set('maxQty')} error={errors.maxQty} help="Refill up to this" />
        {isNew && (
          <>
            <div className="full sect">Initial stock (optional)</div>
            <SelectField
              label="Location"
              value={form.locationId}
              onChange={set('locationId')}
              placeholder="No initial stock"
              options={(locations.data ?? []).map((l) => ({ value: l.id, label: l.fullPath }))}
            />
            <TextField label="Quantity" type="number" min="0" step="any" value={form.quantity} onChange={set('quantity')} error={errors.quantity} help="Logged as an adjustment" />
          </>
        )}
        <div className="full"><FormError error={error} fields={['name', 'sku', 'categoryId', 'uom', 'unitCost', 'reorderRule.minQty', 'reorderRule.maxQty', 'initialStock.quantity', 'initialStock.locationId']} /></div>
      </form>
    </Modal>
  );
}

function ProductDrawer({ id, onClose, onEdit, onChanged }) {
  const { isManager } = useAuth();
  const toast = useToast();
  const detail = useApi(() => productsService.get(id), [id]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  useLive('stock:changed', ({ productIds }) => productIds.includes(id) && detail.reload({ silent: true }));

  const p = detail.data;
  const max = p ? Math.max(1, ...p.stockByLocation.map((s) => s.quantity)) : 1;

  const runConfirmed = async () => {
    setBusy(true);
    try {
      if (confirm === 'delete') {
        await productsService.remove(id);
        toast.success(`${p.name} deleted`);
        onChanged();
        onClose();
      } else {
        const saved = await productsService.update(id, { isActive: !p.isActive });
        toast.success(saved.isActive ? `${p.name} reactivated` : `${p.name} deactivated`);
        detail.setData(saved);
        onChanged();
      }
      setConfirm(null);
    } catch (err) {
      toast.error(err.message);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="drawer" aria-label="Product details">
      <div className="drawer-h">
        <span className="thumb"><Icon name="box" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="ellipsis">{p?.name ?? 'Loading…'}</h3>
          {p && <span className="mono muted">{p.sku} · {p.category.name}</span>}
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details"><Icon name="x" /></button>
      </div>
      {!p ? (
        detail.error ? <div className="drawer-b"><ErrorState error={detail.error} onRetry={detail.reload} /></div> : <Loading />
      ) : (
        <div className="drawer-b">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatusPill status={p.stockStatus} stock />
            {!p.isActive && <span className="pill gone">Inactive</span>}
          </div>
          <div className="rule">
            <div><small>On hand</small><b className="num">{formatQty(p.onHand)}</b> <span className="muted">{p.uom}</span></div>
            <div><small>Free to use</small><b className="num">{formatQty(p.free)}</b> <span className="muted">{p.uom}</span></div>
            <div><small>Unit cost</small><b className="num" style={{ fontSize: 16 }}>{formatMoney(p.unitCost)}</b></div>
            <div><small>Reserved</small><b className="num">{formatQty(p.reserved)}</b></div>
          </div>
          <div className="sect">Stock by location</div>
          {p.stockByLocation.length === 0 && <span className="muted">No stock in any location.</span>}
          {p.stockByLocation.map((s) => (
            <div className="locbar" key={s.location.id}>
              <div className="l">
                <span><span className="mono">{s.location.fullPath}</span> <span className="muted">· {s.location.name}</span></span>
                <span className="num">{formatQty(s.quantity, p.uom)}</span>
              </div>
              <div className="track"><i style={{ width: `${(s.quantity / max) * 100}%` }} /></div>
            </div>
          ))}
          <div className="sect">Reordering rule</div>
          {p.reorderRule ? (
            <div className="rule">
              <div><small>Min</small><b className="num">{formatQty(p.reorderRule.minQty)}</b></div>
              <div><small>Max</small><b className="num">{formatQty(p.reorderRule.maxQty)}</b></div>
            </div>
          ) : (
            <span className="muted">No rule. Low-stock alerts need a minimum quantity.</span>
          )}
          {p.suggestedReorderQty > 0 && (
            <div className="banner w">
              <Icon name="alert" className="i ic" />
              <div>
                <b>Reorder suggested</b>
                <p>Order {formatQty(p.suggestedReorderQty, p.uom)} to get back to the maximum.</p>
              </div>
            </div>
          )}
          {isManager && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={() => onEdit(p)}><Icon name="edit" /> Edit</button>
              <button type="button" className="btn" onClick={() => setConfirm('toggle')}>{p.isActive ? 'Deactivate' : 'Reactivate'}</button>
              <button type="button" className="btn dan" onClick={() => setConfirm('delete')}><Icon name="trash" /> Delete</button>
            </div>
          )}
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm === 'delete' ? 'Delete product?' : p.isActive ? 'Deactivate product?' : 'Reactivate product?'}
          message={
            confirm === 'delete'
              ? `${p.name} will be removed. Products with stock history cannot be deleted; deactivate them instead.`
              : p.isActive
                ? `${p.name} will be hidden from new operations. Its history stays.`
                : `${p.name} can be used in operations again.`
          }
          confirmLabel={confirm === 'delete' ? 'Delete' : p.isActive ? 'Deactivate' : 'Reactivate'}
          danger={confirm === 'delete'}
          busy={busy}
          onConfirm={runConfirmed}
          onClose={() => setConfirm(null)}
        />
      )}
    </aside>
  );
}

export default function Products() {
  useDocumentTitle('Products');
  const { isManager } = useAuth();
  const { warehouseId } = useWarehouse();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebounce(search.trim());
  const [categoryId, setCategoryId] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const stockStatus = params.get('stockStatus') ?? '';
  const [page, setPage] = usePage([q, categoryId, stockStatus, warehouseId, includeInactive].join('|'));
  const openId = Number(params.get('open')) || null;
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [version, setVersion] = useState(0); // bumps after a save so the side panel reloads

  const categories = useApi(() => categoriesService.list({ limit: 100 }), []);
  const list = useApi(
    () => productsService.list({ q, page, limit: 20, categoryId, stockStatus, warehouseId, isActive: includeInactive ? undefined : true }),
    [q, page, categoryId, stockStatus, warehouseId, includeInactive]
  );
  useLive('stock:changed', () => list.reload({ silent: true }));

  const setParam = (key, value) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });

  return (
    <div className="view">
      <PageHeader title="Products" sub="Everything you stock, with live quantities per location">
        {isManager && (
          <button type="button" className="btn pri" onClick={() => setEditing(null)}><Icon name="plus" /> New product</button>
        )}
      </PageHeader>

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search name or SKU" />
        <select className="inp sm" style={{ width: 'auto' }} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="filters" role="group" aria-label="Stock status">
          {STATUS_CHIPS.map(([value, label]) => (
            <button type="button" key={label} className={`chip${stockStatus === value ? ' on' : ''}`} onClick={() => setParam('stockStatus', value)}>
              {label}
            </button>
          ))}
        </div>
        <div className="sp" />
        <label className="checkline">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} /> Show inactive
        </label>
      </div>

      <ErrorState error={list.error} onRetry={list.reload} />
      <div className={openId ? 'split' : undefined} style={openId ? { display: 'grid', gap: 18, alignItems: 'start' } : undefined}>
        <section className="panel">
          <DataTable
            loading={list.loading}
            rows={list.data}
            onRowClick={(p) => setParam('open', p.id)}
            rowClass={(p) => (p.id === openId ? 'sel' : p.stockStatus === 'OUT' ? 'bad' : undefined)}
            empty={
              <Empty title="No products found" action={isManager && <button type="button" className="btn pri sm" onClick={() => setEditing(null)}><Icon name="plus" /> New product</button>}>
                Try another search or filter.
              </Empty>
            }
            columns={[
              {
                key: 'name', label: 'Product', render: (p) => (
                  <div className="pname">
                    <span className="thumb"><Icon name="box" /></span>
                    <div><b>{p.name}</b><small>{p.sku}</small></div>
                  </div>
                ),
              },
              { key: 'category', label: 'Category', render: (p) => p.category.name },
              { key: 'uom', label: 'UoM' },
              { key: 'cost', label: 'Unit cost', align: 'right', render: (p) => <span className="num">{formatMoney(p.unitCost)}</span> },
              { key: 'onHand', label: 'On hand', align: 'right', render: (p) => <b className="num">{formatQty(p.onHand)}</b> },
              { key: 'free', label: 'Free', align: 'right', render: (p) => <span className="num">{formatQty(p.free)}</span> },
              { key: 'status', label: 'Status', render: (p) => (p.isActive ? <StatusPill status={p.stockStatus} stock /> : <span className="pill gone">Inactive</span>) },
            ]}
          />
          <Pagination meta={list.meta} onPage={setPage} />
        </section>
        {openId && (
          <ProductDrawer
            key={`${openId}-${version}`}
            id={openId}
            onClose={() => setParam('open', '')}
            onEdit={(p) => setEditing(p)}
            onChanged={() => list.reload({ silent: true })}
          />
        )}
      </div>

      {editing !== undefined && (
        <ProductForm
          product={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(saved) => {
            setEditing(undefined);
            setVersion((v) => v + 1);
            list.reload({ silent: true });
            setParam('open', saved.id);
          }}
        />
      )}
    </div>
  );
}
