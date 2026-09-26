import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { warehousesService } from '../services/crud.service.js';
import { useAuth } from './AuthContext.jsx';

const WarehouseContext = createContext(null);
const STORAGE_KEY = 'stocksense.warehouseId';

const readStored = () => {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
};

/*
 * The warehouse picked in the top bar. Dashboard, stock, products and operation lists
 * filter by it; null means "All warehouses". The choice is remembered per browser.
 */
export function WarehouseProvider({ children }) {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseIdState] = useState(readStored);

  const reload = () =>
    warehousesService
      .list({ limit: 100 })
      .then(({ data }) => {
        setWarehouses(data);
        setWarehouseIdState((current) => (current && !data.some((w) => w.id === current) ? null : current));
      })
      .catch(() => setWarehouses([]));

  useEffect(() => {
    if (user) reload();
  }, [user]);

  const value = useMemo(() => {
    const setWarehouseId = (id) => {
      setWarehouseIdState(id);
      try {
        if (id) localStorage.setItem(STORAGE_KEY, String(id));
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* storage unavailable: keep the choice for this session only */
      }
    };
    return {
      warehouses,
      warehouseId,
      warehouse: warehouses.find((w) => w.id === warehouseId) ?? null,
      setWarehouseId,
      reloadWarehouses: reload,
    };
  }, [warehouses, warehouseId]);

  return <WarehouseContext.Provider value={value}>{children}</WarehouseContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useWarehouse = () => useContext(WarehouseContext);
