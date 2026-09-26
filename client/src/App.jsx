import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import IconSprite from './components/IconSprite';
import ReceiptsList from './pages/receipts/ReceiptsList';
import ReceiptForm from './pages/receipts/ReceiptForm';
import ReceiptsKanban from './pages/receipts/ReceiptsKanban';
import ReceiptSlip from './pages/receipts/ReceiptSlip';
import TransferForm from './pages/transfers/TransferForm';
import AdjustmentForm from './pages/adjustments/AdjustmentForm';
import MoveHistory from './pages/history/MoveHistory';
import Profile from './pages/profile/Profile';
import Locations from './pages/settings/Locations';
import Warehouses from './pages/settings/Warehouses';
import './styles/theme.css';

// Simple placeholder for pages that aren't built yet — swap these out
// one by one as you build each screen (DeliveriesList, etc.)
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
          <Route path="/receipts/:id" element={<ReceiptForm />} />
          <Route path="/receipts-kanban" element={<ReceiptsKanban />} />
          <Route path="/receipts/:id/print" element={<ReceiptSlip />} />
          <Route path="/deliveries" element={<Placeholder title="Deliveries" />} />
          <Route path="/transfers" element={<TransferForm />} />
          <Route path="/adjustments" element={<AdjustmentForm />} />
          <Route path="/move-history" element={<MoveHistory />} />
          <Route path="/warehouses" element={<Warehouses />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;