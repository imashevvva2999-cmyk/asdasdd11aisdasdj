import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Icon, SheetScreen, TextLinkButton } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { goBack } from '@/lib/navigation';
import { useAppStrings } from '@/state/locale-store';
import { usePaymentStore } from '@/state/payment-store';

/**
 * Universal MBANK "processing" interstitial — the only place `completeDemo`
 * is called from, so every payment path (donation, studio-pro, promotion,
 * future purchases) shares one processing animation and one source of truth
 * for the simulated bank round-trip. See src/lib/payments/mbank-payment.ts.
 */
const VALID_OUTCOMES = ['success', 'cancelled', 'failed'] as const;

export default function MbankProcessingSheet() {
  const { outcome: rawOutcome } = useLocalSearchParams<{ outcome?: string }>();
  const outcome = VALID_OUTCOMES.find((o) => o === rawOutcome);
  const order = usePaymentStore((s) => s.order);
  const completeDemo = usePaymentStore((s) => s.completeDemo);
  const { t } = useAppStrings();
  const started = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!order || !outcome || started.current) return;
    started.current = true;
    completeDemo(outcome).then(() => {
      // The backdrop dismiss is disabled below, but a system back
      // gesture could still unmount this screen mid-delay — don't force
      // the user back into a sheet they already left.
      if (mounted.current) router.replace('/sheets/mbank-result');
    });
  }, [order, outcome, completeDemo]);

  if (!order || !outcome) {
    return (
      <SheetScreen>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          {t('nothingToConfirmMessage')}
        </ThemedText>
        <TextLinkButton label={t('backLabel')} onPress={() => goBack()} style={styles.center} />
      </SheetScreen>
    );
  }

  return (
    // A demo charge is "in flight" here — same as a real bank's non-cancelable
    // authorization step — so the backdrop tap is disabled rather than racing
    // the completeDemo() delay with a dismiss.
    <SheetScreen onDismiss={() => {}}>
      <View style={styles.content}>
        <View style={styles.bankMark}>
          <Icon name="account-balance" size={30} color={Colors.secondary} />
        </View>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
        <ThemedText variant="headline-md" style={styles.centerText}>
          {t('mbankWidgetProcessingTitle')}
        </ThemedText>
        <ThemedText variant="body-md" emphasis="medium" style={styles.centerText}>
          {t('mbankWidgetProcessingHint')}
        </ThemedText>
      </View>
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  notFound: { padding: Spacing.margin, textAlign: 'center' },
  center: { alignSelf: 'center', marginTop: Spacing.sm },
  content: { padding: Spacing.margin, alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xl },
  bankMark: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 196, 82, 0.14)',
  },
  spinner: { marginTop: Spacing.md },
  centerText: { textAlign: 'center' },
});
