import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import './components.css';

/** How long a message stays visible (as in the A3 prototype). */
const TOAST_MS = 2200;

const ToastContext = createContext<((message: string) => void) | undefined>(undefined);

/**
 * One polite status region for short confirmations (e.g. "Added to Liked Songs"). Real feedback only — never a
 * notice standing in for a missing feature (W3 decision D7). Mount once, near the root.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((next: string) => {
    setMessage(next);
    setVisible(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), TOAST_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <output className={visible ? 'toast show' : 'toast'} aria-live="polite">
        {message}
      </output>
    </ToastContext.Provider>
  );
}

/** Shows a short status message. */
export function useToast(): (message: string) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast() must be used inside <ToastProvider>.');
  return show;
}
