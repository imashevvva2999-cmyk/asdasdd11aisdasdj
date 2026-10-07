import { ScrollView, StyleSheet } from 'react-native';

import { SettingsCard, SettingsSectionCard, settingsScreenStyles, useSettingsSections } from '@/components/settings-sections';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon, PressableScale, ValueRow } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { currentUser } from '@/mocks';

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

  return (
    <ThemedView surface="canvas" style={settingsScreenStyles.flex}>
      <ScrollView contentContainerStyle={settingsScreenStyles.content}>
        <SettingsCard title="Account" icon="person">
          <ValueRow title="Name" value={currentUser.name} />
          <ValueRow title="Username" value={`@${currentUser.username}`} />
          <ValueRow title="Member since" value={String(currentUser.memberSinceYear)} />
        </SettingsCard>

        <SettingsCard title="Security" icon="verified-user">
          <ValueRow title="MBANK Connected ID" value="Connected (demo)" />
        </SettingsCard>

        <SettingsSectionCard section={sections.account} />

        <ThemedText variant="body-sm" emphasis="low" style={styles.note}>
          Demo account — no real MBANK account is linked in this preview.
        </ThemedText>

        <PressableScale
          accessibilityRole="button"
          onPress={() => showToast("Signing out isn't available in this preview", 'logout')}
          style={styles.logOut}
        >
          <Icon name="logout" size={20} color={Colors.primary} />
          <ThemedText variant="label-lg" emphasis="primary">
            Log Out
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
