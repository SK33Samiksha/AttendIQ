import { createContext, useCallback, useContext, useRef, useState } from 'react';

// A small pop-up message in the bottom-right corner.
// Usage in any component:  const toast = useToast();  toast('Saved!');  toast('Oops', 'error');
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const timer = useRef(null);

  const show = useCallback((message, type = 'success') => {
    setToast({ message, type, visible: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div id="toast" role="status" className={`${toast.visible ? 'show' : ''} ${toast.type}`}>
        {toast.message && (toast.type === 'success' ? '✓  ' : '✕  ') + toast.message}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
