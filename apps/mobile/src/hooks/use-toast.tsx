import { useCallback, useEffect, useRef, useState } from 'react';

import { Toast } from '@/components/ui';

const TOAST_MS = 2200;

/** Show a short feedback toast. Render the returned `toast` element once at
 * the bottom of the screen; call `showToast` from any handler. */
export function useToast() {
  const [state, setState] = useState<{ message: string; icon: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const showToast = useCallback((message: string, icon = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setState({ message, icon });
    timer.current = setTimeout(() => setState(null), TOAST_MS);
  }, []);

  const toast = <Toast message={state?.message ?? ''} icon={state?.icon} visible={state !== null} />;

  return { showToast, toast };
}
