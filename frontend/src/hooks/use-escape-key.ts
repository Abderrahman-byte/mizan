import { useEffect } from 'react';

/** Call `handler` whenever Escape is pressed while the component is mounted. */
export function useEscapeKey(handler: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler]);
}
