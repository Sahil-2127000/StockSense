import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import IconSprite from './components/IconSprite';
import ReceiptsList from './pages/receipts/ReceiptsList';
import './styles/theme.css';

// Simple placeholder for pages that aren't built yet — swap these out
// one by one as you build each screen (DeliveriesList, ReceiptsKanban, etc.)
function Placeholder({ title }) {
  return (
    <div className="view">
      <div className="ph"><h1>{title}</h1></div>
      <div className="panel" style={{ padding: 24, color: 'var(--muted)' }}>
        Not built yet.
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <IconSprite />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Placeholder title="Dashboard" />} />
          <Route path="/products" element={<Placeholder title="Products" />} />
          <Route path="/stock" element={<Placeholder title="Stock" />} />
          <Route path="/receipts" element={<div className="view"><ReceiptsList /></div>} />
          <Route path="/deliveries" element={<Placeholder title="Deliveries" />} />
          <Route path="/transfers" element={<Placeholder title="Internal transfers" />} />
          <Route path="/adjustments" element={<Placeholder title="Adjustments" />} />
          <Route path="/move-history" element={<Placeholder title="Move history" />} />
          <Route path="/warehouses" element={<Placeholder title="Warehouses" />} />
          <Route path="/locations" element={<Placeholder title="Locations" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;