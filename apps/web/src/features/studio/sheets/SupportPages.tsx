// First: configures @mmusic/core storage before the persisted locale store is used.
import '@/platform/storage';

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { formatKgsAmount } from '@mmusic/core/lib/format-currency';
import { artistPatronageSubtitle, confirmAndSendLabel, supportedAmountHeadline, supportTitleLabel, supportWithAmountLabel } from '@mmusic/core/lib/i18n';
import { demoMbankPaymentAdapter, newOrderId, type PaymentOrder } from '@mmusic/core/lib/payments/mbank-payment';
import { getArtistById, quickDonationAmountsKgs } from '@mmusic/core/mocks';
import { usePaymentStore } from '@mmusic/core/state/payment-store';
import { useSupportStore } from '@mmusic/core/state/support-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';

import { SheetCard, usePageTitle } from '../kit';
import { AmountChip, DemoNotice, NothingHere, SheetBody, TextLink, useGoBack } from './shared';

/**
 * S-19 Support Artist — quick donation sheet (mobile app/sheets/support.tsx). UI/state only: no real MBANK payment,
 * balance check or bank auth.
 */
export function SupportPage() {
  const [params] = useSearchParams();
  const artistId = params.get('artistId') ?? undefined;
  const artist = getArtistById(artistId ?? '');
  const { locale, t } = useAppStrings();
  const navigate = useNavigate();
  usePageTitle(t('supportArtistTitle'));

  const storeArtistId = useSupportStore((s) => s.artistId);
  const amount = useSupportStore((s) => s.amount);
  const startSupport = useSupportStore((s) => s.startSupport);
  const selectAmount = useSupportStore((s) => s.selectAmount);
  const goToConfirm = useSupportStore((s) => s.goToConfirm);

  const [customAmountText, setCustomAmountText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (artistId && artistId !== useSupportStore.getState().artistId) startSupport(artistId);
  }, [artistId, startSupport]);

  if (!artist) {
    return (
      <SheetCard title={t('supportArtistTitle')}>
        <p className="t-body-md medium sh-center">{t('artistNotFoundLabel')}</p>
      </SheetCard>
    );
  }

  const customAmount = Number(customAmountText);
  const isCustomValid = customAmountText.trim().length > 0 && Number.isFinite(customAmount) && customAmount > 0;
  // Until the store has switched to this artist, no amount from a previous flow is shown as selected.
  const current = storeArtistId === artist.id ? amount : undefined;

  function handleSelectPreset(preset: number) {
    setShowCustomInput(false);
    selectAmount(preset);
  }

  function handleMorePress() {
    setShowCustomInput(true);
    if (isCustomValid) selectAmount(Math.round(customAmount));
    else selectAmount(undefined as unknown as number);
  }

  function handleCustomAmountChange(text: string) {
    setCustomAmountText(text);
    const parsed = Number(text);
    if (text.trim().length > 0 && Number.isFinite(parsed) && parsed > 0) selectAmount(Math.round(parsed));
  }

  function handleContinue() {
    if (!current) return;
    goToConfirm();
    void navigate('/sheets/support-confirm', { replace: true });
  }

  return (
    <SheetCard title={t('supportArtistTitle')} fallback={`/artist/${artist.id}`}>
      <p className="t-body-sm sh-sub">{artistPatronageSubtitle(locale, artist.name)}</p>
      <div className="sh-amounts">
        {quickDonationAmountsKgs.map((preset) => (
          <AmountChip key={preset} amount={String(preset)} unit="сом" selected={!showCustomInput && current === preset} onClick={() => handleSelectPreset(preset)} />
        ))}
        <AmountChip icon="favorite" label={t('moreAmountLabel')} selected={showCustomInput} onClick={handleMorePress} />
      </div>

      {showCustomInput && (
        <div className="sh-custom">
          <div className="sh-custom-input">
            <input
              className="ui-input"
              inputMode="numeric"
              aria-label={t('customAmountPlaceholder')}
              placeholder={t('customAmountPlaceholder')}
              value={customAmountText}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              // oxlint-disable-next-line jsx-a11y/no-autofocus -- the field appears in response to the user's "More" choice
              autoFocus
            />
            <span className="suffix">сом</span>
          </div>
          {!isCustomValid && customAmountText.trim().length > 0 && <p className="t-body-sm sh-error">{t('amountValidationError')}</p>}
        </div>
      )}

      <button type="button" className="ui-btn sh-cta" disabled={!current} onClick={handleContinue}>
        <Icon name="bolt" size={20} />
        {current ? supportWithAmountLabel(locale, formatKgsAmount(current)) : t('selectAnAmount')}
      </button>

      <p className="t-body-sm sh-foot">
        <Icon name="lock" size={14} />
        <span>{t('directPayoutToArtistLabel')}</span>
      </p>
    </SheetCard>
  );
}

/**
 * S-20 Donation Confirmation (mobile app/sheets/support-confirm.tsx): routes through the shared MBANK demo checkout
 * (processing → result) like Studio Pro and Promotion. Nothing contacts a bank.
 */
export function SupportConfirmPage() {
  const artistId = useSupportStore((s) => s.artistId);
  const amount = useSupportStore((s) => s.amount);
  const stage = usePaymentStore((s) => s.stage);
  const { t, locale } = useAppStrings();
  const navigate = useNavigate();
  const goBack = useGoBack();
  usePageTitle(t('supportArtistTitle'));

  const artist = artistId ? getArtistById(artistId) : undefined;

  if (!artist || !amount) {
    return (
      <SheetCard>
        <NothingHere message={t('nothingToConfirmMessage')} />
      </SheetCard>
    );
  }

  async function startDonationPayment(outcome: 'success' | 'failed') {
    if (!artist || !amount) return;
    const order: PaymentOrder = {
      id: newOrderId('DONATE'),
      amountKgs: amount,
      currency: 'KGS',
      description: supportTitleLabel(locale, artist.name),
      purpose: 'donation',
    };
    // start() first so the buttons disable (via `stage`) before createSession() resolves — no double submit.
    usePaymentStore.getState().start(order);
    // The website only has the demo adapter: an in-app checkout that never moves money.
    await demoMbankPaymentAdapter.createSession(order);
    void navigate(`/sheets/mbank-processing?outcome=${outcome}`, { replace: true });
  }

  const busy = stage === 'pending' || stage === 'processing';
  return (
    <SheetCard>
      <SheetBody>
        <span className="sh-avatar">
          <Artwork source={artist.photoUri} />
        </span>
        <h1 className="sh-name t-headline-md">
          {supportTitleLabel(locale, artist.name)}
          {artist.verified && <Icon name="verified" size={18} />}
        </h1>
        {artist.genres && artist.genres.length > 0 && <p className="t-body-md medium sh-center ellipsis">{artist.genres.join(' · ')}</p>}

        <div className="sh-amount-card">
          <span className="sh-eyebrow">{t('contributionAmountLabel')}</span>
          <span className="sh-big">
            <span className="num">{formatKgsAmount(amount)}</span>
            <span className="cur">сом</span>
          </span>
        </div>

        <div className="sh-account">
          <span className="ic">
            <Icon name="account-balance-wallet" size={22} />
          </span>
          <span className="name t-label-lg ellipsis">{t('mbankAccountMasked')}</span>
          <span className="sh-badge">{t('directWordLabel')}</span>
        </div>

        <DemoNotice text={t('demoNoMoneySentLabel')} />

        <button type="button" className="ui-btn sh-cta" disabled={busy} onClick={() => void startDonationPayment('success')}>
          {confirmAndSendLabel(locale, formatKgsAmount(amount))}
          <Icon name="bolt" size={20} />
        </button>
        <TextLink label={t('mbankWidgetSimulateDeclineLabel')} disabled={busy} onClick={() => void startDonationPayment('failed')} />
        <TextLink label={t('cancel')} disabled={busy} onClick={() => goBack()} />
      </SheetBody>
    </SheetCard>
  );
}

/**
 * S-21 Support Success (mobile app/sheets/support-success.tsx): the artist/amount of the local donation flow. No
 * transaction id is invented and no money moved.
 */
export function SupportSuccessPage() {
  const artistId = useSupportStore((s) => s.artistId);
  const amount = useSupportStore((s) => s.amount);
  const currency = useSupportStore((s) => s.currency);
  const reset = useSupportStore((s) => s.reset);
  const { t, locale } = useAppStrings();
  const navigate = useNavigate();
  const goBack = useGoBack();
  usePageTitle(t('supportArtistTitle'));

  const artist = artistId ? getArtistById(artistId) : undefined;

  if (!artist || !amount) {
    return (
      <SheetCard>
        <NothingHere message={t('nothingRecentSupportMessage')} linkLabel={t('closeLabel')} />
      </SheetCard>
    );
  }

  function handleDone() {
    reset();
    goBack();
  }

  return (
    <SheetCard onClose={handleDone}>
      <SheetBody>
        <span className="sh-glow heart">
          <span className="inner">
            <Icon name="favorite" size={32} />
          </span>
        </span>
        <p className="sh-label-primary">{t('directPatronageCompleteLabel')}</p>
        <h1 className="sh-headline">{supportedAmountHeadline(locale, formatKgsAmount(amount), currency === 'KGS' ? 'сом' : currency)}</h1>
        <span className="sh-chip">
          <Artwork source={artist.photoUri} />
          <span className="t-label-lg">{artist.name}</span>
          {artist.verified && <Icon name="verified" size={16} className="verified" />}
        </span>
        <DemoNotice text={t('demoNoMoneyWasSentLabel')} />
        <button type="button" className="ui-btn sh-cta" onClick={handleDone}>
          {t('doneLabel')}
          <Icon name="check" size={20} />
        </button>
        <TextLink
          icon="receipt-long"
          label={t('viewSupportReceiptLabel')}
          onClick={() => {
            reset();
            void navigate('/profile/support-history', { replace: true });
          }}
        />
      </SheetBody>
    </SheetCard>
  );
}
