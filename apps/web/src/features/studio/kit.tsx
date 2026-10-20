// First: configures @mmusic/core storage before the persisted locale store is used.
import '@/platform/storage';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { DemoStrings } from '@mmusic/core/demo/demo-strings';
import type { TrendPoint } from '@mmusic/core/lib/analytics-mock';
import { smoothAreaPath } from '@mmusic/core/lib/svg-path';
import type { PromoStringTable } from '@mmusic/core/promotion/string-table';
import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { useAppStrings } from '@/i18n/locale';

import './studio.css';

/**
 * Shared building blocks for the Artist Studio, guest preview and simulated payment pages (website versions of the
 * Expo app's StatCard / Chip / Toast / EmptyState / bottom-sheet pieces). Pure presentation: logic stays in core.
 */

/** Page title in the app's "Page – Mmusic" format. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} – Mmusic`;
  }, [title]);
}

/** Demo account / guest preview copy in the current language (mobile: src/demo/demo-strings useDemoStrings). */
export function useDemoStrings() {
  const { locale } = useAppStrings();
  return { d: DemoStrings[locale], locale };
}

/** The current language's half of a Promotion (Stitch) copy table. */
export function usePromoStrings<K extends string>(table: PromoStringTable<K>): Record<K, string> {
  const { locale } = useAppStrings();
  return table[locale];
}

/** Locale-aware thousands formatting used by the Promotion screens ("12 400" in RU, "12,400" in EN). */
export function formatGrouped(n: number, locale: 'en' | 'ru'): string {
  return Math.round(n).toLocaleString('en-US').replace(/,/g, locale === 'ru' ? ' ' : ',');
}

/** Per-page toast (mobile hooks/use-toast): `showToast(message, icon?)` + the element to render once. */
export function useStudioToast(): { showToast: (message: string, icon?: IconName) => void; toast: ReactNode } {
  const [state, setState] = useState<{ message: string; icon?: IconName; visible: boolean }>({ message: '', visible: false });
  const timer = useRef<number | undefined>(undefined);
  const showToast = useCallback((message: string, icon?: IconName) => {
    setState({ message, icon, visible: true });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState((s) => ({ ...s, visible: false })), 2200);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const toast = (
    <output className={state.visible ? 'toast st-toast show' : 'toast st-toast'} aria-live="polite">
      {state.icon && <Icon name={state.icon} size={16} />}
      {state.message}
    </output>
  );
  return { showToast, toast };
}

export function StatCard({ label, value, icon, tone }: { label: string; value: ReactNode; icon?: IconName; tone?: 'primary' | 'secondary' | 'tertiary' }) {
  return (
    <div className="st-stat">
      {icon && (
        <span className={`st-stat-icon ${tone ?? 'primary'}`}>
          <Icon name={icon} size={20} />
        </span>
      )}
      <span className="st-stat-value">{value}</span>
      <span className="st-stat-label">{label}</span>
    </div>
  );
}

/** A row of single-select chips (filters, periods, tiers). */
export function ChipRow<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label?: string }) {
  return (
    <fieldset className="ui-chips st-chips st-fieldset">
      {label && <legend className="visually-hidden">{label}</legend>}
      {options.map((o) => (
        <button key={o.id} type="button" className={o.id === value ? 'ui-chip on' : 'ui-chip'} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}

export function ProgressBar({ pct, label, gradient }: { pct: number; label?: string; gradient?: boolean }) {
  const value = Math.max(0, Math.min(100, pct));
  return (
    <div className="st-progress" aria-hidden="true" title={label}>
      <span className={gradient ? 'fill gradient' : 'fill'} style={{ width: `${value}%` }} />
    </div>
  );
}

/** Horizontal share bar row (label, % and count) — mobile demo-artist-analytics ShareRow. */
export function ShareRow({ label, pct, count, fmt, tone = 'primary' }: { label: string; pct: number; count?: number; fmt?: (n: number) => string; tone?: 'primary' | 'secondary' | 'tertiary' }) {
  return (
    <div className="st-share">
      <div className="st-share-head">
        <span className="t-body-sm ellipsis">{label}</span>
        <span className="t-label-lg">
          {pct.toFixed(pct % 1 === 0 ? 0 : 1)}%{count !== undefined && fmt && <span className="medium t-body-sm"> ({fmt(count)})</span>}
        </span>
      </div>
      <div className="st-share-track">
        <span className={`fill ${tone}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

/** In-card empty state for a section with no real data behind it. */
export function NoData({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="st-nodata">
      <Icon name="insights" size={20} />
      <span>
        <span className="t-label-lg medium">{text}</span>
        {hint && <span className="t-body-sm medium block">{hint}</span>}
      </span>
    </div>
  );
}

const CHART_W = 340;
const CHART_H = 130;
let chartSeq = 0;

/** "Listening trend" area + line chart (mobile listen-trend-chart.tsx) from mock trend points. */
export function TrendChart({ points, peakLabel }: { points: TrendPoint[]; peakLabel: string }) {
  const [id] = useState(() => `st-trend-${(chartSeq += 1)}`);
  const { linePath, areaPath } = smoothAreaPath(
    points.map((p) => p.value),
    CHART_W,
    CHART_H,
  );
  return (
    <div className="st-trend">
      <svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF4B4B" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#FF4B4B" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F5A623" />
            <stop offset="100%" stopColor="#FF4B4B" />
          </linearGradient>
        </defs>
        {[0.15, 0.5, 0.85].map((f) => (
          <line key={f} x1={0} y1={CHART_H * f} x2={CHART_W} y2={CHART_H * f} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        ))}
        <path d={areaPath} fill={`url(#${id}-fill)`} />
        <path d={linePath} fill="none" stroke={`url(#${id}-stroke)`} strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="st-trend-foot t-body-sm">
        <span className="medium">{points[0]?.label}</span>
        <span className="peak">{peakLabel}</span>
        <span className="medium">{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/** Centered loading indicator (guest preview start-up, simulated processing). */
export function Spinner({ label }: { label?: string }) {
  return (
    <output className="st-spinner-wrap" aria-live="polite">
      <span className="st-spinner" aria-hidden="true" />
      {label && <span className="t-body-md medium">{label}</span>}
    </output>
  );
}

/**
 * Website version of the app's bottom sheets (/sheets/*): a centered card over the site, with a close button.
 * `onClose` defaults to history back (or `fallback` when the sheet was opened directly).
 */
export function SheetCard({ title, children, onClose, fallback = '/home', closeLabel, wide }: { title?: string; children: ReactNode; onClose?: () => void; fallback?: string; closeLabel?: string; wide?: boolean }) {
  const navigate = useNavigate();
  const { t } = useAppStrings();
  const close = useCallback(() => {
    if (onClose) onClose();
    else if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) void navigate(-1);
    else void navigate(fallback, { replace: true });
  }, [onClose, navigate, fallback]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  return (
    <div className="st-sheet-wrap">
      <section className={wide ? 'st-sheet wide' : 'st-sheet'} aria-label={title}>
        <div className="st-sheet-head">
          {title ? <h1 className="t-headline-sm">{title}</h1> : <span />}
          <button type="button" className="icon-btn" aria-label={closeLabel ?? t('closeLabel')} onClick={close}>
            <Icon name="close" size={22} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

/** Confirmation dialog (mobile Modal + two PillButtons). */
export function ConfirmDialog({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: { title: string; body: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog ref={ref} className="st-dialog" aria-label={title} onCancel={(e) => { e.preventDefault(); onCancel(); }}>
      <h2 className="t-headline-sm">{title}</h2>
      <p className="t-body-md medium">{body}</p>
      <div className="st-dialog-actions">
        <button type="button" className="ui-btn ghost" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className="ui-btn" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
