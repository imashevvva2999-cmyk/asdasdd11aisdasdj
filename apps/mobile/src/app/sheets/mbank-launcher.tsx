import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DemoNotice } from '@/components/demo-notice';
import { ThemedText } from '@/components/themed-text';
import { IconButton, MenuRow, SheetScreen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { goBack } from '@/lib/navigation';
import { useAppStrings } from '@/state/locale-store';

/**
 * Entry point opened by the floating MBANK payment button
 * (components/mbank/floating-payment-button.tsx) — picks which existing
 * payment flow to start. Each scenario routes into the SAME shared pipeline
 * (lib/payments/mbank-payment.ts, sheets/mbank-pay.tsx, sheets/mbank-processing.tsx,
 * sheets/mbank-result.tsx) the Donation/Studio Pro flows already use; nothing
 * new is invented here.
 */
export default function MbankLauncherSheet() {
  const { t } = useAppStrings();

  return (
    <SheetScreen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText variant="headline-md">{t('mbankLauncherTitle')}</ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            {t('mbankLauncherSubtitle')}
          </ThemedText>
        </View>
        <IconButton icon="close" size={36} accessibilityLabel={t('closeLabel')} onPress={() => goBack()} />
      </View>

      <View style={styles.list}>
        <MenuRow
          icon="favorite"
          variant="flat"
          title={t('mbankScenarioDonationTitle')}
          subtitle={t('mbankScenarioDonationSubtitle')}
          onPress={() => router.replace('/sheets/mbank-launcher-donate')}
        />
        <MenuRow
          icon="equalizer"
          variant="flat"
          tone="secondary"
          title={t('mbankScenarioStudioProTitle')}
          subtitle={t('mbankScenarioStudioProSubtitle')}
          onPress={() => router.replace('/profile/artist/dashboard/studio-pro')}
        />
        <MenuRow
          icon="storefront"
          variant="flat"
          tone="neutral"
          title={t('mbankScenarioPurchaseTitle')}
          subtitle={t('mbankScenarioPurchaseSubtitle')}
          onPress={() => router.replace('/sheets/mbank-launcher-purchase')}
        />
      </View>

      <DemoNotice text={t('demoNoMoneySentLabel')} style={styles.notice} />
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  list: {
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  notice: {
    marginHorizontal: Spacing.margin,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
});
