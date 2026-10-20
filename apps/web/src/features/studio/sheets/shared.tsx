// First: configures @mmusic/core storage before the persisted locale store is used.
import '@/platform/storage';

import { useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { useAppStrings } from '@/i18n/locale';

import './sheets.css';

/**
 * Shared pieces of the simulated support / MBANK sheets (website versions of the Expo app's DemoNotice, AmountChip,
 * TextLinkButton and lib/navigation goBack).
 */

/** History back when this tab has somewhere to go back to, otherwise `fallback` (mobile lib/navigation goBack). */
export function useGoBack() {
  const navigate = useNavigate();
  return useCallback(
    (fallback = '/home') => {
      const idx = (window.history.state as { idx?: number } | null)?.idx;
      if (typeof idx === 'number' && idx > 0) void navigate(-1);
      else void navigate(fallback, { replace: true });
    },
    [navigate],
  );
}

/** A quiet, unmistakable demo label for flows that look like real MBANK payments but move no money. */
export function DemoNotice({ text }: { text: string }) {
  return (
    <p className="sh-notice">
      <Icon name="info-outline" size={16} />
      <span>{text}</span>
    </p>
  );
}

/** Preset amount chip ("100 сом") or an icon + label chip ("More"). */
export function AmountChip({ amount, unit, icon, label, selected, onClick }: { amount?: string; unit?: string; icon?: IconName; label?: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={selected ? 'sh-amount on' : 'sh-amount'} aria-pressed={selected} onClick={onClick}>
      {icon && <Icon name={icon} size={18} />}
      {amount !== undefined && <span className="value">{amount}</span>}
      {unit && <span className="unit">{unit}</span>}
      {label && <span className="unit">{label}</span>}
    </button>
  );
}

/** Muted text button (mobile TextLinkButton tone="muted"). */
export function TextLink({ label, onClick, disabled, icon }: { label: string; onClick: () => void; disabled?: boolean; icon?: IconName }) {
  return (
    <button type="button" className="sh-textlink" onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={16} />}
      {label}
    </button>
  );
}

/** "Nothing to confirm" state of a sheet opened without its flow state. */
export function NothingHere({ message, linkLabel }: { message: string; linkLabel?: string }) {
  const { t } = useAppStrings();
  const goBack = useGoBack();
  return (
    <div className="sh-body">
      <p className="t-body-md medium sh-center">{message}</p>
      <TextLink label={linkLabel ?? t('backLabel')} onClick={() => goBack()} />
    </div>
  );
}

export function SheetBody({ children }: { children: ReactNode }) {
  return <div className="sh-body">{children}</div>;
}
