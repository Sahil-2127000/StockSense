import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Icon from './Icon';

const NAV = [
  { heading: 'Overview' },
  { key: 'dashboard', to: '/', icon: 'home', label: 'Dashboard' },
  { heading: 'Inventory' },
  { key: 'products', to: '/products', icon: 'box', label: 'Products' },
  { key: 'stock', to: '/stock', icon: 'layers', label: 'Stock' },
  { heading: 'Operations' },
  { key: 'receipts', to: '/receipts', icon: 'down', label: 'Receipts' },
  { key: 'deliveries', to: '/deliveries', icon: 'up', label: 'Deliveries' },
  { key: 'transfers', to: '/transfers', icon: 'swap', label: 'Internal transfers' },
  { key: 'adjust', to: '/adjustments', icon: 'sliders', label: 'Adjustments' },
  { key: 'moves', to: '/move-history', icon: 'clock', label: 'Move history' },
  { heading: 'Settings' },
  { key: 'wh', to: '/warehouses', icon: 'wh', label: 'Warehouses' },
  { key: 'loc', to: '/locations', icon: 'pin', label: 'Locations' },
];

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="app">
      <aside className="side">
        <div className="logo">
          <Icon name="cube" style={{ width: 32, height: 32 }} />
          <div>
            <b>StockSense</b>
            <small>Inventory &amp; warehouse</small>
          </div>
        </div>

        {NAV.map((item, i) =>
          item.heading ? (
            <h6 key={i}>{item.heading}</h6>
          ) : (
            <Link key={item.key} to={item.to} className={pathname === item.to ? 'on' : ''}>
              <Icon name={item.icon} />
              {item.label}
            </Link>
          )
        )}

        <div className="grow" />

        <div className="me">
          <div className="row">
            <span className="av">PJ</span>
            <div>
              <b>Purvika Jain</b>
              <small>Inventory Manager</small>
            </div>
          </div>
          <div className="acts">
            <span><Icon name="user" />My profile</span>
            <span><Icon name="logout" />Log out</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="top">
          <div className="search">
            <Icon name="search" />
            <input placeholder="Search products or references" />
            <kbd>⌘K</kbd>
          </div>
          <span className="whsel">
            <span className="tag">WH</span>Main Warehouse
            <Icon name="chev" />
          </span>
          <div className="sp" />
          <span className="btn pri">
            <Icon name="plus" />New operation
            <Icon name="chev" />
          </span>
          <span className="bell">
            <Icon name="bell" />
            <em>3</em>
          </span>
          <div className="who">
            <span className="av">PJ</span>
            <div>
              <b>Purvika Jain</b>
              <small>Inventory Manager</small>
            </div>
          </div>
        </div>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}