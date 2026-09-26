import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable, { Pagination } from '../../components/DataTable.jsx';
import { Empty, FormError, Spinner } from '../../components/Feedback.jsx';
import { SelectField, TextField } from '../../components/Fields.jsx';
import Icon from '../../components/Icon.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useWarehouse } from '../../context/WarehouseContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useLive } from '../../hooks/useLive.js';
import { locationsService } from '../../services/crud.service.js';
import { operationsService } from '../../services/operations.service.js';
import { productsService } from '../../services/products.service.js';
import { formatDateTime, formatQty } from '../../utils/format.js';

export default function Adjustments() {
  useDocumentTitle('Stock adjustment');
  const toast = useToast();
  const navigate = useNavigate();
  const { warehouseId } = useWarehouse();
  const [form, setForm] = useState({ productId: '', locationId: '', countedQuantity: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);

  const products = useApi(() => productsService.list({ isActive: true, limit: 100 }), []);
  const locations = useApi(() => locationsService.list({ type: 'INTERNAL', limit: 100, warehouseId }), [warehouseId]);
  const product = useApi(() => productsService.get(Number(form.productId)), [form.productId], { enabled: Boolean(form.productId) });
  const recent = useApi(() => operationsService.list({ type: 'ADJUSTMENT', warehouseId, page, limit: 10 }), [warehouseId, page]);
  useLive('operation:updated', (e) => e.type === 'ADJUSTMENT' && recent.reload({ silent: true }));

  // Until the user picks one, default to the location that holds this product
  const locationId = form.locationId || String(product.data?.stockByLocation[0]?.location.id ?? '');
  const recorded = product.data?.stockByLocation.find((s) => s.location.id === Number(locationId))?.quantity ?? 0;
  const difference = form.countedQuantity === '' ? null : Number(form.countedQuantity) - recorded;
  const uom = product.data?.uom;

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value, ...(field === 'productId' && { locationId: '', countedQuantity: '' }) }));
    setErrors({});
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.productId) found.productId = 'Choose a product';
    if (!locationId) found.locationId = 'Choose a location';
    if (form.countedQuantity === '' || Number(form.countedQuantity) < 0) found.countedQuantity = 'Enter the counted quantity (0 or more)';
    else if (difference === 0) found.countedQuantity = 'Count matches the recorded stock, nothing to adjust';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setError(null);
    try {
      const op = await operationsService.adjust({
        productId: Number(form.productId),
        locationId: Number(locationId),
        countedQuantity: Number(form.countedQuantity),
        reason: form.reason.trim() || undefined,
      });
      toast.success(`${op.reference}: ${difference > 0 ? '+' : ''}${formatQty(difference, uom)} logged`);
      setForm((f) => ({ ...f, countedQuantity: '', reason: '' }));
      product.reload({ silent: true });
      recent.reload({ silent: true });
    } catch (err) {
      setErrors(err.fieldErrors ?? {});
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view">
      <PageHeader title="Stock adjustment" sub="Pick product and location, enter the physical count; the difference is logged." />
      <div className="grid-2e">
        <form className="panel" onSubmit={submit} noValidate>
          <div className="panel-h"><h2>New count</h2></div>
          <div className="panel-b" style={{ display: 'grid', gap: 14, paddingTop: 4 }}>
            <SelectField label="Product" required value={form.productId} onChange={set('productId')} error={errors.productId} placeholder="Choose a product…"
              options={(products.data ?? []).map((p) => ({ value: p.id, label: `${p.name} · ${p.sku}` }))} />
            <SelectField label="Location" required value={locationId} onChange={set('locationId')} error={errors.locationId} placeholder="Choose a location…"
              options={(locations.data ?? []).map((l) => ({ value: l.id, label: `${l.fullPath} · ${l.name}` }))} />
            <div className="form-grid">
              <div className="fld">
                <label>Recorded</label>
                <div className="inp" style={{ background: 'var(--bg)' }}>
                  {product.loading && form.productId ? <Spinner /> : formatQty(locationId ? recorded : null, uom)}
                </div>
              </div>
              <TextField label="Counted" required type="number" min="0" step="any" value={form.countedQuantity} onChange={set('countedQuantity')} error={errors.countedQuantity} />
            </div>
            <div className="fld">
              <label>Difference</label>
              <div className="inp" style={{ background: 'var(--bg)' }}>
                {difference === null ? '—' : (
                  <span className={`diff ${difference > 0 ? 'pos' : difference < 0 ? 'neg' : ''}`}>
                    {difference > 0 ? '+' : ''}{formatQty(difference, uom)} {difference > 0 ? '(gain)' : difference < 0 ? '(loss)' : ''}
                  </span>
                )}
              </div>
            </div>
            <TextField label="Reason" value={form.reason} onChange={set('reason')} placeholder="e.g. 3 kg damaged, cycle count" maxLength={200} />
            <FormError error={error} fields={['productId', 'locationId', 'countedQuantity']} />
            <div className="form-actions">
              <button type="submit" className="btn pri" disabled={busy}>{busy ? <Spinner /> : <Icon name="check" />} Apply adjustment</button>
            </div>
          </div>
        </form>

        <section className="panel">
          <div className="panel-h"><h2>Recent adjustments</h2></div>
          <DataTable
            loading={recent.loading}
            rows={recent.data}
            onRowClick={(o) => navigate(`/adjustments/${o.id}`)}
            empty={<Empty icon="sliders" title="No adjustments yet" />}
            columns={[
              { key: 'ref', label: 'Reference', render: (o) => <span className="ref mono">{o.reference}</span> },
              { key: 'product', label: 'Product', render: (o) => o.lines[0]?.product.name },
              {
                key: 'qty', label: 'Change', align: 'right', render: (o) => {
                  const gain = o.sourceLocation.type === 'ADJUSTMENT';
                  return <b className={gain ? 'qin' : 'qout'}>{gain ? '+' : '−'}{formatQty(o.lines[0]?.quantity, o.lines[0]?.product.uom)}</b>;
                },
              },
              { key: 'loc', label: 'Location', render: (o) => <span className="mono">{o.sourceLocation.type === 'ADJUSTMENT' ? o.destLocation.fullPath : o.sourceLocation.fullPath}</span> },
              { key: 'when', label: 'When', render: (o) => formatDateTime(o.doneAt) },
            ]}
          />
          <Pagination meta={recent.meta} onPage={setPage} />
        </section>
      </div>
    </div>
  );
}
