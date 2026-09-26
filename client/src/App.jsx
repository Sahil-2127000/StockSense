import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestOnly, ManagerOnly, RequireAuth } from './components/Guards.jsx';
import IconSprite from './components/IconSprite.jsx';
import Layout from './components/Layout.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import Login from './pages/auth/Login.jsx';
import Signup from './pages/auth/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MoveHistory from './pages/MoveHistory.jsx';
import NotFound from './pages/NotFound.jsx';
import AdjustmentDetail from './pages/operations/AdjustmentDetail.jsx';
import Adjustments from './pages/operations/Adjustments.jsx';
import OperationForm from './pages/operations/OperationForm.jsx';
import OperationsList from './pages/operations/OperationsList.jsx';
import PrintSlip from './pages/operations/PrintSlip.jsx';
import Products from './pages/Products.jsx';
import Profile from './pages/Profile.jsx';
import Categories from './pages/settings/Categories.jsx';
import Contacts from './pages/settings/Contacts.jsx';
import Locations from './pages/settings/Locations.jsx';
import Warehouses from './pages/settings/Warehouses.jsx';
import Stock from './pages/Stock.jsx';
import Users from './pages/Users.jsx';

const OPERATION_ROUTES = [
  ['receipts', 'RECEIPT'],
  ['deliveries', 'DELIVERY'],
  ['transfers', 'TRANSFER'],
];

export default function App() {
  return (
    <>
      <IconSprite />
      <Routes>
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
        <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
        <Route path="/operations/:id/print" element={<RequireAuth><PrintSlip /></RequireAuth>} />

        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="stock" element={<Stock />} />
          {OPERATION_ROUTES.map(([path, type]) => (
            <Route key={path} path={path}>
              {/* key={type} remounts the page when switching between types */}
              <Route index element={<OperationsList key={type} type={type} />} />
              <Route path=":id" element={<OperationForm key={type} type={type} />} />
            </Route>
          ))}
          <Route path="adjustments" element={<Adjustments />} />
          <Route path="adjustments/:id" element={<AdjustmentDetail />} />
          <Route path="move-history" element={<MoveHistory />} />
          <Route path="warehouses" element={<Warehouses />} />
          <Route path="locations" element={<Locations />} />
          <Route path="categories" element={<Categories />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="users" element={<ManagerOnly><Users /></ManagerOnly>} />
          <Route path="profile" element={<Profile />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
