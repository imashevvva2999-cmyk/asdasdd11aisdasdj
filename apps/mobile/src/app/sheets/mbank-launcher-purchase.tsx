import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AmountChip, IconButton, PillButton, SheetScreen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatKgsAmount } from '@/lib/format-currency';
import { goBack } from '@/lib/navigation';
import { getMbankPaymentAdapter, newOrderId, type PaymentOrder } from '@/lib/payments/mbank-payment';
import { quickDonationAmountsKgs } from '@/mocks';
import { useAppStrings } from '@/state/locale-store';
import { usePaymentStore } from '@/state/payment-store';

/**
 * Amount picker for the floating MBANK button's "General Purchase" scenario.
 * This app has no real product catalog to attach a purchase to, so rather
 * than inventing one, this asks for an amount (same preset amounts Donation
 * already uses) and builds a generic, clearly-labeled demo order — then hands
 * off to the EXISTING mbank-pay.tsx checkout sheet, unchanged.
 */
export default function MbankLauncherPurchaseSheet() {
  const { t } = useAppStrings();
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

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
    const session = await getMbankPaymentAdapter().createSession(order);
    if (session.kind === 'redirect') {
      if (Platform.OS === 'web') window.location.assign(session.checkoutUrl);
      else void Linking.openURL(session.checkoutUrl);
      return;
    }
    router.replace('/sheets/mbank-pay');
  }

  return (
    <SheetScreen>
      <View style={styles.header}>
        <ThemedText variant="headline-md" style={styles.headerText}>
          {t('mbankPurchaseAmountTitle')}
        </ThemedText>
        <IconButton icon="close" size={36} accessibilityLabel={t('closeLabel')} onPress={() => goBack()} />
      </View>

      <View style={styles.chips}>
        {quickDonationAmountsKgs.map((preset) => (
          <AmountChip
            key={preset}
            amount={formatKgsAmount(preset)}
            unit="сом"
            selected={amount === preset}
            onPress={() => setAmount(preset)}
          />
        ))}
      </View>

      <PillButton
        label={t('continueLabel')}
        trailingIcon="arrow-forward"
        disabled={!amount}
        loading={submitting}
        onPress={handleContinue}
        style={styles.cta}
      />
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  cta: {
    marginHorizontal: Spacing.margin,
    marginBottom: Spacing.md,
  },
});
