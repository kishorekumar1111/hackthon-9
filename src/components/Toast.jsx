import { useEffect } from 'react';
import { useApp } from '../AppContext';

export function Toast() {
  const { state, clearToast } = useApp();
  const toast = state.toast;

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(clearToast, 4000);
    return () => clearTimeout(id);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div
      className={`toast toast--${toast.type}`}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}
