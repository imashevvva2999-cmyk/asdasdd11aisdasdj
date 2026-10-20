// First: configures @mmusic/core storage before the persisted locale store is used.
import '@/platform/storage';

import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { PROMO_PACKAGES } from '@mmusic/core/mocks/promotions';
import { SuccessPromoStrings } from '@mmusic/core/promotion/strings/success';
import { useArtistStore } from '@mmusic/core/state/artist-store';
import { parseIsoDay, toIsoDay, useCampaignStore } from '@mmusic/core/state/campaign-store';
import { useDashboardStrings } from '@mmusic/core/state/dashboard-locale-store';
import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { Page } from '@/ui';

import { usePageTitle, usePromoStrings } from '../kit';
import { DemoNotice, useToday } from './shared';

/** Back to the dashboard's Promotion tab (mobile: dismissTo the dashboard, whose tabs keep Promotion focused). */
const DASHBOARD = '/profile/artist/dashboard/promotion';

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="cp-next-step">
      <span className="cp-step-num">{n}</span>
      <span className="t-body-md">{children}</span>
    </li>
  );
}

/** Campaign wizard terminal screen (mobile campaign/success.tsx): "promotion created", in moderation. The demo
 * notice states that nothing was charged or submitted. */
export function CampaignSuccessPage() {
  const { t, locale } = useDashboardStrings();
  const s = usePromoStrings(SuccessPromoStrings);
  usePageTitle(s.title);
  const navigate = useNavigate();
  const entries = useArtistStore((st) => st.entries);
  const launched = useCampaignStore((st) => st.launched);
  const latest = launched[0];
  const track = latest ? entries.find((e) => e.track.id === latest.trackId)?.track : undefined;
  const pkg = latest ? PROMO_PACKAGES.find((p) => p.id === latest.packageId) : undefined;
  const today = useToday();
  const backToDashboard = () => void navigate(DASHBOARD, { replace: true });

  if (!latest || !track || !pkg) {
    return (
      <Page narrow>
        <div className="st-result">
          <p>{t('nothingJustLaunchedLabel')}</p>
          <button type="button" className="ui-btn ghost" onClick={backToDashboard}>
            {t('backToStudioDashboardLabel')}
          </button>
        </div>
      </Page>
    );
  }

  const digits = latest.id.replace(/\D/g, '');
  const campaignCode = `#PR-${digits.slice(-4)}-MM`;
  const paid = pkg.priceKgs - Math.round(pkg.priceKgs * 0.15);
  const startDay = latest.startDate ? parseIsoDay(latest.startDate) : undefined;
  const startLabel =
    !startDay || latest.startDate === toIsoDay(today) ? s.startValue : startDay.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const specs: { icon: IconName; label: string; value: ReactNode }[] = [
    { icon: 'tag', label: s.campaign, value: <span className="cp-mono cp-code">{campaignCode}</span> },
    { icon: 'rocket-launch', label: s.tariff, value: <span className="t-label-md">{`${pkg.name} • ${pkg.durationDays} ${s.rotationDays}`}</span> },
    {
      icon: 'account-balance-wallet',
      label: s.payment,
      value: (
        <span className="t-label-md cp-row">
          {`${paid.toLocaleString('ru-RU')} сом • MBANK`}
          <Icon name="verified" size={14} className="cp-primary" />
        </span>
      ),
    },
    { icon: 'schedule', label: s.start, value: <span className="t-body-sm">{startLabel}</span> },
  ];

  return (
    <Page narrow>
      <div className="cp-between cp-mb">
        <span className="cp-row cp-mono cp-variant">
          <span className="cp-dot" /> {s.releaseHub}
        </span>
        <button type="button" className="icon-btn" aria-label={s.close} onClick={backToDashboard}>
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="cp-success-hero">
        <span className="cp-success-check" aria-hidden="true">
          <Icon name="check" size={44} />
        </span>
        <h1 className="t-headline-lg">{s.title}</h1>
        <p className="t-body-md cp-variant">
          {s.bodyBefore} <strong className="cp-primary">{`«${track.title}»`}</strong> {s.bodyAfter}
        </p>
      </div>

      <section className="cp-card">
        <div className="cp-moderation">
          <span className="cp-row t-label-md cp-secondary-fixed">
            <span className="cp-live-dot" />
            {s.moderation}
          </span>
          <span className="cp-mono cp-variant">{s.moderationEta}</span>
        </div>
        {specs.map((spec) => (
          <div key={spec.icon} className="cp-cost">
            <span className="cp-row t-body-sm cp-variant">
              <Icon name={spec.icon} size={16} />
              {spec.label}
            </span>
            {spec.value}
          </div>
        ))}
      </section>

      <DemoNotice text={t('campaignDemoNoticeLabel')} />

      <section className="cp-card">
        <h2 className="cp-h2 cp-row">
          <Icon name="stream" size={18} className="cp-tertiary" />
          {s.nextTitle}
        </h2>
        <ol className="cp-next">
          <Step n={1}>
            {s.step1Before} <span className="cp-tertiary">{s.step1Accent}</span>.
          </Step>
          <Step n={2}>
            {s.step2Before} <strong>{s.step2Accent}</strong> {s.step2After}
          </Step>
          <Step n={3}>
            {s.step3Before} <span className="cp-secondary-fixed">{s.step3Accent}</span>.
          </Step>
        </ol>
      </section>

      <div className="cp-actions">
        <button type="button" className="ui-btn cp-cta" onClick={() => void navigate('/profile/artist/campaign/statistics')}>
          <Icon name="insights" size={20} />
          {s.viewAnalytics}
        </button>
        <button type="button" className="cp-link cp-center-self" onClick={backToDashboard}>
          {s.backToDashboard}
        </button>
      </div>
    </Page>
  );
}
