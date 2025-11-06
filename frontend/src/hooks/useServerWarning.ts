import { useEffect, useState } from 'react';

/**
 * Hook: listen for global 'soft-limit-warning' events dispatched by the axios interceptor.
 * Returns the current warning string (or null). The consumer should clear it when shown.
 */
export default function useServerWarning() {
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      try {
        const detail = (e as CustomEvent)?.detail ?? String(e);
        setWarning(String(detail));
      } catch (err) {
        setWarning(String(e));
      }
    };
    window.addEventListener('soft-limit-warning', handler as EventListener);
    return () => window.removeEventListener('soft-limit-warning', handler as EventListener);
  }, []);

  const clearWarning = () => setWarning(null);

  return { warning, clearWarning, setWarning };
}