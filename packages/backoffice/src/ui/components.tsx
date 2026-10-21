import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Icon, type IconName } from '@mmusic/ui-kit/web';

import type { Permission } from '../rbac.ts';
import { useCan, useShellStrings } from '../react.tsx';

/** Page title row: title, optional subtitle and actions. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="bo-page-header">
      <div className="bo-page-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="bo-page-actions">{actions}</div>}
    </div>
  );
}

/** "Демо-данные" pill for anything showing mock data. */
export function DemoBadge() {
  const s = useShellStrings();
  return (
    <span className="bo-demo-badge">
      <Icon name="science" size={14} />
      {s('demoData')}
    </span>
  );
}

/** A dashboard figure. `demo` adds the demo-data label (fictional figures); public catalog counts pass false. */
export function KpiCard({ label, value, hint, icon, demo, footer }: { label: string; value: string; hint?: string; icon: IconName; demo: boolean; footer?: ReactNode }) {
  return (
    <div className="bo-kpi">
      <div className="bo-kpi-head">
        <span className="bo-kpi-icon">
          <Icon name={icon} size={20} />
        </span>
        {demo && <DemoBadge />}
      </div>
      <span className="bo-kpi-value">{value}</span>
      <span className="bo-kpi-label">{label}</span>
      {hint && <span className="bo-kpi-hint">{hint}</span>}
      {footer && <span className="bo-kpi-foot">{footer}</span>}
    </div>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: IconName; title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="bo-empty">
      <Icon name={icon} size={36} />
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {children}
    </div>
  );
}

/** Honest placeholder for a section planned in a later milestone (no fake content, no dead controls). */
export function ComingSoonPage({ title, milestone, description }: { title: string; milestone: string; description?: string }) {
  const s = useShellStrings();
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon="construction" title={s('comingSoonTitle')} body={`${s('comingSoonBody')} ${milestone}.${description ? ` ${description}` : ''}`}>
        <Link className="bo-btn ghost" to="/dashboard">
          {s('toDashboard')}
        </Link>
      </EmptyState>
    </>
  );
}

export function NoAccessPage() {
  const s = useShellStrings();
  return <EmptyState icon="lock" title={s('noAccessTitle')} body={s('noAccessBody')} />;
}

export function NotFoundPage() {
  const s = useShellStrings();
  return (
    <EmptyState icon="search-off" title={s('notFoundTitle')}>
      <Link className="bo-btn ghost" to="/dashboard">
        {s('toDashboard')}
      </Link>
    </EmptyState>
  );
}

/** Route guard: the page for roles with the permission, the "no access" state otherwise (UI only — not security). */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  return useCan(permission) ? children : <NoAccessPage />;
}
