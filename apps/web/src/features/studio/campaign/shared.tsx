// First: configures @mmusic/core storage before the persisted locale store is used.
import '@/platform/storage';

import { useCallback, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { Icon } from '@mmusic/ui-kit/web';

import { useAppStrings } from '@/i18n/locale';

import './campaign.css';

/**
 * Shared bits for the Promotion campaign wizard (mobile app/profile/artist/campaign/*): the Stitch header, the
 * demo notice line, inline field errors and the app's goBack(fallback) navigation.
 */

/** mobile lib/navigation goBack(fallback): history back inside the site, else the fallback route. */
export function useGoBack() {
  const navigate = useNavigate();
  return useCallback(
    (fallback: string) => {
      const idx = (window.history.state as { idx?: number } | null)?.idx;
      if (typeof idx === 'number' && idx > 0) void navigate(-1);
      else void navigate(fallback, { replace: true });
    },
    [navigate],
  );
}

/** The current day, fixed for the life of the page (render stays pure). */
export function useToday(): Date {
  const [today] = useState(() => new Date());
  return today;
}

/** Stitch header: round back button + centered title (mobile promotion-stitch/stitch-header). */
export function StitchHeader({ title, onBack, actions }: { title: string; onBack: () => void; actions?: ReactNode }) {
  const { t } = useAppStrings();
  return (
    <div className="cp-header">
      <button type="button" className="icon-btn" aria-label={t('backLabel')} onClick={onBack}>
        <Icon name="arrow-back" size={22} />
      </button>
      <h1>{title}</h1>
      <div className="cp-header-actions">{actions}</div>
    </div>
  );
}

/** Quiet demo label for flows that look like payments but move no money (mobile components/demo-notice). */
export function DemoNotice({ text }: { text: string }) {
  return (
    <p className="cp-demo-notice">
      <Icon name="info-outline" size={16} />
      <span>{text}</span>
    </p>
  );
}

export function FieldError({ text, center }: { text: string; center?: boolean }) {
  return (
    <p className={center ? 'cp-field-error center' : 'cp-field-error'} role="alert">
      <Icon name="error-outline" size={16} />
      <span>{text}</span>
    </p>
  );
}

export function FieldTag({ text, required }: { text: string; required?: boolean }) {
  return <span className={required ? 'cp-tag required' : 'cp-tag'}>{text}</span>;
}

/** Wizard progress segments (step n of 4). */
export function StepSegments({ step }: { step: number }) {
  return (
    <span className="cp-segments" aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={n <= step ? 'on' : ''} />
      ))}
    </span>
  );
}
