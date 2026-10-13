import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DemoNotice } from '@/components/demo-notice';
import { ThemedText } from '@/components/themed-text';
import { Artwork, Icon, PillButton, SheetScreen, TextLinkButton } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { formatKgsAmount } from '@/lib/format-currency';
import { supportedAmountHeadline } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { getArtistById } from '@/mocks';
import type { AppStringKey } from '@/lib/i18n';
import type { PaymentOrder, PaymentResult } from '@/lib/payments/mbank-payment';
import { useAppStrings } from '@/state/locale-store';
import { usePaymentStore } from '@/state/payment-store';
import { useSupportStore } from '@/state/support-store';

/**
 * Universal MBANK result sheet (Success / Failed / Cancelled) — purpose-aware
 * so one screen serves donations, Studio Pro, and future purchases. Reads
 * from the shared `usePaymentStore` populated by mbank-processing.tsx; owns
 * the store `reset()` call (only on a final Done/Close) so Retry can replay
 * the still-present order through the Pay step.
 */
export default function MbankResultSheet() {
  const order = usePaymentStore((s) => s.order);
  const result = usePaymentStore((s) => s.result);
  const donationArtistId = useSupportStore((s) => s.artistId);
  const { t, locale } = useAppStrings();
  const historyAppended = useRef(false);

  const isDonationSuccess = order?.purpose === 'donation' && result?.outcome === 'success';

  // Donation history (S-22) still needs one entry per completed donation;
  // useSupportStore.confirm() now only runs through this shared pipeline's
  // success path, so append here instead of inside that store's own method.
  useEffect(() => {
    if (!isDonationSuccess || historyAppended.current) return;
    historyAppended.current = true;
    useSupportStore.setState((state) => {
      const { artistId, amount } = state;
      if (!artistId || !amount) return state;
      return {
        history: [
          {
            id: `sup-${Date.now()}`,
            artistId,
            amount,
            currency: state.currency,
            status: 'completed',
            createdAt: new Date().toISOString(),
          },
          ...state.history,
        ],
      };
    });
  }, [isDonationSuccess]);

  if (!order || !result) {
    return (
      <SheetScreen>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          {t('nothingToConfirmMessage')}
        </ThemedText>
        <TextLinkButton label={t('backLabel')} onPress={() => goBack()} style={styles.center} />
      </SheetScreen>
    );
  }

  const retryRoute = order.purpose === 'donation' ? '/sheets/support-confirm' : '/sheets/mbank-pay';

  function finishAndClose(destination?: '/profile/support-history') {
    usePaymentStore.getState().reset();
    if (order?.purpose === 'donation') useSupportStore.getState().reset();
    if (destination) router.dismissTo(destination);
    else goBack();
  }

  function retry() {
    router.replace(retryRoute);
  }

  if (result.outcome === 'success') {
    return (
      <SheetScreen onDismiss={() => finishAndClose()}>
        <SuccessContent
          order={order}
          result={result}
          locale={locale}
          t={t}
          donationArtistId={donationArtistId}
          onDone={finishAndClose}
        />
      </SheetScreen>
    );
  }

  const isFailed = result.outcome === 'failed';
  return (
    <SheetScreen onDismiss={() => finishAndClose()}>
      <View style={styles.content}>
        <View style={[styles.iconGlow, isFailed ? styles.iconGlowError : styles.iconGlowNeutral]}>
          <Icon name={isFailed ? 'error-outline' : 'cancel'} size={48} color={isFailed ? Colors.error : Colors.text.medium} />
        </View>
        <ThemedText variant="headline-md" style={styles.centerText}>
          {t(isFailed ? 'mbankWidgetFailedTitle' : 'mbankWidgetCancelledTitle')}
        </ThemedText>
        <ThemedText variant="body-md" emphasis="medium" style={styles.centerText}>
          {t(isFailed ? 'mbankWidgetFailedHint' : 'mbankWidgetCancelledHint')}
        </ThemedText>

        <ThemedText variant="body-sm" emphasis="medium" style={styles.centerText} numberOfLines={2}>
          {order.description} · {formatKgsAmount(order.amountKgs)} сом
        </ThemedText>

        <DemoNotice text={t('demoNoMoneyWasSentLabel')} style={styles.demoNotice} />

        <PillButton label={t('retryLabel')} trailingIcon="refresh" onPress={retry} style={styles.cta} />
        <TextLinkButton label={t('cancel')} tone="muted" onPress={() => finishAndClose()} style={styles.secondaryLink} />
      </View>
    </SheetScreen>
  );
}

function SuccessContent({
  order,
  result,
  locale,
  t,
  donationArtistId,
  onDone,
}: {
  order: PaymentOrder;
  result: PaymentResult;
  locale: 'en' | 'ru';
  t: (key: AppStringKey) => string;
  donationArtistId: string | undefined;
  onDone: (destination?: '/profile/support-history') => void;
}) {
  const artist = order.purpose === 'donation' && donationArtistId ? getArtistById(donationArtistId) : undefined;

  return (
    <View style={styles.content}>
      <View style={[styles.iconGlow, styles.iconGlowSuccess]}>
        <Icon name="check-circle" size={48} color={Colors.tertiary} />
      </View>

      {order.purpose === 'donation' ? (
        <>
          <ThemedText variant="label-md" emphasis="primary" style={styles.eyebrow}>
            {t('directPatronageCompleteLabel')}
          </ThemedText>
          <ThemedText variant="display-lg" style={styles.centerText}>
            {supportedAmountHeadline(locale, formatKgsAmount(order.amountKgs), 'сом')}
          </ThemedText>
          {artist && (
            <View style={styles.artistChip}>
              <Artwork shape="circle" size={24} radius={12} uri={artist.photoUri} placeholderIcon="person" />
              <ThemedText variant="label-lg">{artist.name}</ThemedText>
              {artist.verified && <Icon name="verified" size={16} color={Colors.primary} />}
            </View>
          )}
        </>
      ) : (
        <>
          <ThemedText variant="headline-md" style={styles.centerText}>
            {t(order.purpose === 'studio-pro' ? 'mbankWidgetSubscriptionActivatedTitle' : 'mbankWidgetPurchaseSuccessTitle')}
          </ThemedText>
          <ThemedText variant="body-md" emphasis="medium" style={styles.centerText} numberOfLines={2}>
            {order.description} · {formatKgsAmount(order.amountKgs)} сом
          </ThemedText>
          {result.reference && (
            <ThemedText variant="body-sm" emphasis="medium">
              {t('mbankWidgetReferenceLabel')}: {result.reference}
            </ThemedText>
          )}
        </>
      )}

      <DemoNotice text={t('demoNoMoneyWasSentLabel')} style={styles.demoNotice} />
      <PillButton label={t('doneLabel')} trailingIcon="check" onPress={() => onDone()} style={styles.cta} />
      {order.purpose === 'donation' && (
        <TextLinkButton
          tone="muted"
          icon="receipt-long"
          label={t('viewSupportReceiptLabel')}
          style={styles.secondaryLink}
          onPress={() => onDone('/profile/support-history')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  notFound: { padding: Spacing.margin, textAlign: 'center' },
  center: { alignSelf: 'center', marginTop: Spacing.sm },
  content: { padding: Spacing.margin, alignItems: 'center', gap: Spacing.sm },
  centerText: { textAlign: 'center' },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.8 },
  iconGlow: {
    padding: 14,
    borderRadius: Radii.full,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  iconGlowSuccess: { backgroundColor: 'rgba(255, 122, 89, 0.14)' },
  iconGlowError: { backgroundColor: 'rgba(255, 75, 75, 0.14)' },
  iconGlowNeutral: { backgroundColor: Colors.surface.l2 },
  artistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface.l2,
    borderRadius: Radii.full,
    paddingLeft: 6,
    paddingRight: Spacing.md,
    paddingVertical: 6,
    marginTop: Spacing.xs,
  },
  demoNotice: { marginTop: Spacing.md },
  cta: { width: '100%', height: 52, marginTop: Spacing.sm },
  secondaryLink: { marginTop: Spacing.sm },
});
