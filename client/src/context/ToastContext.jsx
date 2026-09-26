import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';

const ToastContext = createContext(null);
const ICONS = { ok: 'check', err: 'alert', warn: 'bell' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (kind, message, duration = 4000) => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (message) => show('ok', message),
      error: (message) => show('err', message, 6000),
      warn: (message) => show('warn', message, 6000),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <Icon name={ICONS[t.kind]} />
            <p>{t.message}</p>
            <button type="button" className="icon-btn" style={{ color: '#fff' }} onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <Icon name="x" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
