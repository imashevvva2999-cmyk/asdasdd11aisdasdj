// First: configures @mmusic/core storage before the persisted locale store is used.
import '@/platform/storage';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { formatKgsAmount } from '@mmusic/core/lib/format-currency';
import { PROMO_PACKAGES } from '@mmusic/core/mocks/promotions';
import { STITCH_GENRES } from '@mmusic/core/promotion/data/genres';
import { ConfirmPromoStrings } from '@mmusic/core/promotion/strings/confirm';
import { InteractionPromoStrings } from '@mmusic/core/promotion/strings/interactions';
import { KG_REGIONS } from '@mmusic/core/promotion/strings/setup-form';
import { useArtistStore } from '@mmusic/core/state/artist-store';
import { isValidStartDate, parseIsoDay, toIsoDay, useCampaignStore } from '@mmusic/core/state/campaign-store';
import { useDashboardStrings } from '@mmusic/core/state/dashboard-locale-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { Page } from '@/ui';

import { usePageTitle, usePromoStrings, useStudioToast } from '../kit';
import { DemoNotice, StepSegments, StitchHeader, useGoBack, useToday } from './shared';
import { StartDateDialog } from './StartDateDialog';

const MONTHS = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
} as const;

const shortDate = (date: Date, locale: 'en' | 'ru') => (locale === 'ru' ? `${date.getDate()} ${MONTHS.ru[date.getMonth()]}` : `${MONTHS.en[date.getMonth()]} ${date.getDate()}`);

/** Campaign wizard step 4/4 — Review & Pay (mobile campaign/confirm.tsx). Paying only runs campaign-store's local,
 * simulated confirm(): no real MBANK charge; a wallet payment above the demo balance fails honestly. */
export function CampaignConfirmPage() {
  const { t, locale } = useDashboardStrings();
  const s = usePromoStrings(ConfirmPromoStrings);
  const si = usePromoStrings(InteractionPromoStrings);
  usePageTitle(s.title);
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { showToast, toast } = useStudioToast();
  const entries = useArtistStore((st) => st.entries);
  const trackId = useCampaignStore((st) => st.trackId);
  const packageId = useCampaignStore((st) => st.packageId);
  const targetGenreIds = useCampaignStore((st) => st.targetGenreIds);
  const geoScope = useCampaignStore((st) => st.geoScope);
  const customRegionIds = useCampaignStore((st) => st.customRegionIds);
  const description = useCampaignStore((st) => st.description.trim());
  const startDate = useCampaignStore((st) => st.startDate);
  const setStartDate = useCampaignStore((st) => st.setStartDate);
  const stage = useCampaignStore((st) => st.stage);
  const confirm = useCampaignStore((st) => st.confirm);
  const cancelPayment = useCampaignStore((st) => st.cancelPayment);
  const method = useCampaignStore((st) => st.paymentMethod);
  const setMethod = useCampaignStore((st) => st.setPaymentMethod);
  const paymentError = useCampaignStore((st) => st.paymentError);
  const walletBalanceKgs = useCampaignStore((st) => st.walletBalanceKgs);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [reachInfoOpen, setReachInfoOpen] = useState(false);
  const today = useToday();

  useEffect(() => {
    if (!trackId || !packageId) void navigate('/profile/artist/campaign/select-track', { replace: true });
  }, [trackId, packageId, navigate]);

  const track = entries.find((e) => e.track.id === trackId)?.track;
  const pkg = PROMO_PACKAGES.find((p) => p.id === packageId);
  if (!trackId || !track || !packageId || !pkg) return <Page narrow>{null}</Page>;

  const discount = Math.round(pkg.priceKgs * 0.15);
  const total = pkg.priceKgs - discount;
  const cashback = Math.round(total * 0.05);
  const startIso = startDate && isValidStartDate(startDate) ? startDate : toIsoDay(today);
  const start = parseIsoDay(startIso) ?? today;
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + pkg.durationDays);
  const customLabel = KG_REGIONS.filter((r) => customRegionIds.includes(r.id))
    .map((r) => r.label[locale])
    .join(', ');
  const geoLabel = { all: s.geoAll, bishkek: s.geoBishkek, 'bishkek-osh': s.geoBishkekOsh, custom: customLabel || s.geoCustom }[geoScope];
  const chips = STITCH_GENRES.filter((g) => targetGenreIds.includes(g.id));
  const processing = stage === 'processing';

  async function handleConfirm() {
    const outcome = await confirm(total);
    if (outcome === 'success') void navigate('/profile/artist/campaign/success', { replace: true });
  }
  function handleCancel() {
    cancelPayment();
    showToast(si.paymentCancelled, 'close');
  }
  function handleBack() {
    if (processing) cancelPayment();
    goBack('/profile/artist/campaign/setup');
  }

  return (
    <Page narrow>
      <StitchHeader title={s.title} onBack={handleBack} />
      <div className="cp-between cp-mb">
        <span className="cp-row">
          <span className="cp-dot" />
          <span className="cp-step-label">{s.step}</span>
        </span>
        <StepSegments step={4} />
        <span className="cp-mono cp-outline">{s.final}</span>
      </div>

      <section className="cp-card">
        <div className="cp-between">
          <span className="cp-eyebrow">{s.promotedRelease}</span>
          <span className="cp-studio-chip">
            <Icon name="graphic-eq" size={13} />
            {s.studioChip}
          </span>
        </div>
        <div className="cp-row">
          <Artwork source={track.coverUri} className="cp-big-art" />
          <span className="cp-item-text">
            <span className="t-headline-sm ellipsis">{track.title}</span>
            <span className="t-body-md cp-outline ellipsis">{track.artistName}</span>
            <span className="cp-single-chip">
              {s.single} • {start.getFullYear()}
            </span>
            {description.length > 0 && <span className="t-body-sm cp-variant cp-clamp">«{description}»</span>}
          </span>
        </div>
        <div className="cp-spec-grid">
          <div className="cp-spec">
            <span className="t-label-sm cp-outline">{s.tariffPlan}</span>
            <span className="cp-row t-label-lg">
              <Icon name="bolt" size={16} className="cp-secondary" />
              {pkg.name} ({pkg.durationDays} {s.days})
            </span>
          </div>
          <div className="cp-spec">
            <span className="t-label-sm cp-outline">{s.showPeriod}</span>
            <button type="button" className="cp-period-btn" aria-label={s.periodEditLabel} disabled={processing} onClick={() => setCalendarOpen(true)}>
              <Icon name="date-range" size={16} className="cp-tertiary" />
              {shortDate(start, locale)} — {shortDate(end, locale)}
              <Icon name="expand-more" size={16} className="cp-outline" />
            </button>
          </div>
        </div>
        <div className="cp-audience">
          <div className="cp-between">
            <span className="t-label-sm cp-outline">{s.audienceGeo}</span>
            <Icon name="tune" size={16} className="cp-outline" />
          </div>
          <span className="t-body-md">
            {geoLabel}
            {s.ageRange}
          </span>
          {chips.length > 0 && (
            <span className="cp-chip-wrap">
              {chips.map((g) => (
                <span key={g.id} className="cp-genre-chip">
                  {g.chip[locale]}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="cp-forecast-row">
          <span className="cp-item-text">
            <span className="t-label-sm cp-outline">{s.reachForecast}</span>
            <span className="t-headline-sm cp-secondary">
              ~{pkg.forecastLow.toLocaleString('ru-RU')} – {pkg.forecastHigh.toLocaleString('ru-RU')}
            </span>
            <span className="t-body-sm cp-outline">{s.reachSub}</span>
            {reachInfoOpen && <span className="t-body-sm cp-variant">{s.reachInfo}</span>}
          </span>
          <button type="button" className="icon-btn plain" aria-label={s.reachInfoLabel} aria-expanded={reachInfoOpen} onClick={() => setReachInfoOpen((v) => !v)}>
            <Icon name="info-outline" size={18} />
          </button>
        </div>
      </section>

      <section className="cp-card">
        <div className="cp-between">
          <h2 className="cp-h2">{s.costBreakdown}</h2>
          <span className="t-label-sm cp-outline">{s.kgs}</span>
        </div>
        <div className="cp-cost">
          <span className="cp-outline">
            {s.tariffCost} ({pkg.durationDays} {s.days})
          </span>
          <span className="cp-mono">
            {formatKgsAmount(pkg.priceKgs)} {s.som}
          </span>
        </div>
        <div className="cp-cost">
          <span className="cp-outline cp-row">
            {s.discount} <span className="cp-promo">{s.promo}</span>
          </span>
          <span className="cp-mono cp-primary">
            -{formatKgsAmount(discount)} {s.som}
          </span>
        </div>
        <div className="cp-cost">
          <span className="cp-outline">{s.commission}</span>
          <span className="cp-mono cp-secondary">0 {s.som}</span>
        </div>
        <div className="cp-total">
          <span className="cp-item-text">
            <span className="t-label-md cp-outline">{s.totalToPay}</span>
            <span className="t-body-sm cp-outline">{s.taxesIncluded}</span>
          </span>
          <span className="cp-total-value">
            {formatKgsAmount(total)} <span className="cp-primary t-label-lg">{s.som}</span>
          </span>
        </div>
      </section>

      <section className="cp-section">
        <div className="cp-between">
          <h2 className="cp-h2">{s.paymentMethod}</h2>
          <span className="t-label-sm cp-primary">{s.gatewaySecured}</span>
        </div>
        <div className="cp-methods">
          <button type="button" aria-pressed={method === 'mbank'} className={method === 'mbank' ? 'cp-method mbank on' : 'cp-method mbank'} onClick={() => setMethod('mbank')}>
            <span className="cp-mbank-logo" aria-hidden="true">
              <span style={{ height: 14 }} />
              <span style={{ height: 24 }} />
              <span className="gold" style={{ height: 18 }} />
              <span style={{ height: 12 }} />
            </span>
            <span className="cp-item-text">
              <span className="t-headline-sm">{s.mbankPay}</span>
              <span className="t-body-md cp-outline ellipsis">{s.balance}</span>
              <span className="t-label-sm cp-secondary cp-row">
                <Icon name="stars" size={15} />
                {s.cashbackPrefix}
                {formatKgsAmount(cashback)}
                {s.cashbackSuffix}
              </span>
            </span>
            <span className={method === 'mbank' ? 'cp-radio on' : 'cp-radio'}>{method === 'mbank' && <Icon name="check" size={16} />}</span>
          </button>
          <button type="button" aria-pressed={method === 'wallet'} className={method === 'wallet' ? 'cp-method on' : 'cp-method'} onClick={() => setMethod('wallet')}>
            <span className="cp-wallet-icon">
              <Icon name="account-balance-wallet" size={22} />
            </span>
            <span className="cp-item-text">
              <span className="t-label-lg ellipsis">{s.studioWallet}</span>
              <span className="t-body-sm cp-outline">
                {si.walletAvailablePrefix}
                {walletBalanceKgs.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')} {si.currency}
              </span>
            </span>
            <span className={method === 'wallet' ? 'cp-radio on' : 'cp-radio'}>{method === 'wallet' && <Icon name="check" size={16} />}</span>
          </button>
        </div>
        <div className="cp-quick">
          <Icon name="touch-app" size={22} className="cp-secondary" />
          <span className="cp-item-text">
            <span className="t-label-md">{s.quickPay}</span>
            <span className="t-body-sm cp-outline">{s.quickPayHint}</span>
          </span>
          <Icon name="verified-user" size={20} className="cp-outline" />
        </div>
      </section>

      <div className="cp-actions">
        {paymentError === 'insufficientWallet' && (
          <p className="cp-center t-body-sm cp-error" role="alert">
            {si.insufficientWallet}
          </p>
        )}
        <DemoNotice text={t('campaignDemoNoticeLabel')} />
        <button type="button" className="ui-btn cp-pay" disabled={processing} aria-busy={processing} onClick={() => void handleConfirm()}>
          {processing ? <span className="st-spinner" aria-hidden="true" /> : <Icon name="lock" size={22} />}
          {s.payPrefix} {formatKgsAmount(total)} {s.paySuffix}
        </button>
        {processing ? (
          <button type="button" className="cp-link cp-center-self" onClick={handleCancel}>
            {si.cancelPayment}
          </button>
        ) : (
          <p className="t-body-sm cp-outline cp-center">{s.footer}</p>
        )}
      </div>

      {calendarOpen && (
        <StartDateDialog
          value={startIso}
          durationDays={pkg.durationDays}
          locale={locale}
          labels={{ title: s.calTitle, ends: s.calEnds, cancel: s.calCancel, apply: s.calApply }}
          onApply={setStartDate}
          onClose={() => setCalendarOpen(false)}
        />
      )}
      {toast}
    </Page>
  );
}
