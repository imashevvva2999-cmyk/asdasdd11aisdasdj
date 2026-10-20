// First: configures @mmusic/core storage before the persisted demo-session / dashboard-locale stores are used.
import '@/platform/storage';

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { create } from 'zustand';

import { DEMO_SUBSCRIPTION } from '@mmusic/core/demo/demo-fixture';
import { useIsGuestPreview } from '@mmusic/core/demo/guest-mode';
import type { DashboardStringKey, LocalizedText } from '@mmusic/core/lib/dashboard-i18n';
import { formatKgsAmount } from '@mmusic/core/lib/format-currency';
import { demoMbankPaymentAdapter, newOrderId, type PaymentOrder } from '@mmusic/core/lib/payments/mbank-payment';
import { useDashboardStrings } from '@mmusic/core/state/dashboard-locale-store';
import { useIsDemoArtist } from '@mmusic/core/state/demo-session-store';
import { usePaymentStore } from '@mmusic/core/state/payment-store';
import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { StatCard, useDemoStrings, useStudioToast } from '../kit';

type Tier = { id: string; badge: LocalizedText; name: LocalizedText; tagline: LocalizedText; priceYear: number; features: LocalizedText[]; current: boolean };

// Same tiers as the app's Studio Pro tab (mobile app/profile/artist/dashboard/studio-pro.tsx).
const TIERS: Tier[] = [
  {
    id: 'studio-pro',
    badge: { en: 'RECOMMENDED', ru: 'РЕКОМЕНДУЕМ' },
    name: { en: 'Studio PRO', ru: 'Studio PRO' },
    tagline: { en: 'Maximum reach and 100% revenue', ru: 'Максимум охвата и доход 100%' },
    priceYear: 3740,
    features: [
      { en: 'Unlimited Lossless (FLAC/WAV 24-bit) uploads', ru: 'Неограниченная загрузка треков в Lossless (FLAC/WAV 24-bit)' },
      { en: 'Real-time analytics — per-second stats and cities', ru: 'Аналитика в реальном времени: посекундная статистика и города' },
      { en: 'Editorial pitching into official Mmusic playlists', ru: 'Редакционный питчинг в официальные плейлисты Mmusic' },
      { en: '100% royalties, no platform fee', ru: 'Роялти 100% без комиссии платформы' },
      { en: 'Instant MBANK payout, 24/7, no fee', ru: 'Мгновенный вывод на MBANK 24/7 без комиссии' },
      { en: 'Verified artist badge', ru: 'Бейдж верифицированного артиста' },
    ],
    current: false,
  },
  {
    id: 'basic',
    badge: { en: 'FOR STARTING OUT', ru: 'ДЛЯ СТАРТА' },
    name: { en: 'Basic Artist', ru: 'Базовый Артист' },
    tagline: { en: 'Free, forever', ru: 'Бесплатный доступ навсегда' },
    priceYear: 0,
    features: [
      { en: 'Up to 3 releases per year', ru: 'До 3 релизов в год' },
      { en: 'Basic stream stats (weekly)', ru: 'Базовая статистика стримов (раз в неделю)' },
      { en: '70% streaming royalties', ru: 'Роялти 70% от стриминга' },
      { en: 'MBANK payout once a month', ru: 'Вывод средств через MBANK (раз в месяц)' },
    ],
    current: true,
  },
  {
    id: 'label-team',
    badge: { en: 'TEAMS & LABELS', ru: 'КОМАНДЫ И ЛЕЙБЛЫ' },
    name: { en: 'Label & Team', ru: 'Label & Team' },
    tagline: { en: 'Manage a roster of artists', ru: 'Управление каталогом артистов' },
    priceYear: 9500,
    features: [
      { en: 'Up to 10 artists in one workspace', ru: 'До 10 артистов в едином кабинете' },
      { en: 'Multi-access for managers and sound producers', ru: 'Мульти-доступ для менеджеров и саунд-продюсеров' },
      { en: '100% payouts with split royalties', ru: 'Выплаты 100% с раздельным сплитом роялти' },
      { en: 'A dedicated Mmusic & MBANK curator', ru: 'Персональный куратор от Mmusic и MBANK' },
    ],
    current: false,
  },
];

const PERKS: { icon: IconName; titleKey: DashboardStringKey; bodyKey: DashboardStringKey }[] = [
  { icon: 'percent', titleKey: 'perkCashbackTitle', bodyKey: 'perkCashbackBody' },
  { icon: 'volunteer-activism', titleKey: 'perkDonationsTitle', bodyKey: 'perkDonationsBody' },
  { icon: 'gavel', titleKey: 'perkLegalTitle', bodyKey: 'perkLegalBody' },
];

const FAQ: { qKey: DashboardStringKey; aKey: DashboardStringKey }[] = [
  { qKey: 'faqChangePlanQ', aKey: 'faqChangePlanA' },
  { qKey: 'faqPayoutQ', aKey: 'faqPayoutA' },
];

const monthlyPrice = (tier: Tier) => Math.round((tier.priceYear / 10) * 1.15);

/**
 * This tab's selected tier and its in-flight (demo) MBANK order. In the app the checkout is a sheet over the tab, so
 * the tab's own state survives it; on the website the checkout is its own page, so the same in-memory state lives
 * here (session only — like the app, nothing is persisted and nothing is billed).
 */
const useTierSession = create<{ tierId: string; pending?: { orderId: string; tierId: string } }>(() => ({ tierId: TIERS.find((t) => t.current)?.id ?? 'basic' }));
usePaymentStore.subscribe((s) => {
  const pending = useTierSession.getState().pending;
  if (!pending || !s.result || s.order?.id !== pending.orderId) return;
  if (s.result.outcome === 'success') useTierSession.setState({ tierId: pending.tierId, pending: undefined });
});

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" className="st-faq" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
      <span className="q">
        <span className="t-label-lg">{question}</span>
        <Icon name={open ? 'expand-less' : 'expand-more'} size={20} />
      </span>
      {open && <span className="a t-body-sm block">{answer}</span>}
    </button>
  );
}

/** Artist Dashboard — Studio Pro (Stitch "mmusic_studio"): plans paid through the simulated MBANK checkout. */
export function StudioProTab() {
  const { t, locale } = useDashboardStrings();
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(true);
  const currentTierId = useTierSession((s) => s.tierId);
  const demo = useIsDemoArtist();
  const guest = useIsGuestPreview();
  const { d } = useDemoStrings();
  const { showToast, toast } = useStudioToast();
  // The demo account is on Studio PRO; everyone else keeps the tier marked current.
  const activeTierId = demo ? DEMO_SUBSCRIPTION.planId : currentTierId;
  const dateLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  async function choose(tier: Tier) {
    // Guest Preview is read-only: never opens a checkout (the payment store is guarded too).
    if (guest) return showToast(d.readOnlyToast, 'lock');
    const order: PaymentOrder = {
      id: newOrderId('STUDIO'),
      amountKgs: yearly ? tier.priceYear : monthlyPrice(tier),
      currency: 'KGS',
      description: `${tier.name[locale]} · ${yearly ? t('perYear') : t('perMonth')}`,
      purpose: 'studio-pro',
    };
    useTierSession.setState({ pending: { orderId: order.id, tierId: tier.id } });
    // The website always uses the demo adapter: an in-app simulated checkout, never a real charge.
    await demoMbankPaymentAdapter.createSession(order);
    usePaymentStore.getState().start(order);
    void navigate('/sheets/mbank-pay');
  }

  return (
    <div className="st-col" style={{ gap: 24 }}>
      {demo && (
        <div className="st-card highlight">
          <span className="t-label-sm st-secondary-text">{d.planTitle}</span>
          <span className="t-headline-lg">{d.planDemo}</span>
          <span className="t-body-sm medium">
            {d.planSince} {dateLabel(DEMO_SUBSCRIPTION.since)} • {d.planRenews} {dateLabel(DEMO_SUBSCRIPTION.renews)} • {formatKgsAmount(DEMO_SUBSCRIPTION.priceYearKgs)} сом / {t('perYear')}
          </span>
          <div className="st-stats">
            {DEMO_SUBSCRIPTION.usage.map((u) => (
              <StatCard key={u.label.en} label={u.label[locale]} value={u.value} />
            ))}
          </div>
          <span className="t-body-sm medium">{d.planNoBilling}</span>
        </div>
      )}

      <div className="st-col" style={{ gap: 6 }}>
        <h2 className="st-section-title" style={{ margin: 0 }}>
          {t('studioPlans')}
        </h2>
        <p className="t-body-md medium" style={{ margin: 0 }}>
          {t('studioPlansHint')}
        </p>
      </div>

      <fieldset className="ui-chips st-fieldset">
        <legend className="visually-hidden">{t('studioPlans')}</legend>
        <button type="button" className={!yearly ? 'ui-chip on' : 'ui-chip'} aria-pressed={!yearly} onClick={() => setYearly(false)}>
          {t('monthly')}
        </button>
        <button type="button" className={yearly ? 'ui-chip on' : 'ui-chip'} aria-pressed={yearly} onClick={() => setYearly(true)}>
          {t('yearlyDiscount')}
        </button>
      </fieldset>

      <div className="st-tiers">
        {TIERS.map((tier) => {
          const isCurrent = tier.id === activeTierId;
          const free = tier.priceYear === 0;
          return (
            <div key={tier.id} className={tier.id === 'studio-pro' ? 'st-card highlight' : 'st-card'}>
              <span className="t-label-sm st-secondary-text">{tier.badge[locale]}</span>
              <span className="t-headline-lg">{tier.name[locale]}</span>
              <span className="t-body-sm medium">{tier.tagline[locale]}</span>
              <span className="st-price">
                {free ? '0 сом' : `${formatKgsAmount(yearly ? tier.priceYear : monthlyPrice(tier))} сом`}
                <span className="t-body-sm medium"> / {free ? t('forever') : yearly ? t('perYear') : t('perMonth')}</span>
              </span>
              {tier.features.map((f) => (
                <span key={f.en} className="st-feature-row t-body-sm">
                  <Icon name="check" size={16} />
                  {f[locale]}
                </span>
              ))}
              <button type="button" className={isCurrent || free ? 'ui-btn ghost' : 'ui-btn'} style={{ marginTop: 'auto' }} disabled={isCurrent || free} onClick={() => void choose(tier)}>
                {isCurrent ? t('currentPlan') : `${t('chooseTier')} ${tier.name[locale]}`}
              </button>
            </div>
          );
        })}
      </div>

      <section className="st-col" style={{ gap: 12 }}>
        <h2 className="st-section-title" style={{ margin: 0 }}>
          {t('mbankBenefits')}
        </h2>
        {PERKS.map((p) => (
          <div key={p.titleKey} className="st-feature">
            <span className="lead">
              <Icon name={p.icon} size={20} />
            </span>
            <span className="st-grow">
              <span className="t-label-lg block">{t(p.titleKey)}</span>
              <span className="t-body-sm medium block">{t(p.bodyKey)}</span>
            </span>
          </div>
        ))}
      </section>

      <section className="st-col" style={{ gap: 8 }}>
        <h2 className="st-section-title" style={{ margin: 0 }}>
          {t('faqTitle')}
        </h2>
        {FAQ.map((item) => (
          <FaqItem key={item.qKey} question={t(item.qKey)} answer={t(item.aKey)} />
        ))}
      </section>
      {toast}
    </div>
  );
}
