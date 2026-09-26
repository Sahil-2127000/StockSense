import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorState, FormError, Loading, Spinner } from '../../components/Feedback.jsx';
import { SelectField, TextAreaField, TextField } from '../../components/Fields.jsx';
import Icon from '../../components/Icon.jsx';
import { ConfirmDialog } from '../../components/Modal.jsx';
import StatusPill from '../../components/StatusPill.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useLive } from '../../hooks/useLive.js';
import { contactsService, locationsService } from '../../services/crud.service.js';
import { operationsService } from '../../services/operations.service.js';
import { productsService } from '../../services/products.service.js';
import { OPERATION_TYPES } from '../../utils/constants.js';
import { formatDate, formatDateTime, formatQty, fromDateInput, toDateInput } from '../../utils/format.js';

const emptyLine = () => ({ key: Math.random().toString(36).slice(2), productId: '', quantity: '' });

function Steps({ type, status }) {
  const flow = type === 'RECEIPT' ? ['DRAFT', 'READY', 'DONE'] : ['DRAFT', 'WAITING', 'READY', 'DONE'];
  if (status === 'CANCELLED') return <StatusPill status="CANCELLED" />;
  const current = flow.indexOf(status);
  return (
    <div className="steps" aria-label="Status">
      {flow.map((s, i) => {
        // WAITING is skipped when a delivery goes straight to READY
        const skipped = s === 'WAITING' && status !== 'WAITING';
        const cls = i === current ? `cur${s === 'WAITING' ? ' w' : ''}` : i < current && !skipped ? 'past' : '';
        return (
          <span key={s} className={cls} aria-current={i === current ? 'step' : undefined}>
            {i < current && !skipped && <Icon name="check" />}
            {s === 'DRAFT' ? 'Draft' : s === 'WAITING' ? 'Waiting' : s === 'READY' ? 'Ready' : 'Done'}
          </span>
        );
      })}
    </div>
  );
}

function Activity({ operation }) {
  const events = [
    { cls: '', title: 'Created', who: operation.responsible.fullName, at: operation.createdAt },
    ...(operation.status !== 'DRAFT' && operation.status !== 'CANCELLED'
      ? [{ cls: 'b', title: 'Marked as To Do', who: operation.responsible.fullName, at: operation.updatedAt }]
      : []),
    ...(operation.status === 'WAITING' ? [{ cls: 'y', title: 'Waiting for stock', at: operation.updatedAt }] : []),
    ...(operation.doneAt ? [{ cls: 'g', title: 'Validated, stock moved', at: operation.doneAt }] : []),
    ...(operation.status === 'CANCELLED' ? [{ cls: 'y', title: 'Cancelled', at: operation.updatedAt }] : []),
  ].reverse();
  return (
    <section className="panel">
      <div className="panel-h"><h2>Activity</h2></div>
      <div className="tl">
        {events.map((e) => (
          <div key={e.title} className={e.cls}>
            <span />
            <span>
              <b>{e.title}</b>
              <small>{[e.who, formatDateTime(e.at)].filter(Boolean).join(' · ')}</small>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function OperationForm({ type }) {
  const meta = OPERATION_TYPES[type];
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const operation = useApi(() => operationsService.get(id), [id], { enabled: !isNew });
  const op = operation.data;
  useDocumentTitle(isNew ? `New ${meta.label.toLowerCase()}` : op?.reference);
  useLive('operation:updated', (e) => !isNew && e.id === Number(id) && !editingRef.dirty && operation.reload({ silent: true }));

  const contacts = useApi(() => (meta.contactType ? contactsService.list({ type: meta.contactType, limit: 100 }) : Promise.resolve({ data: [], meta: null })), [type]);
  const locations = useApi(() => locationsService.list({ type: 'INTERNAL', limit: 100 }), []);
  const products = useApi(() => productsService.list({ isActive: true, limit: 100 }), []);

  const editable = isNew || op?.status === 'DRAFT';
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Local editable copy of the operation (created once the operation has loaded)
  const current = useMemo(() => {
    if (form) return form;
    if (isNew) return { contactId: '', sourceLocationId: '', destLocationId: '', scheduleDate: toDateInput(), notes: '', lines: [emptyLine()] };
    if (!op) return null;
    return {
      contactId: op.contactId ?? '',
      sourceLocationId: op.sourceLocationId,
      destLocationId: op.destLocationId,
      scheduleDate: toDateInput(op.scheduleDate),
      notes: op.notes ?? '',
      lines: op.lines.map((l) => ({ key: String(l.id), productId: l.productId, quantity: String(Number(l.quantity)) })),
    };
  }, [form, isNew, op]);
  const editingRef = { dirty: Boolean(form) };

  const update = (patch) => {
    setForm({ ...current, ...patch });
    setErrors({});
  };
  const updateLine = (key, patch) => update({ lines: current.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) });

  const productMap = useMemo(() => Object.fromEntries((products.data ?? []).map((p) => [p.id, p])), [products.data]);
  const availability = useMemo(() => Object.fromEntries((op?.availability ?? []).map((a) => [a.productId, a])), [op]);
  const contact = contacts.data?.find((c) => c.id === Number(current?.contactId)) ?? op?.contact;

  const validateForm = () => {
    const found = {};
    if (meta.contactType && !current.contactId) found.contactId = `Choose a ${meta.contactType === 'SUPPLIER' ? 'supplier' : 'customer'}`;
    if (meta.needsSource && !current.sourceLocationId) found.sourceLocationId = 'Choose a location';
    if (meta.needsDest && !current.destLocationId) found.destLocationId = 'Choose a location';
    if (type === 'TRANSFER' && current.sourceLocationId && String(current.sourceLocationId) === String(current.destLocationId)) {
      found.destLocationId = 'Destination must differ from the source';
    }
    const lines = current.lines.filter((l) => l.productId || l.quantity);
    if (!lines.length) found.lines = 'Add at least one product';
    const seen = new Set();
    lines.forEach((l, i) => {
      if (!l.productId) found[`lines.${i}.productId`] = 'Choose a product';
      else if (seen.has(String(l.productId))) found[`lines.${i}.productId`] = 'Listed twice';
      seen.add(String(l.productId));
      if (!(Number(l.quantity) > 0)) found[`lines.${i}.quantity`] = 'Above 0';
    });
    return { found, lines };
  };

  const body = (lines) => ({
    ...(meta.contactType && { contactId: Number(current.contactId) }),
    ...(meta.needsSource && { sourceLocationId: Number(current.sourceLocationId) }),
    ...(meta.needsDest && { destLocationId: Number(current.destLocationId) }),
    scheduleDate: fromDateInput(current.scheduleDate),
    notes: current.notes.trim(),
    lines: lines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity) })),
  });

  // Saves the draft; returns the operation id (or null when validation fails)
  const save = async () => {
    const { found, lines } = validateForm();
    setErrors(found);
    if (Object.keys(found).length) return null;
    setError(null);
    try {
      if (isNew) {
        const created = await operationsService.create({ type, ...body(lines) });
        toast.success(`${created.reference} saved as draft`);
        setForm(null);
        navigate(`${meta.path}/${created.id}`, { replace: true });
        return created.id;
      }
      const saved = await operationsService.update(op.id, body(lines));
      operation.setData(saved);
      setForm(null);
      return saved.id;
    } catch (err) {
      setErrors(err.fieldErrors ?? {});
      setError(err);
      return null;
    }
  };

  const act = async (name, action, success) => {
    setBusy(name);
    try {
      const result = await action();
      if (result) {
        operation.setData(result);
        if (success) toast[result.status === 'WAITING' ? 'warn' : 'success'](success(result));
      }
    } catch (err) {
      setError(err);
      toast.error(err.message);
      operation.reload({ silent: true });
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const onSaveDraft = () => act('save', async () => { const savedId = await save(); if (savedId && !isNew) toast.success('Draft saved'); return null; });
  const onConfirm = () =>
    act('confirm', async () => {
      const savedId = form || isNew ? await save() : op.id;
      if (!savedId) return null;
      return operationsService.confirm(savedId);
    }, (r) => (r.status === 'WAITING' ? `${r.reference} is waiting: not enough stock yet` : `${r.reference} is ready`));

  if (!isNew && operation.loading && !op) return <div className="view"><Loading /></div>;
  if (!isNew && operation.error) {
    return (
      <div className="view">
        <ErrorState error={operation.error} onRetry={operation.reload} />
        <Link to={meta.path}>← Back to {meta.plural.toLowerCase()}</Link>
      </div>
    );
  }
  if (!current) return <div className="view"><Loading /></div>;

  const status = op?.status ?? 'DRAFT';
  const shortages = op?.availability?.filter((a) => !a.enough) ?? [];
  const locationOptions = (locations.data ?? []).map((l) => ({ value: l.id, label: `${l.fullPath} · ${l.name}` }));
  const canPrint = status === 'DONE' && type !== 'TRANSFER';
  // Current stock only matters while the operation is still open
  const showStockCol = editable || status === 'WAITING' || status === 'READY';

  return (
    <div className="view">
      <div className="crumb">
        <Link to={meta.path}>{meta.plural}</Link> <Icon name="right" style={{ width: 12, height: 12 }} /> <b>{isNew ? 'New' : op.reference}</b>
      </div>

      <div className="split" style={{ display: 'grid', gap: 18, alignItems: 'start' }}>
        <div className="doc">
          <div className="doc-bar">
            {editable && (
              <>
                <button type="button" className="btn pri" onClick={onConfirm} disabled={Boolean(busy)}>
                  {busy === 'confirm' ? <Spinner /> : <Icon name="check" />} Mark as To Do
                </button>
                <button type="button" className="btn" onClick={onSaveDraft} disabled={Boolean(busy) || (!isNew && !form)}>
                  {busy === 'save' && <Spinner />} Save draft
                </button>
              </>
            )}
            {(status === 'WAITING' || (status === 'READY' && type !== 'RECEIPT')) && (
              <button type="button" className={`btn${status === 'WAITING' ? ' pri' : ''}`} disabled={Boolean(busy)}
                onClick={() => act('check', () => operationsService.checkAvailability(op.id), (r) => (r.status === 'READY' ? 'Stock available: ready to validate' : 'Still waiting for stock'))}>
                {busy === 'check' ? <Spinner /> : <Icon name="refresh" />} Check availability
              </button>
            )}
            {status === 'READY' && (
              <button type="button" className="btn ok" disabled={Boolean(busy)} onClick={() => setConfirm('validate')}>
                <Icon name="check" /> Validate
              </button>
            )}
            {canPrint && (
              <Link to={`/operations/${op.id}/print`} className="btn"><Icon name="printer" /> Print</Link>
            )}
            {!isNew && ['DRAFT', 'WAITING', 'READY'].includes(status) && (
              <button type="button" className="btn dan" disabled={Boolean(busy)} onClick={() => setConfirm('cancel')}>Cancel</button>
            )}
            {!isNew && status === 'DRAFT' && (
              <button type="button" className="icon-btn dan" disabled={Boolean(busy)} onClick={() => setConfirm('delete')} aria-label="Delete draft">
                <Icon name="trash" />
              </button>
            )}
            <div className="sp" />
            {!isNew && <Steps type={type} status={status} />}
          </div>

          <div className="doc-body">
            <div className="doc-ref">
              <span className="mono">{isNew ? `New ${meta.label.toLowerCase()}` : op.reference}</span>
              {!isNew && <StatusPill status={status} />}
              {op?.isLate && <span className="late">Scheduled {formatDate(op.scheduleDate)}</span>}
            </div>

            {status === 'WAITING' && shortages.length > 0 && (
              <div className="banner w" role="alert">
                <Icon name="alert" className="i ic" />
                <div>
                  <b>Waiting for stock</b>
                  {shortages.map((s) => (
                    <p key={s.productId}>
                      {productMap[s.productId]?.name ?? op.lines.find((l) => l.productId === s.productId)?.product.name}: {formatQty(s.available)} available, {formatQty(s.requested)} requested.
                    </p>
                  ))}
                </div>
              </div>
            )}
            {status === 'DONE' && (
              <div className="banner g"><Icon name="check" className="i ic" /><div><b>Done {formatDateTime(op.doneAt)}</b><p>Stock has been updated and logged in the move history.</p></div></div>
            )}
            {status === 'CANCELLED' && (
              <div className="banner i"><div><b>Cancelled</b><p>No stock was moved.</p></div></div>
            )}

            <div className="grid2">
              {meta.contactType && (
                <div>
                  <SelectField
                    label={meta.contactLabel}
                    required={editable}
                    disabled={!editable}
                    value={current.contactId}
                    onChange={(e) => update({ contactId: e.target.value })}
                    error={errors.contactId}
                    placeholder={`Choose a ${meta.contactType === 'SUPPLIER' ? 'supplier' : 'customer'}…`}
                    options={(contacts.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
                  />
                  {contact?.address && (
                    <span className="help" style={{ display: 'block', marginTop: 6 }}>
                      <Icon name="pin" style={{ width: 12, height: 12, verticalAlign: -2 }} /> {type === 'DELIVERY' ? 'Delivery address: ' : ''}{contact.address}
                      {contact.phone ? ` · ${contact.phone}` : ''}
                    </span>
                  )}
                </div>
              )}
              <TextField
                label="Schedule date"
                type="date"
                disabled={!editable}
                value={current.scheduleDate}
                onChange={(e) => update({ scheduleDate: e.target.value })}
                error={errors.scheduleDate}
              />
              {meta.needsSource && (
                <SelectField
                  label="Source location"
                  required={editable}
                  disabled={!editable}
                  value={current.sourceLocationId}
                  onChange={(e) => update({ sourceLocationId: e.target.value })}
                  error={errors.sourceLocationId}
                  placeholder="Choose…"
                  options={locationOptions}
                />
              )}
              {meta.needsDest && (
                <SelectField
                  label="Destination"
                  required={editable}
                  disabled={!editable}
                  value={current.destLocationId}
                  onChange={(e) => update({ destLocationId: e.target.value })}
                  error={errors.destLocationId}
                  placeholder="Choose…"
                  options={locationOptions}
                />
              )}
              {!isNew && (
                <div className="fld">
                  <label>Responsible</label>
                  <div className="inp" style={{ background: 'var(--bg)' }}>{op.responsible.fullName} <span className="end help">auto-filled</span></div>
                </div>
              )}
            </div>

            {type === 'TRANSFER' && current.sourceLocationId && current.destLocationId && (
              <div className="route">
                <div className="end"><small>From</small><b>{locations.data?.find((l) => l.id === Number(current.sourceLocationId))?.name}</b><span className="mono">{locations.data?.find((l) => l.id === Number(current.sourceLocationId))?.fullPath}</span></div>
                <div className="arrow"><i />Move</div>
                <div className="end"><small>To</small><b>{locations.data?.find((l) => l.id === Number(current.destLocationId))?.name}</b><span className="mono">{locations.data?.find((l) => l.id === Number(current.destLocationId))?.fullPath}</span></div>
              </div>
            )}

            <div>
              <div className="sect" style={{ marginBottom: 8 }}>Products</div>
              <div className="table-wrap">
                <table className="t lines-table" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      {showStockCol && <th className="r">{meta.needsSource ? 'Available' : 'On hand'}</th>}
                      <th className="r">Quantity</th>
                      {editable && <th aria-label="Remove" />}
                    </tr>
                  </thead>
                  <tbody>
                    {current.lines.map((line, i) => {
                      const product = productMap[line.productId];
                      const avail = availability[line.productId];
                      const shown = op?.lines.find((l) => String(l.productId) === String(line.productId))?.product ?? product;
                      return (
                        <tr key={line.key} className={avail && !avail.enough ? 'bad' : undefined}>
                          <td>
                            {editable ? (
                              <>
                                <select
                                  className={`inp sm${errors[`lines.${i}.productId`] ? ' err' : ''}`}
                                  value={line.productId}
                                  onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                                  aria-label={`Product ${i + 1}`}
                                >
                                  <option value="">Choose a product…</option>
                                  {(products.data ?? []).map((p) => (
                                    <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>
                                  ))}
                                </select>
                                {errors[`lines.${i}.productId`] && <span className="help e">{errors[`lines.${i}.productId`]}</span>}
                              </>
                            ) : (
                              <div className="pname"><div><b>{shown?.name}</b><small>{shown?.sku}</small></div></div>
                            )}
                          </td>
                          {showStockCol && <td className="r num">
                            {avail ? (
                              <>
                                {formatQty(avail.available)}
                                <span className={`avail ${avail.enough ? 'ok' : 'no'}`}>{avail.enough ? 'Enough' : `Short ${formatQty(avail.requested - avail.available)}`}</span>
                              </>
                            ) : product ? formatQty(product.onHand, product.uom) : '—'}
                          </td>}
                          <td className="r qty">
                            {editable ? (
                              <>
                                <input
                                  className={`inp sm${errors[`lines.${i}.quantity`] ? ' err' : ''}`}
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={line.quantity}
                                  onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                                  aria-label={`Quantity ${i + 1}`}
                                  style={{ textAlign: 'right' }}
                                />
                                {errors[`lines.${i}.quantity`] && <span className="help e">{errors[`lines.${i}.quantity`]}</span>}
                              </>
                            ) : (
                              <b>{formatQty(line.quantity, shown?.uom)}</b>
                            )}
                          </td>
                          {editable && (
                            <td className="r">
                              <button type="button" className="icon-btn dan" onClick={() => update({ lines: current.lines.filter((l) => l.key !== line.key) })}
                                disabled={current.lines.length === 1} aria-label="Remove product">
                                <Icon name="trash" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {editable && (
                      <tr className="addrow">
                        <td colSpan={4}>
                          <button type="button" className="linkbtn" onClick={() => update({ lines: [...current.lines, emptyLine()] })}>
                            <Icon name="plus" /> Add a product
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {errors.lines && <span className="help e">{errors.lines}</span>}
            </div>

            <TextAreaField label="Notes" disabled={!editable} value={current.notes} onChange={(e) => update({ notes: e.target.value })} maxLength={500} placeholder="Optional instructions" />
            <FormError error={error} fields={Object.keys(errors)} />
          </div>
        </div>

        <div className="side-col">
          {type === 'RECEIPT' && status !== 'DONE' && status !== 'CANCELLED' && (
            <section className="panel">
              <div className="panel-h"><h2>On validation</h2></div>
              <div className="panel-b" style={{ paddingTop: 0, display: 'grid', gap: 8 }}>
                {current.lines.filter((l) => productMap[l.productId]).map((l) => {
                  const p = productMap[l.productId];
                  return (
                    <div key={l.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span>{p.name}</span>
                      <span className="num">{formatQty(p.onHand)} → <b className="qin">{formatQty(Number(p.onHand) + (Number(l.quantity) || 0))}</b></span>
                    </div>
                  );
                })}
                {!current.lines.some((l) => productMap[l.productId]) && <span className="muted">Add products to see the new stock levels.</span>}
              </div>
            </section>
          )}
          {op?.stockMoves?.length > 0 && (
            <section className="panel">
              <div className="panel-h"><h2>Stock moves</h2></div>
              <div className="panel-b" style={{ paddingTop: 0, display: 'grid', gap: 8 }}>
                {op.stockMoves.map((m) => (
                  <div key={m.id} style={{ display: 'grid', gap: 2 }}>
                    <b>{op.lines.find((l) => l.productId === m.productId)?.product.name} · {formatQty(m.quantity)}</b>
                    <span className="mono muted">{m.fromLocation.fullPath} → {m.toLocation.fullPath}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {!isNew && <Activity operation={op} />}
          <section className="panel">
            <div className="panel-h"><h2>Status guide</h2></div>
            <div className="panel-b" style={{ paddingTop: 0, display: 'grid', gap: 6 }}>
              <span><StatusPill status="DRAFT" /> Being prepared, can be edited</span>
              {type !== 'RECEIPT' && <span><StatusPill status="WAITING" /> Not enough stock at the source</span>}
              <span><StatusPill status="READY" /> Confirmed, waiting to be validated</span>
              <span><StatusPill status="DONE" /> Stock moved and logged</span>
            </div>
          </section>
        </div>
      </div>

      {confirm === 'validate' && (
        <ConfirmDialog
          title={`Validate ${op.reference}?`}
          message={type === 'RECEIPT' ? 'The received quantities will be added to stock.' : type === 'DELIVERY' ? 'The quantities will be removed from stock.' : 'The stock will move to the destination.'}
          confirmLabel="Validate"
          busy={busy === 'validate'}
          onClose={() => setConfirm(null)}
          onConfirm={() => act('validate', () => operationsService.validate(op.id), (r) => `${r.reference} done. Stock updated.`)}
        />
      )}
      {confirm === 'cancel' && (
        <ConfirmDialog
          title={`Cancel ${op.reference}?`}
          message="The operation stays in the history as cancelled. No stock will move."
          confirmLabel="Cancel operation"
          danger
          busy={busy === 'cancel'}
          onClose={() => setConfirm(null)}
          onConfirm={() => act('cancel', () => operationsService.cancel(op.id), (r) => `${r.reference} cancelled`)}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          title={`Delete ${op.reference}?`}
          message="This draft will be removed permanently."
          confirmLabel="Delete draft"
          danger
          busy={busy === 'delete'}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            act('delete', async () => {
              await operationsService.remove(op.id);
              toast.success(`${op.reference} deleted`);
              navigate(meta.path);
              return null;
            })
          }
        />
      )}
    </div>
  );
}
