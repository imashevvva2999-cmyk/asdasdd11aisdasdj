import { StyleSheet, View } from 'react-native';

import { DemoNotice } from '@/components/demo-notice';
import { ThemedText } from '@/components/themed-text';
import { Icon, PillButton, SheetScreen, TextLinkButton } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { formatKgsAmount } from '@/lib/format-currency';
import { goBack } from '@/lib/navigation';
import { useAppStrings } from '@/state/locale-store';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { usePaymentStore } from '@/state/payment-store';

/**
 * MBANK checkout — DEMO (see src/lib/payments/mbank-payment.ts and
 * docs/mbank-payment-integration.md). Same visual pattern as the listener
 * donation confirmation (S-20). Nothing here contacts MBANK or moves money:
 * the outcome is simulated and labelled as such everywhere it is shown.
 */
export default function MbankPaySheet() {
  const order = usePaymentStore((s) => s.order);
  const stage = usePaymentStore((s) => s.stage);
  const completeDemo = usePaymentStore((s) => s.completeDemo);
  const { t } = useDashboardStrings();
  const app = useAppStrings();

  async function finish(outcome: 'success' | 'cancelled' | 'failed') {
    await completeDemo(outcome);
    goBack();
  }

  if (!order) {
    return (
      <SheetScreen>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          {app.t('nothingToConfirmMessage')}
        </ThemedText>
        <TextLinkButton label={app.t('backLabel')} onPress={() => goBack()} style={styles.center} />
      </SheetScreen>
    );
  }

  const processing = stage === 'processing';
  return (
    <SheetScreen>
      <View style={styles.content}>
        <View style={styles.bankMark}>
          <Icon name="account-balance" size={30} color={Colors.secondary} />
        </View>
        <ThemedText variant="headline-md">{t('mbankCheckoutTitle')}</ThemedText>
        <ThemedText variant="body-md" emphasis="medium" style={styles.centerText} numberOfLines={2}>
          {order.description}
        </ThemedText>

        <View style={styles.amountCard}>
          <ThemedText variant="label-sm" style={styles.eyebrow}>
            {t('orderLabel')} · {order.id}
          </ThemedText>
          <View style={styles.amountRow}>
            <ThemedText variant="display-lg">{formatKgsAmount(order.amountKgs)}</ThemedText>
            <ThemedText variant="headline-sm" emphasis="medium">
              сом
            </ThemedText>
          </View>
        </View>

        <View style={styles.accountCard}>
          <Icon name="account-balance-wallet" size={22} color={Colors.secondary} />
          <ThemedText variant="label-lg" style={styles.flexText} numberOfLines={1}>
            {app.t('mbankAccountMasked')}
          </ThemedText>
          <ThemedText variant="label-md" emphasis="medium">
            {t('merchantLabel')}: Mmusic
          </ThemedText>
        </View>

        <DemoNotice text={t('mbankDemoNotice')} style={styles.notice} />

        <PillButton
          label={`${t('payAmountPrefix')} ${formatKgsAmount(order.amountKgs)} сом`}
          trailingIcon="lock"
          loading={processing}
          onPress={() => finish('success')}
          style={styles.cta}
        />
        <TextLinkButton label={t('simulateDecline')} tone="muted" disabled={processing} onPress={() => finish('failed')} />
        <TextLinkButton label={t('cancelPayment')} tone="muted" disabled={processing} onPress={() => finish('cancelled')} />
      </View>
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  notFound: { padding: Spacing.margin, textAlign: 'center' },
  center: { alignSelf: 'center', marginTop: Spacing.sm },
  content: { padding: Spacing.margin, alignItems: 'center', gap: Spacing.sm },
  bankMark: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 196, 82, 0.14)',
  },
  centerText: { textAlign: 'center' },
  amountCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: Colors.surface.l2,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    gap: 4,
    marginTop: Spacing.sm,
  },
  eyebrow: { color: Colors.text.medium },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  accountCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface.l1,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  flexText: { flex: 1, minWidth: 0 },
  notice: { marginTop: Spacing.sm },
  cta: { alignSelf: 'stretch', marginTop: Spacing.sm },
});
