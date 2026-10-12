import { ScrollView, StyleSheet } from 'react-native';

import { SettingsCard, SettingsSectionCard, settingsScreenStyles, useSettingsSections } from '@/components/settings-sections';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon, PressableScale, ValueRow } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { currentUser } from '@/mocks';
import { useAppStrings } from '@/state/locale-store';

/**
 * Account & Security — Profile Hub destination (S-23). The design only defines
 * "MBANK Connected ID" on the hub row and the S-24 "Account & Payments" rows
 * (the full screen is undesigned — OQ-42), so this shows the mock profile
 * details, that connection status, those rows, and Log Out. No real account
 * data, authentication or MBANK integration exists; everything is demo state.
 */
export default function AccountScreen() {
  const { showToast, toast } = useToast();
  const sections = useSettingsSections(showToast);
  const { t } = useAppStrings();

  return (
    <ThemedView surface="canvas" style={settingsScreenStyles.flex}>
      <ScrollView contentContainerStyle={settingsScreenStyles.content}>
        <SettingsCard title={t('accountSectionLabel')} icon="person">
          <ValueRow title={t('personNameLabel')} value={currentUser.name} />
          <ValueRow title={t('usernameFieldLabel')} value={`@${currentUser.username}`} />
          <ValueRow title={t('memberSince')} value={String(currentUser.memberSinceYear)} />
        </SettingsCard>

        <SettingsCard title={t('securitySectionLabel')} icon="verified-user">
          <ValueRow title={t('mbankConnectedId')} value={t('connectedDemoLabel')} />
        </SettingsCard>

        <SettingsSectionCard section={sections.account} />

        <ThemedText variant="body-sm" emphasis="low" style={styles.note}>
          {t('demoAccountNote')}
        </ThemedText>

        <PressableScale
          accessibilityRole="button"
          onPress={() => showToast(t('toastSignOut'), 'logout')}
          style={styles.logOut}
        >
          <Icon name="logout" size={20} color={Colors.primary} />
          <ThemedText variant="label-lg" emphasis="primary">
            {t('logOut')}
          </ThemedText>
        </PressableScale>
      </ScrollView>
      {toast}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  note: {
    textAlign: 'center',
  },
  logOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l1,
  },
});
