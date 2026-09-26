import { useEffect, useLayoutEffect, useRef } from 'react';
import { getSocket } from '../services/socket.service.js';
import { useLiveStatus } from '../context/LiveContext.jsx';

/**
 * Runs `handler` whenever one of the Socket.IO `events` arrives.
 * Used to refresh lists and the dashboard when someone else changes stock.
 */
export function useLive(events, handler) {
  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });
  const { connected } = useLiveStatus();
  const key = [].concat(events).join('|');

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const names = key.split('|');
    const listener = (payload) => handlerRef.current(payload);
    names.forEach((name) => socket.on(name, listener));
    return () => names.forEach((name) => socket.off(name, listener));
  }, [key, connected]);
}
