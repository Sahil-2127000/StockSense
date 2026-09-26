import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { connectSocket, disconnectSocket } from '../services/socket.service.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const LiveContext = createContext({ connected: false, alerts: [], unread: 0 });

/*
 * Opens the Socket.IO connection while someone is logged in, keeps the latest
 * low-stock alerts for the bell, and shows a toast when a product runs low.
 */
export function LiveProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return undefined;
    }
    const socket = connectSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onLow = (alert) => {
      setAlerts((list) => [{ ...alert, at: Date.now() }, ...list.filter((a) => a.product.id !== alert.product.id)].slice(0, 20));
      setUnread((n) => n + 1);
      toast.warn(`${alert.product.name} is ${alert.status === 'OUT' ? 'out of stock' : 'running low'} (${alert.onHand} ${alert.product.uom} left)`);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('stock:low', onLow);
    // Already connected (e.g. effect re-run): the connect event will not fire again
    if (socket.connected) queueMicrotask(onConnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('stock:low', onLow);
    };
  }, [user, toast]);

  const value = useMemo(
    () => ({ connected: Boolean(user) && connected, alerts, unread, markRead: () => setUnread(0) }),
    [user, connected, alerts, unread]
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLiveStatus = () => useContext(LiveContext);
