import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState, MenuRow, PillButton } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useDemoStrings } from '@/demo/demo-strings';
import { useToast } from '@/hooks/use-toast';
import { useDemoSessionStore } from '@/state/demo-session-store';

/** Demo Artist Account settings — only reachable while the demo account is
 * signed in: open the dashboard, reset the demo data, or log out. */
export default function DemoAccountScreen() {
  const { d } = useDemoStrings();
  const active = useDemoSessionStore((s) => s.active);
  const resetDemo = useDemoSessionStore((s) => s.resetDemo);
  const signOut = useDemoSessionStore((s) => s.signOut);
  const [confirming, setConfirming] = useState(false);
  const { showToast, toast } = useToast();

  if (!active) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <EmptyState icon="lock" title={d.accountTitle} hint={d.settingsRowSignedOut} actionLabel={d.signIn} onActionPress={() => router.replace('/profile/demo-login')} />
      </ThemedView>
    );
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText variant="body-md" emphasis="medium">
          {d.accountIntro}
        </ThemedText>
        <MenuRow icon="dashboard" title={d.openDashboard} onPress={() => router.push('/profile/artist/dashboard')} />
        <MenuRow icon="restart-alt" tone="secondary" title={d.resetTitle} subtitle={d.resetHint} onPress={() => setConfirming(true)} />
        <MenuRow
          icon="logout"
          tone="neutral"
          title={d.logOut}
          onPress={() => {
            signOut();
            router.replace('/profile');
          }}
        />
      </ScrollView>

      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <View style={styles.backdrop}>
          {/* Tap-outside-to-cancel layer is a sibling of the dialog, so no button nests inside another. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setConfirming(false)} accessibilityRole="button" accessibilityLabel={d.cancel} />
          <View style={styles.dialog} accessibilityRole="alert">
            <ThemedText variant="headline-sm">{d.resetConfirmTitle}</ThemedText>
            <ThemedText variant="body-md" emphasis="medium">
              {d.resetConfirmBody}
            </ThemedText>
            <View style={styles.actions}>
              <PillButton label={d.cancel} variant="secondary" onPress={() => setConfirming(false)} style={styles.action} />
              <PillButton
                label={d.resetConfirm}
                onPress={() => {
                  resetDemo();
                  setConfirming(false);
                  showToast(d.resetDone, 'check-circle');
                }}
                style={styles.action}
              />
            </View>
          </View>
        </View>
      </Modal>
      {toast}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.margin, gap: Spacing.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: Spacing.margin },
  dialog: { width: '100%', maxWidth: 420, backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.md },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  action: { flex: 1 },
});
