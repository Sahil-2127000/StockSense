import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { LiveProvider } from './context/LiveContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { WarehouseProvider } from './context/WarehouseContext.jsx';
import './styles/design.css';
import './styles/app.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <WarehouseProvider>
            <LiveProvider>
              <App />
            </LiveProvider>
          </WarehouseProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
