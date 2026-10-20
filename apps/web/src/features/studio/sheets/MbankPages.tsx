// First: configures @mmusic/core storage before the persisted locale / dashboard-locale stores are used.
import '@/platform/storage';

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { formatKgsAmount } from '@mmusic/core/lib/format-currency';
import { supportedAmountHeadline } from '@mmusic/core/lib/i18n';
import { demoMbankPaymentAdapter, newOrderId, type PaymentOrder } from '@mmusic/core/lib/payments/mbank-payment';
import { artists, getArtistById, quickDonationAmountsKgs } from '@mmusic/core/mocks';
import { useDashboardStrings } from '@mmusic/core/state/dashboard-locale-store';
import { usePaymentStore } from '@mmusic/core/state/payment-store';
import { useSupportStore } from '@mmusic/core/state/support-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';
import { ListRow } from '@/ui';

import { SheetCard, Spinner, usePageTitle } from '../kit';
import { AmountChip, DemoNotice, NothingHere, SheetBody, TextLink, useGoBack } from './shared';

/**
 * The universal MBANK payment widget — DEMO only (mobile app/sheets/mbank-*.tsx, core lib/payments/mbank-payment.ts).
 * The website has no live adapter: every checkout is the in-app demo, never contacts MBANK and never moves money.
 */

/** Entry point opened by the floating MBANK button: picks which existing payment flow to start. */
export function MbankLauncherPage() {
  const { t } = useAppStrings();
  const navigate = useNavigate();
  usePageTitle(t('mbankLauncherTitle'));
  return (
    <SheetCard title={t('mbankLauncherTitle')}>
      <p className="t-body-sm sh-sub">{t('mbankLauncherSubtitle')}</p>
      <div className="sh-list">
        <ListRow icon="favorite" title={t('mbankScenarioDonationTitle')} subtitle={t('mbankScenarioDonationSubtitle')} onClick={() => void navigate('/sheets/mbank-launcher-donate', { replace: true })} />
        <ListRow icon="equalizer" title={t('mbankScenarioStudioProTitle')} subtitle={t('mbankScenarioStudioProSubtitle')} onClick={() => void navigate('/profile/artist/dashboard/studio-pro', { replace: true })} />
        <ListRow icon="storefront" title={t('mbankScenarioPurchaseTitle')} subtitle={t('mbankScenarioPurchaseSubtitle')} onClick={() => void navigate('/sheets/mbank-launcher-purchase', { replace: true })} />
      </div>
      <DemoNotice text={t('demoNoMoneySentLabel')} />
    </SheetCard>
  );
}

/** "Artist donation" scenario: pick an artist, then the exact Support flow an artist page opens. */
export function MbankLauncherDonatePage() {
  const { t } = useAppStrings();
  const navigate = useNavigate();
  usePageTitle(t('mbankPickArtistTitle'));
  return (
    <SheetCard title={t('mbankPickArtistTitle')}>
      <div className="sh-artists">
        {artists.map((artist) => (
          <button key={artist.id} type="button" className="sh-artist" onClick={() => void navigate(`/sheets/support?artistId=${encodeURIComponent(artist.id)}`, { replace: true })}>
            <Artwork source={artist.photoUri} />
            <span className="name t-label-lg ellipsis">{artist.name}</span>
            {artist.verified && <Icon name="verified" size={16} />}
          </button>
        ))}
      </div>
    </SheetCard>
  );
}

/** "General purchase" scenario: no product catalog exists, so a clearly labelled demo order for a preset amount. */
export function MbankLauncherPurchasePage() {
  const { t } = useAppStrings();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  usePageTitle(t('mbankPurchaseAmountTitle'));

  async function handleContinue() {
    if (!amount || submitting) return;
    setSubmitting(true);
    const order: PaymentOrder = {
      id: newOrderId('PURCHASE'),
      amountKgs: amount,
      currency: 'KGS',
      description: t('mbankGeneralPurchaseDescription'),
      purpose: 'purchase',
    };
    usePaymentStore.getState().start(order);
    await demoMbankPaymentAdapter.createSession(order);
    void navigate('/sheets/mbank-pay', { replace: true });
  }

  return (
    <SheetCard title={t('mbankPurchaseAmountTitle')}>
      <div className="sh-amounts wrap">
        {quickDonationAmountsKgs.map((preset) => (
          <AmountChip key={preset} amount={formatKgsAmount(preset)} unit="сом" selected={amount === preset} onClick={() => setAmount(preset)} />
        ))}
      </div>
      <button type="button" className="ui-btn sh-cta" disabled={!amount || submitting} onClick={() => void handleContinue()}>
        {submitting ? <span className="st-spinner" aria-hidden="true" /> : null}
        {t('continueLabel')}
        <Icon name="arrow-forward" size={20} />
      </button>
    </SheetCard>
  );
}

/** MBANK checkout — DEMO. Pay / simulate decline / cancel; nothing contacts MBANK. */
export function MbankPayPage() {
  const order = usePaymentStore((s) => s.order);
  const stage = usePaymentStore((s) => s.stage);
  const completeDemo = usePaymentStore((s) => s.completeDemo);
  const { t } = useDashboardStrings();
  const app = useAppStrings();
  const navigate = useNavigate();
  const goBack = useGoBack();
  usePageTitle(t('mbankCheckoutTitle'));

  async function finish(outcome: 'success' | 'cancelled' | 'failed') {
    // Promotion keeps its own success screen — only purposes without one go through processing/result.
    if (order?.purpose === 'promotion') {
      await completeDemo(outcome);
      goBack();
      return;
    }
    void navigate(`/sheets/mbank-processing?outcome=${outcome}`, { replace: true });
  }

  if (!order) {
    return (
      <SheetCard>
        <NothingHere message={app.t('nothingToConfirmMessage')} />
      </SheetCard>
    );
  }

  const processing = stage === 'processing';
  return (
    <SheetCard>
      <SheetBody>
        <span className="sh-bank">
          <Icon name="account-balance" size={30} />
        </span>
        <h1 className="t-headline-md sh-center">{t('mbankCheckoutTitle')}</h1>
        <p className="t-body-md medium sh-center">{order.description}</p>

        <div className="sh-amount-card">
          <span className="sh-eyebrow muted">
            {t('orderLabel')} · {order.id}
          </span>
          <span className="sh-big">
            <span className="num">{formatKgsAmount(order.amountKgs)}</span>
            <span className="cur">сом</span>
          </span>
        </div>

        <div className="sh-account flat">
          <span className="ic bare">
            <Icon name="account-balance-wallet" size={22} />
          </span>
          <span className="name t-label-lg ellipsis">{app.t('mbankAccountMasked')}</span>
          <span className="t-label-md medium">{t('merchantLabel')}: Mmusic</span>
        </div>

        <DemoNotice text={t('mbankDemoNotice')} />

        <button type="button" className="ui-btn sh-cta" disabled={processing} onClick={() => void finish('success')}>
          {processing && <span className="st-spinner" aria-hidden="true" />}
          {`${t('payAmountPrefix')} ${formatKgsAmount(order.amountKgs)} сом`}
          <Icon name="lock" size={18} />
        </button>
        <TextLink label={t('simulateDecline')} disabled={processing} onClick={() => void finish('failed')} />
        <TextLink label={t('cancelPayment')} disabled={processing} onClick={() => void finish('cancelled')} />
      </SheetBody>
    </SheetCard>
  );
}

const VALID_OUTCOMES = ['success', 'cancelled', 'failed'] as const;

/** Processing interstitial — the only caller of completeDemo() for donation / studio-pro / purchase. Not cancelable. */
export function MbankProcessingPage() {
  const [params] = useSearchParams();
  const rawOutcome = params.get('outcome');
  const outcome = VALID_OUTCOMES.find((o) => o === rawOutcome);
  const order = usePaymentStore((s) => s.order);
  const completeDemo = usePaymentStore((s) => s.completeDemo);
  const { t } = useAppStrings();
  const navigate = useNavigate();
  const started = useRef(false);
  const mounted = useRef(true);
  usePageTitle(t('mbankWidgetProcessingTitle'));

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!order || !outcome || started.current) return;
    started.current = true;
    void completeDemo(outcome).then(() => {
      // Never force the user back into a sheet they already left.
      if (mounted.current) void navigate('/sheets/mbank-result', { replace: true });
    });
  }, [order, outcome, completeDemo, navigate]);

  if (!order || !outcome) {
    return (
      <SheetCard>
        <NothingHere message={t('nothingToConfirmMessage')} />
      </SheetCard>
    );
  }

  // A demo charge is "in flight": like a bank's authorization step, it has no close button.
  return (
    <div className="st-sheet-wrap">
      <section className="st-sheet" aria-busy="true" aria-label={t('mbankWidgetProcessingTitle')}>
        <SheetBody>
          <span className="sh-bank">
            <Icon name="account-balance" size={30} />
          </span>
          <Spinner />
          <h1 className="t-headline-md sh-center">{t('mbankWidgetProcessingTitle')}</h1>
          <p className="t-body-md medium sh-center">{t('mbankWidgetProcessingHint')}</p>
        </SheetBody>
      </section>
    </div>
  );
}

/** Universal result sheet (success / failed / cancelled), purpose-aware; owns the final reset(). */
export function MbankResultPage() {
  const order = usePaymentStore((s) => s.order);
  const result = usePaymentStore((s) => s.result);
  const donationArtistId = useSupportStore((s) => s.artistId);
  const { t, locale } = useAppStrings();
  const navigate = useNavigate();
  const goBack = useGoBack();
  const historyAppended = useRef(false);
  usePageTitle(t('mbankLauncherTitle'));

  const isDonationSuccess = order?.purpose === 'donation' && result?.outcome === 'success';

  // One Support History entry per completed (demo) donation.
  useEffect(() => {
    if (!isDonationSuccess || historyAppended.current) return;
    historyAppended.current = true;
    useSupportStore.setState((state) => {
      const { artistId, amount } = state;
      if (!artistId || !amount) return state;
      return {
        history: [{ id: `sup-${Date.now()}`, artistId, amount, currency: state.currency, status: 'completed', createdAt: new Date().toISOString() }, ...state.history],
      };
    });
  }, [isDonationSuccess]);

  if (!order || !result) {
    return (
      <SheetCard>
        <NothingHere message={t('nothingToConfirmMessage')} />
      </SheetCard>
    );
  }

  const retryRoute = order.purpose === 'donation' ? '/sheets/support-confirm' : '/sheets/mbank-pay';

  function finishAndClose(destination?: '/profile/support-history') {
    usePaymentStore.getState().reset();
    if (order?.purpose === 'donation') useSupportStore.getState().reset();
    if (destination) void navigate(destination, { replace: true });
    else goBack();
  }

  if (result.outcome === 'success') {
    const artist = order.purpose === 'donation' && donationArtistId ? getArtistById(donationArtistId) : undefined;
    return (
      <SheetCard onClose={() => finishAndClose()}>
        <SheetBody>
          <span className="sh-glow success">
            <Icon name="check-circle" size={48} />
          </span>
          {order.purpose === 'donation' ? (
            <>
              <p className="sh-label-primary">{t('directPatronageCompleteLabel')}</p>
              <h1 className="sh-headline">{supportedAmountHeadline(locale, formatKgsAmount(order.amountKgs), 'сом')}</h1>
              {artist && (
                <span className="sh-chip">
                  <Artwork source={artist.photoUri} />
                  <span className="t-label-lg">{artist.name}</span>
                  {artist.verified && <Icon name="verified" size={16} className="verified" />}
                </span>
              )}
            </>
          ) : (
            <>
              <h1 className="t-headline-md sh-center">{t(order.purpose === 'studio-pro' ? 'mbankWidgetSubscriptionActivatedTitle' : 'mbankWidgetPurchaseSuccessTitle')}</h1>
              <p className="t-body-md medium sh-center">
                {order.description} · {formatKgsAmount(order.amountKgs)} сом
              </p>
              {result.reference && (
                <p className="t-body-sm medium sh-center">
                  {t('mbankWidgetReferenceLabel')}: {result.reference}
                </p>
              )}
            </>
          )}
          <DemoNotice text={t('demoNoMoneyWasSentLabel')} />
          <button type="button" className="ui-btn sh-cta" onClick={() => finishAndClose()}>
            {t('doneLabel')}
            <Icon name="check" size={20} />
          </button>
          {order.purpose === 'donation' && <TextLink icon="receipt-long" label={t('viewSupportReceiptLabel')} onClick={() => finishAndClose('/profile/support-history')} />}
        </SheetBody>
      </SheetCard>
    );
  }

  const isFailed = result.outcome === 'failed';
  return (
    <SheetCard onClose={() => finishAndClose()}>
      <SheetBody>
        <span className={isFailed ? 'sh-glow error' : 'sh-glow neutral'}>
          <Icon name={isFailed ? 'error-outline' : 'cancel'} size={48} />
        </span>
        <h1 className="t-headline-md sh-center">{t(isFailed ? 'mbankWidgetFailedTitle' : 'mbankWidgetCancelledTitle')}</h1>
        <p className="t-body-md medium sh-center">{t(isFailed ? 'mbankWidgetFailedHint' : 'mbankWidgetCancelledHint')}</p>
        <p className="t-body-sm medium sh-center">
          {order.description} · {formatKgsAmount(order.amountKgs)} сом
        </p>
        <DemoNotice text={t('demoNoMoneyWasSentLabel')} />
        <button type="button" className="ui-btn sh-cta" onClick={() => void navigate(retryRoute, { replace: true })}>
          {t('retryLabel')}
          <Icon name="refresh" size={20} />
        </button>
        <TextLink label={t('cancel')} onClick={() => finishAndClose()} />
      </SheetBody>
    </SheetCard>
  );
}
