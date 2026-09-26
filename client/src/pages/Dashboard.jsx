import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import { Empty, ErrorState, Loading } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useWarehouse } from '../context/WarehouseContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useLive } from '../hooks/useLive.js';
import { categoriesService, locationsService } from '../services/crud.service.js';
import { reportsService } from '../services/reports.service.js';
import { OPERATION_TYPES, operationPath } from '../utils/constants.js';
import { formatDate, formatMoney, formatQty, greeting } from '../utils/format.js';

const TONES = {
  in: ['var(--in-soft)', 'var(--in)'],
  out: ['var(--out-soft)', 'var(--out)'],
  warn: ['var(--warn-soft)', 'var(--warn)'],
  int: ['var(--int-soft)', 'var(--int)'],
  acc: ['var(--accent-soft)', 'var(--accent-ink)'],
};

function Kpi({ to, icon, tone, label, value, foot, footTone }) {
  const [bg, fg] = TONES[tone];
  return (
    <Link to={to} className="kpi">
      <span className="ic" style={{ background: bg, color: fg }}><Icon name={icon} /></span>
      <span className="lbl">{label}</span>
      <span className="val num">{value}</span>
      <span className="foot" style={{ color: footTone ? TONES[footTone][1] : 'var(--muted)' }}>{foot}</span>
    </Link>
  );
}

function OpCard({ type, pending, late, waiting, to }) {
  const meta = OPERATION_TYPES[type];
  const [bg, fg] = TONES[meta.tone === 'adj' ? 'warn' : meta.tone];
  return (
    <Link to={to} className="opc">
      <span className="big" style={{ background: bg, color: fg }}><Icon name={meta.icon} style={{ width: 22, height: 22 }} /></span>
      <div>
        <h3>{meta.plural}</h3>
        <div className="stat">
          <span><b>{pending}</b>to process</span>
          <span className="l"><b>{late}</b>late</span>
          {waiting !== undefined && <span className="w"><b>{waiting}</b>waiting</span>}
        </div>
      </div>
      <span className="btn sm">Open <Icon name="right" /></span>
    </Link>
  );
}

// Grouped bars: incoming (green), outgoing (red), internal (purple) per day
function MovementChart({ days }) {
  const max = Math.max(1, ...days.flatMap((d) => [d.incoming, d.outgoing, d.internal]));
  const label = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short' });
  return (
    <>
      <div className="chart" role="img" aria-label="Stock movement over the last 7 days">
        {days.map((d) => (
          <div className="col" key={d.day} title={`${formatDate(d.day)}: in ${formatQty(d.incoming)}, out ${formatQty(d.outgoing)}, internal ${formatQty(d.internal)}`}>
            <div className="bars">
              <i style={{ height: `${(d.incoming / max) * 100}%`, background: 'var(--in)' }} />
              <i style={{ height: `${(d.outgoing / max) * 100}%`, background: 'var(--out)' }} />
              <i style={{ height: `${(d.internal / max) * 100}%`, background: 'var(--int)' }} />
            </div>
            <span className="day">{label(d.day)}</span>
          </div>
        ))}
      </div>
      <div className="lg" style={{ padding: '12px 18px 16px' }}>
        <span><i style={{ background: 'var(--in)' }} />Incoming</span>
        <span><i style={{ background: 'var(--out)' }} />Outgoing</span>
        <span><i style={{ background: 'var(--int)' }} />Internal</span>
      </div>
    </>
  );
}

function Attention({ data }) {
  const items = [
    ...data.lowStock.map((p) => ({
      key: `p${p.product.id}`, to: `/products?open=${p.product.id}`, tone: p.status === 'OUT' ? 'out' : 'warn', icon: 'alert',
      title: p.product.name, tag: p.status === 'OUT' ? 'Out of stock' : 'Low stock',
      text: `${formatQty(p.onHand, p.product.uom)} left${p.minQty !== null ? ` · reorder at ${formatQty(p.minQty)}` : ''}${p.suggestedReorderQty ? ` · suggest ${formatQty(p.suggestedReorderQty, p.product.uom)}` : ''}`,
    })),
    ...data.waitingOperations.map((o) => ({
      key: `w${o.id}`, to: operationPath(o), tone: 'warn', icon: 'clock', title: o.reference, tag: 'Waiting',
      text: o.shortages.map((s) => `Needs ${formatQty(s.missing)} more ${s.product.name}`).join(' · '),
    })),
    ...data.lateOperations.map((o) => ({
      key: `l${o.id}`, to: operationPath(o), tone: 'out', icon: 'cal', title: o.reference, tag: 'Late',
      text: `${o.contact?.name ?? OPERATION_TYPES[o.type].label} · scheduled ${formatDate(o.scheduleDate)}`,
    })),
  ];

  if (!items.length) return <Empty icon="check" title="All clear">Nothing is low, late or waiting.</Empty>;

  return items.map((item) => {
    const [bg, fg] = TONES[item.tone];
    return (
      <Link key={item.key} to={item.to} className="al" style={{ textDecoration: 'none', color: 'inherit' }}>
        <span className="ic" style={{ background: bg, color: fg }}><Icon name={item.icon} /></span>
        <div>
          <b>{item.title} <small>{item.tag}</small></b>
          <p>{item.text}</p>
        </div>
      </Link>
    );
  });
}

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { warehouseId, warehouse } = useWarehouse();
  const navigate = useNavigate();
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');

  const categories = useApi(() => categoriesService.list({ limit: 100 }), []);
  const locations = useApi(() => locationsService.list({ limit: 100, type: 'INTERNAL', warehouseId }), [warehouseId]);
  const dash = useApi(
    () => reportsService.dashboard({ warehouseId, categoryId, locationId }),
    [warehouseId, categoryId, locationId]
  );
  useLive('dashboard:refresh', () => dash.reload({ silent: true }));

  const k = dash.data?.kpis;

  return (
    <div className="view">
      <div className="ph">
        <div>
          <h1>{greeting()}, {user.fullName.split(' ')[0]}</h1>
          <div className="sub">
            Snapshot of {warehouse ? warehouse.name : 'all warehouses'} · updated live
          </div>
        </div>
        <div className="sp" />
        <div className="filters">
          <select className="inp sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="inp sm" value={locationId} onChange={(e) => setLocationId(e.target.value)} aria-label="Filter by location">
            <option value="">All locations</option>
            {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.fullPath}</option>)}
          </select>
        </div>
      </div>

      <ErrorState error={dash.error} onRetry={dash.reload} />
      {!dash.data && dash.loading && <Loading />}

      {k && (
        <>
          <div className="kpis">
            <Kpi to="/stock?inStock=true" icon="box" tone="acc" label="Products in stock" value={k.totalProductsInStock} foot={`${formatQty(dash.data.stockValue.units)} units`} />
            <Kpi to="/products?stockStatus=LOW" icon="alert" tone="warn" label="Low / out of stock" value={k.lowStock + k.outOfStock}
              foot={`${k.lowStock} low · ${k.outOfStock} out`} footTone={k.outOfStock ? 'out' : undefined} />
            <Kpi to="/receipts?status=DRAFT,WAITING,READY" icon="down" tone="in" label="Pending receipts" value={k.pendingReceipts}
              foot={k.lateReceipts ? `${k.lateReceipts} late` : 'None late'} footTone={k.lateReceipts ? 'out' : undefined} />
            <Kpi to="/deliveries?status=DRAFT,WAITING,READY" icon="up" tone="out" label="Pending deliveries" value={k.pendingDeliveries}
              foot={`${k.waitingDeliveries} waiting · ${k.lateDeliveries} late`} footTone={k.waitingDeliveries || k.lateDeliveries ? 'warn' : undefined} />
            <Kpi to="/transfers?status=DRAFT,WAITING,READY" icon="swap" tone="int" label="Transfers scheduled" value={k.scheduledTransfers} foot="Internal moves" />
          </div>

          <div className="opcards">
            <OpCard type="RECEIPT" pending={k.pendingReceipts} late={k.lateReceipts} to="/receipts?status=DRAFT,WAITING,READY" />
            <OpCard type="DELIVERY" pending={k.pendingDeliveries} late={k.lateDeliveries} waiting={k.waitingDeliveries} to="/deliveries?status=DRAFT,WAITING,READY" />
          </div>

          <div className="grid-2">
            <div className="stack">
              <section className="panel">
                <div className="panel-h">
                  <div>
                    <h2>Stock movement</h2>
                    <small>Units in, out and between locations over the last 7 days</small>
                  </div>
                </div>
                <MovementChart days={dash.data.movement} />
              </section>
              <section className="panel">
                <div className="panel-h">
                  <h2>Recent operations</h2>
                  <div className="sp" />
                  <Link className="link" to="/move-history">Move history <Icon name="right" /></Link>
                </div>
                <DataTable
                  rows={dash.data.recentOperations}
                  onRowClick={(o) => navigate(operationPath(o))}
                  empty={<Empty icon="list" title="No operations yet">Create a receipt to bring stock in.</Empty>}
                  columns={[
                    { key: 'reference', label: 'Reference', render: (o) => <span className="mono ref">{o.reference}</span> },
                    { key: 'type', label: 'Type', render: (o) => OPERATION_TYPES[o.type].label },
                    { key: 'contact', label: 'Contact', render: (o) => o.contact?.name ?? <span className="muted">—</span> },
                    { key: 'date', label: 'Scheduled', render: (o) => formatDate(o.scheduleDate) },
                    { key: 'status', label: 'Status', render: (o) => <StatusPill status={o.status} /> },
                  ]}
                />
              </section>
            </div>
            <div className="stack">
              <section className="panel">
                <div className="panel-h">
                  <div>
                    <h2>Stock value</h2>
                    <small>Quantity × unit cost in warehouse locations</small>
                  </div>
                </div>
                <div className="panel-b" style={{ paddingTop: 0 }}>
                  <div className="value-big num">{formatMoney(dash.data.stockValue.value, { short: true })}</div>
                  <div className="muted">{formatQty(dash.data.stockValue.units)} units on hand</div>
                </div>
              </section>
              <section className="panel">
                <div className="panel-h">
                  <h2>Needs attention</h2>
                </div>
                <Attention data={dash.data.needsAttention} />
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
