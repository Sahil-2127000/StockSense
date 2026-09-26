import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLiveStatus } from '../context/LiveContext.jsx';
import { useWarehouse } from '../context/WarehouseContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useLive } from '../hooks/useLive.js';
import { operationsService } from '../services/operations.service.js';
import { productsService } from '../services/products.service.js';
import { reportsService } from '../services/reports.service.js';
import { OPERATION_TYPES, operationPath } from '../utils/constants.js';
import { formatDate, formatQty, initials } from '../utils/format.js';
import Icon from './Icon.jsx';
import StatusPill from './StatusPill.jsx';

// Closes a dropdown when clicking outside it or pressing Escape
function useDismiss(open, setOpen) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);
  return ref;
}

const NAV = [
  { section: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: 'home', end: true }] },
  {
    section: 'Inventory',
    items: [
      { to: '/products', label: 'Products', icon: 'box' },
      { to: '/stock', label: 'Stock', icon: 'layers' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/receipts', label: 'Receipts', icon: 'down', count: 'RECEIPT' },
      { to: '/deliveries', label: 'Deliveries', icon: 'up', count: 'DELIVERY' },
      { to: '/transfers', label: 'Internal transfers', icon: 'swap', count: 'TRANSFER' },
      { to: '/adjustments', label: 'Adjustments', icon: 'sliders' },
      { to: '/move-history', label: 'Move history', icon: 'clock' },
    ],
  },
  {
    section: 'Settings',
    items: [
      { to: '/warehouses', label: 'Warehouses', icon: 'wh' },
      { to: '/locations', label: 'Locations', icon: 'pin' },
      { to: '/categories', label: 'Categories', icon: 'tag' },
      { to: '/contacts', label: 'Contacts', icon: 'book' },
      { to: '/users', label: 'Users', icon: 'users', manager: true },
    ],
  },
];

function Sidebar({ open, onClose }) {
  const { user, logout, isManager } = useAuth();
  const { warehouseId } = useWarehouse();
  const navigate = useNavigate();

  // Open (not done / cancelled) operations per type, shown as badges
  const counts = useApi(async () => {
    const types = ['RECEIPT', 'DELIVERY', 'TRANSFER'];
    const results = await Promise.all(types.map((type) => operationsService.summary({ type, warehouseId })));
    return Object.fromEntries(types.map((t, i) => [t, results[i].DRAFT + results[i].WAITING + results[i].READY]));
  }, [warehouseId]);
  useLive('operation:updated', () => counts.reload({ silent: true }));

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={`side${open ? ' open' : ''}`} aria-label="Main navigation">
      <button type="button" className="icon-btn close-nav" onClick={onClose} aria-label="Close menu">
        <Icon name="x" />
      </button>
      <Link to="/" className="logo" style={{ textDecoration: 'none' }} onClick={onClose}>
        <Icon name="cube" style={{ width: 30, height: 30 }} />
        <div>
          <b>StockSense</b>
          <small>Inventory &amp; warehouse</small>
        </div>
      </Link>
      <nav>
        {NAV.map((group) => (
          <div key={group.section}>
            <h6>{group.section}</h6>
            {group.items
              .filter((item) => !item.manager || isManager)
              .map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'on' : undefined)} onClick={onClose}>
                  <Icon name={item.icon} />
                  {item.label}
                  {item.count && counts.data?.[item.count] > 0 && <span className="cnt">{counts.data[item.count]}</span>}
                </NavLink>
              ))}
          </div>
        ))}
      </nav>
      <div className="grow" />
      <div className="me">
        <div className="row">
          <span className="av">{initials(user.fullName)}</span>
          <div style={{ minWidth: 0 }}>
            <b className="ellipsis" style={{ maxWidth: 150 }}>{user.fullName}</b>
            <small>{user.role === 'MANAGER' ? 'Inventory Manager' : 'Warehouse Staff'}</small>
          </div>
        </div>
        <div className="acts">
          <button type="button" onClick={() => { navigate('/profile'); onClose(); }}>
            <Icon name="user" /> My profile
          </button>
          <button type="button" onClick={onLogout}>
            <Icon name="logout" /> Log out
          </button>
        </div>
      </div>
    </aside>
  );
}

// Searches products (name / SKU) and operations (reference / contact) as you type
function GlobalSearch() {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const q = useDebounce(term.trim(), 250);
  const ref = useDismiss(open, setOpen);
  const navigate = useNavigate();

  const results = useApi(
    async () => {
      const [products, operations] = await Promise.all([
        productsService.list({ q, limit: 5 }),
        operationsService.list({ q, limit: 5 }),
      ]);
      return { products: products.data, operations: operations.data };
    },
    [q],
    { enabled: q.length >= 2 }
  );

  const go = (path) => {
    setOpen(false);
    setTerm('');
    navigate(path);
  };

  const hasResults = results.data && (results.data.products.length || results.data.operations.length);

  return (
    <div className="search rel" ref={ref}>
      <Icon name="search" />
      <input
        value={term}
        onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && term.trim() && go(`/products?q=${encodeURIComponent(term.trim())}`)}
        placeholder="Search SKU, product or reference"
        aria-label="Search products and operations"
      />
      <kbd>↵</kbd>
      {open && q.length >= 2 && (
        <div className="dropdown">
          {results.loading && !results.data && <div className="dd-empty">Searching…</div>}
          {results.data && !hasResults && <div className="dd-empty">No matches for “{q}”</div>}
          {results.data?.products.length > 0 && <div className="dd-sect">Products</div>}
          {results.data?.products.map((p) => (
            <button type="button" key={`p${p.id}`} className="dd-item" onClick={() => go(`/products?q=${encodeURIComponent(p.sku)}&open=${p.id}`)}>
              <Icon name="box" />
              <div style={{ flex: 1 }}>
                {p.name} <small className="mono">{p.sku} · {formatQty(p.onHand, p.uom)} on hand</small>
              </div>
              <StatusPill status={p.stockStatus} stock />
            </button>
          ))}
          {results.data?.operations.length > 0 && <div className="dd-sect">Operations</div>}
          {results.data?.operations.map((o) => (
            <button type="button" key={`o${o.id}`} className="dd-item" onClick={() => go(operationPath(o))}>
              <Icon name={OPERATION_TYPES[o.type].icon} />
              <div style={{ flex: 1 }}>
                <span className="mono">{o.reference}</span>
                <small>{o.contact?.name ?? OPERATION_TYPES[o.type].label} · {formatDate(o.scheduleDate)}</small>
              </div>
              <StatusPill status={o.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WarehousePicker() {
  const { warehouses, warehouse, setWarehouseId } = useWarehouse();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, setOpen);

  return (
    <div className="rel" ref={ref}>
      <button type="button" className="whsel" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="tag">{warehouse?.shortCode ?? 'ALL'}</span>
        <span className="wh-name">{warehouse?.name ?? 'All warehouses'}</span>
        <Icon name="chev" />
      </button>
      {open && (
        <div className="dropdown" style={{ width: 260 }} role="listbox">
          <div className="dd-h">Warehouse</div>
          <div className="dd-list">
            {[{ id: null, name: 'All warehouses', shortCode: 'ALL' }, ...warehouses].map((w) => (
              <button
                type="button"
                key={w.id ?? 'all'}
                className="dd-item"
                role="option"
                aria-selected={(warehouse?.id ?? null) === w.id}
                onClick={() => { setWarehouseId(w.id); setOpen(false); }}
              >
                <span className="mono" style={{ minWidth: 34 }}>{w.shortCode}</span>
                <span style={{ flex: 1 }}>{w.name}</span>
                {(warehouse?.id ?? null) === w.id && <Icon name="check" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewOperationMenu() {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, setOpen);
  const navigate = useNavigate();
  const items = [
    ['RECEIPT', '/receipts/new'],
    ['DELIVERY', '/deliveries/new'],
    ['TRANSFER', '/transfers/new'],
    ['ADJUSTMENT', '/adjustments'],
  ];
  return (
    <div className="rel" ref={ref}>
      <button type="button" className="btn pri" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        <Icon name="plus" /> <span className="wh-name">New operation</span>
      </button>
      {open && (
        <div className="dropdown" style={{ width: 250 }} role="menu">
          {items.map(([type, path]) => (
            <button type="button" key={type} className="dd-item" role="menuitem" onClick={() => { setOpen(false); navigate(path); }}>
              <Icon name={OPERATION_TYPES[type].icon} />
              <div>
                {OPERATION_TYPES[type].label}
                <small>{OPERATION_TYPES[type].description}</small>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Needs-attention items from the dashboard + live low-stock alerts
function AlertsBell() {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, setOpen);
  const { warehouseId } = useWarehouse();
  const { unread, markRead } = useLiveStatus();
  const navigate = useNavigate();
  const attention = useApi(() => reportsService.dashboard({ warehouseId }).then((d) => d.needsAttention), [warehouseId]);
  useLive('dashboard:refresh', () => attention.reload({ silent: true }));

  const items = attention.data
    ? [
      ...attention.data.lowStock.map((p) => ({
        key: `p${p.product.id}`,
        icon: 'alert',
        title: `${p.product.name}: ${p.status === 'OUT' ? 'out of stock' : 'low stock'}`,
        sub: `${formatQty(p.onHand, p.product.uom)} left${p.suggestedReorderQty ? ` · reorder ${formatQty(p.suggestedReorderQty, p.product.uom)}` : ''}`,
        to: `/products?open=${p.product.id}`,
      })),
      ...attention.data.waitingOperations.map((o) => ({
        key: `w${o.id}`,
        icon: 'clock',
        title: `${o.reference} is waiting for stock`,
        sub: o.shortages.map((s) => `needs ${formatQty(s.missing)} more ${s.product.name}`).join(', '),
        to: operationPath(o),
      })),
      ...attention.data.lateOperations.map((o) => ({
        key: `l${o.id}`,
        icon: 'cal',
        title: `${o.reference} is late`,
        sub: `Scheduled ${formatDate(o.scheduleDate)}`,
        to: operationPath(o),
      })),
    ]
    : [];
  const count = items.length + unread;

  return (
    <div className="rel" ref={ref}>
      <button
        type="button"
        className="bell"
        onClick={() => { setOpen((v) => !v); markRead(); }}
        aria-label={`Alerts (${count})`}
        aria-expanded={open}
      >
        <Icon name="bell" />
        {count > 0 && <em>{count > 99 ? '99+' : count}</em>}
      </button>
      {open && (
        <div className="dropdown">
          <div className="dd-h">
            Needs attention <span className="muted" style={{ fontWeight: 600 }}>{items.length}</span>
          </div>
          <div className="dd-list">
            {items.length === 0 && <div className="dd-empty">All clear. Nothing needs attention.</div>}
            {items.map((item) => (
              <button type="button" key={item.key} className="dd-item" onClick={() => { setOpen(false); navigate(item.to); }}>
                <Icon name={item.icon} />
                <div>
                  {item.title}
                  <small>{item.sub}</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Topbar({ onMenu }) {
  const { user } = useAuth();
  const { connected } = useLiveStatus();
  return (
    <header className="top">
      <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu">
        <Icon name="menu" />
      </button>
      <GlobalSearch />
      <WarehousePicker />
      <div className="sp" />
      <NewOperationMenu />
      <AlertsBell />
      <Link to="/profile" className="who" style={{ textDecoration: 'none' }} title={connected ? 'Live updates on' : 'Live updates offline'}>
        <span className="av" style={{ position: 'relative' }}>
          {initials(user.fullName)}
          <i
            style={{
              position: 'absolute', right: -3, bottom: -3, width: 10, height: 10, borderRadius: '50%',
              border: '2px solid #fff', background: connected ? 'var(--in)' : '#C5CEDD',
            }}
          />
        </span>
        <div>
          <b>{user.fullName}</b>
          <small>{user.role === 'MANAGER' ? 'Manager' : 'Staff'}</small>
        </div>
      </Link>
    </header>
  );
}

export default function Layout() {
  const location = useLocation();
  // Remember which page the menu was opened on, so navigating closes it
  const [openedOn, setOpenedOn] = useState(null);
  const navOpen = openedOn === location.pathname;
  const setNavOpen = (open) => setOpenedOn(open ? location.pathname : null);

  return (
    <div className="app">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div className="scrim-nav" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <div className="main">
        <Topbar onMenu={() => setNavOpen(true)} />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
