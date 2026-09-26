import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { usePage } from '../hooks/usePage.js';
import DataTable, { Pagination, SearchBox } from './DataTable.jsx';
import { Empty, ErrorState, FormError, Spinner } from './Feedback.jsx';
import { SelectField, TextAreaField, TextField } from './Fields.jsx';
import Icon from './Icon.jsx';
import Modal, { ConfirmDialog } from './Modal.jsx';
import PageHeader from './PageHeader.jsx';

/*
 * Generic list + create / edit / delete page for master data.
 * fields: [{ name, label, type?: 'text'|'select'|'textarea'|'email'|'tel', options?, required?, help?,
 *            createOnly?, editOnly?, validate?(value, form) → message }]
 */
function RecordForm({ config, record, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !record;
  const fields = config.fields.filter((f) => (isNew ? !f.editOnly : !f.createOnly));
  const [form, setForm] = useState(() => config.toForm(record));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    fields.forEach((f) => {
      const value = String(form[f.name] ?? '').trim();
      if (f.required && !value) found[f.name] = `${f.label} is required`;
      else if (f.validate) {
        const message = f.validate(value, form);
        if (message) found[f.name] = message;
      }
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setError(null);
    try {
      const body = config.toBody(form, { isNew });
      const saved = isNew ? await config.service.create(body) : await config.service.update(record.id, body);
      toast.success(`${config.title(saved)} ${isNew ? 'created' : 'saved'}`);
      onSaved(saved);
    } catch (err) {
      setErrors(err.fieldErrors ?? {});
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const set = (name) => (e) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    setErrors((x) => ({ ...x, [name]: undefined }));
  };

  return (
    <Modal
      title={isNew ? `New ${config.singular}` : `Edit ${config.title(record)}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="record-form" className="btn pri" disabled={busy}>{busy && <Spinner />} {isNew ? 'Create' : 'Save'}</button>
        </>
      }
    >
      <form id="record-form" onSubmit={submit} noValidate style={{ display: 'grid', gap: 14 }}>
        {fields.map((f) => {
          const common = { label: f.label, required: f.required, value: form[f.name] ?? '', onChange: set(f.name), error: errors[f.name], help: f.help };
          if (f.type === 'select') {
            return <SelectField key={f.name} {...common} placeholder={f.placeholder ?? 'Choose…'} options={typeof f.options === 'function' ? f.options() : f.options} />;
          }
          if (f.type === 'textarea') return <TextAreaField key={f.name} {...common} maxLength={f.maxLength} />;
          return <TextField key={f.name} {...common} type={f.type ?? 'text'} maxLength={f.maxLength} className={f.mono ? 'mono' : ''} />;
        })}
        <FormError error={error} fields={fields.map((f) => f.name)} />
      </form>
    </Modal>
  );
}

export default function CrudPage({ config, filters, filterValues = {}, extraToolbar }) {
  useDocumentTitle(config.plural);
  const { isManager } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim());
  const filterKey = JSON.stringify(filterValues);
  const [page, setPage] = usePage(`${q}|${filterKey}`);
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const list = useApi(() => config.service.list({ q, page, limit: 20, ...filterValues }), [q, page, filterKey]);

  const remove = async () => {
    setBusy(true);
    try {
      await config.service.remove(deleting.id);
      toast.success(`${config.title(deleting)} deleted`);
      list.reload({ silent: true });
      config.onChange?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  const columns = [
    ...config.columns,
    ...(isManager
      ? [{
        key: 'actions', label: '', align: 'right', render: (r) => (
          <span className="nowrap" onClick={(e) => e.stopPropagation()}>
            {(!config.canEdit || config.canEdit(r)) && (
              <button type="button" className="icon-btn" onClick={() => setEditing(r)} aria-label={`Edit ${config.title(r)}`}><Icon name="edit" /></button>
            )}
            {(!config.canDelete || config.canDelete(r)) && (
              <button type="button" className="icon-btn dan" onClick={() => setDeleting(r)} aria-label={`Delete ${config.title(r)}`}><Icon name="trash" /></button>
            )}
          </span>
        ),
      }]
      : []),
  ];

  return (
    <div className="view">
      <PageHeader title={config.plural} sub={config.sub}>
        {isManager && (
          <button type="button" className="btn pri" onClick={() => setEditing(null)}><Icon name="plus" /> New {config.singular}</button>
        )}
      </PageHeader>
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={config.searchPlaceholder ?? 'Search'} />
        {filters}
        <div className="sp" />
        {extraToolbar}
      </div>
      <ErrorState error={list.error} onRetry={list.reload} />
      <section className="panel">
        <DataTable
          loading={list.loading}
          rows={list.data}
          onRowClick={isManager && config.rowEdit !== false ? (r) => (!config.canEdit || config.canEdit(r)) && setEditing(r) : undefined}
          empty={<Empty icon={config.icon} title={`No ${config.plural.toLowerCase()} found`}>{isManager ? `Create one with “New ${config.singular}”.` : 'Nothing has been added yet.'}</Empty>}
          columns={columns}
        />
        <Pagination meta={list.meta} onPage={setPage} />
      </section>
      {!isManager && <p className="help">Only managers can add or change {config.plural.toLowerCase()}.</p>}

      {editing !== undefined && (
        <RecordForm
          config={config}
          record={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            list.reload({ silent: true });
            config.onChange?.();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${config.title(deleting)}?`}
          message={config.deleteMessage ?? 'This cannot be undone. Records that are in use cannot be deleted.'}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
