import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DataTable, { Pagination, SearchBox } from '../../components/DataTable.jsx';
import { Empty, ErrorState, Loading } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import StatusPill from '../../components/StatusPill.jsx';
import { useWarehouse } from '../../context/WarehouseContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useLive } from '../../hooks/useLive.js';
import { usePage } from '../../hooks/usePage.js';
import { linesSummary } from '../../utils/operations.js';
import { operationsService } from '../../services/operations.service.js';
import { OPEN_STATUSES, OPERATION_TYPES } from '../../utils/constants.js';
import { formatDate, initials } from '../../utils/format.js';

const KANBAN = ['DRAFT', 'WAITING', 'READY', 'DONE'];

function Kanban({ rows, type, onOpen }) {
  const columns = KANBAN.filter((s) => type !== 'RECEIPT' || s !== 'WAITING');
  return (
    <div className="kb" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(230px, 1fr))` }}>
      {columns.map((status) => {
        const items = rows.filter((r) => r.status === status);
        return (
          <div className="kcol" key={status}>
            <h4><StatusPill status={status} /><em>{items.length}</em></h4>
            {items.length === 0 && <div className="empty">Nothing here</div>}
            {items.map((o) => (
              <button type="button" className="kc" key={o.id} onClick={() => onOpen(o)}>
                <div className="top2">
                  <span className="mono">{o.reference}</span>
                  <span className={o.isLate ? 'late num' : 'num muted'}>{formatDate(o.scheduleDate)}</span>
                </div>
                <div className="who2">{o.contact?.name ?? `${o.sourceLocation.fullPath} → ${o.destLocation.fullPath}`}</div>
                <div className="items">{linesSummary(o.lines)}</div>
                <div className="meta">
                  <span>→ {o.destLocation.fullPath}</span>
                  <span>{initials(o.responsible.fullName)} · {o.responsible.fullName.split(' ')[0]}</span>
                </div>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function OperationsList({ type }) {
  const meta = OPERATION_TYPES[type];
  useDocumentTitle(meta.plural);
  const navigate = useNavigate();
  const { warehouseId } = useWarehouse();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim());
  const view = params.get('view') === 'kanban' ? 'kanban' : 'list';
  const filter = params.get('status') ?? '';
  const [page, setPage] = usePage([type, q, warehouseId, filter].join('|'));

  const statusQuery = filter === 'LATE' ? undefined : filter || undefined;
  const lateQuery = filter === 'LATE' ? true : undefined;

  const summary = useApi(() => operationsService.summary({ type, warehouseId }), [type, warehouseId]);
  const list = useApi(
    () =>
      operationsService.list({
        type,
        q,
        warehouseId,
        status: view === 'kanban' ? undefined : statusQuery,
        late: view === 'kanban' ? undefined : lateQuery,
        page: view === 'kanban' ? 1 : page,
        limit: view === 'kanban' ? 100 : 20,
      }),
    [type, q, warehouseId, statusQuery, lateQuery, page, view]
  );
  useLive('operation:updated', (e) => {
    if (e.type === type) {
      list.reload({ silent: true });
      summary.reload({ silent: true });
    }
  });

  const setParam = (key, value) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });

  const s = summary.data;
  const chips = [
    ['', 'All', s?.total],
    [OPEN_STATUSES.join(','), 'To do', s && s.DRAFT + s.WAITING + s.READY],
    ['DRAFT', 'Draft', s?.DRAFT],
    ...(type !== 'RECEIPT' ? [['WAITING', 'Waiting', s?.WAITING]] : []),
    ['READY', 'Ready', s?.READY],
    ['DONE', 'Done', s?.DONE],
    ['LATE', 'Late', s?.late],
    ['CANCELLED', 'Cancelled', s?.CANCELLED],
  ];
  const open = (o) => navigate(`${meta.path}/${o.id}`);

  return (
    <div className="view">
      <PageHeader title={meta.plural} sub={meta.description}>
        <button type="button" className="btn pri" onClick={() => navigate(`${meta.path}/new`)}>
          <Icon name="plus" /> New {meta.label.toLowerCase()}
        </button>
      </PageHeader>

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Reference or contact" />
        {view === 'list' && (
          <div className="filters" role="group" aria-label="Status">
            {chips.map(([value, label, count]) => (
              <button type="button" key={label} className={`chip${filter === value ? ' on' : ''}`} onClick={() => setParam('status', value)}>
                {label} {count !== undefined && <b>{count}</b>}
              </button>
            ))}
          </div>
        )}
        <div className="sp" />
        <div className="seg" role="group" aria-label="View">
          <button type="button" className={view === 'list' ? 'on' : undefined} onClick={() => setParam('view', '')} aria-label="List view" aria-pressed={view === 'list'}>
            <Icon name="list" />
          </button>
          <button type="button" className={view === 'kanban' ? 'on' : undefined} onClick={() => setParam('view', 'kanban')} aria-label="Kanban view" aria-pressed={view === 'kanban'}>
            <Icon name="kanban" />
          </button>
        </div>
      </div>

      <ErrorState error={list.error} onRetry={list.reload} />

      {view === 'kanban' ? (
        list.data ? <Kanban rows={list.data} type={type} onOpen={open} /> : <Loading />
      ) : (
        <section className="panel">
          <DataTable
            loading={list.loading}
            rows={list.data}
            onRowClick={open}
            rowClass={(o) => (o.isLate ? 'bad' : undefined)}
            empty={
              <Empty icon={meta.icon} title={`No ${meta.plural.toLowerCase()} found`}
                action={<button type="button" className="btn pri sm" onClick={() => navigate(`${meta.path}/new`)}><Icon name="plus" /> New {meta.label.toLowerCase()}</button>}>
                {filter || q ? 'Try another filter or search.' : 'Create the first one.'}
              </Empty>
            }
            columns={[
              { key: 'ref', label: 'Reference', render: (o) => <span className="ref mono">{o.reference}</span> },
              { key: 'from', label: 'From', render: (o) => <span className="mono">{o.sourceLocation.fullPath}</span> },
              { key: 'to', label: 'To', render: (o) => <span className="mono">{o.destLocation.fullPath}</span> },
              ...(meta.contactType ? [{ key: 'contact', label: 'Contact', render: (o) => o.contact?.name ?? '—' }] : []),
              { key: 'products', label: 'Products', render: (o) => <span className="ellipsis" style={{ display: 'inline-block' }}>{linesSummary(o.lines)}</span> },
              { key: 'date', label: 'Schedule date', align: 'right', render: (o) => <span className={o.isLate ? 'late num' : 'num'}>{formatDate(o.scheduleDate)}</span> },
              { key: 'status', label: 'Status', render: (o) => <StatusPill status={o.status} /> },
            ]}
          />
          <Pagination meta={list.meta} onPage={setPage} />
        </section>
      )}
    </div>
  );
}
