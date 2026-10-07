import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon, MenuRow, PillButton, Toast } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';

/**
 * S-25 Become an Artist — UF-14 step 1 (docs/screens.md). No real identity
 * verification, KYC, MBANK verification, or backend artist creation happens
 * here — those remain unresolved product/backend questions (OQ-48/49) and
 * are deliberately out of this screen's functional behavior.
 */
export default function BecomeArtistScreen() {
  const [initializingToastVisible, setInitializingToastVisible] = useState(false);

  function handleBecomeArtist() {
    setInitializingToastVisible(true);
    setTimeout(() => {
      setInitializingToastVisible(false);
      router.push('/profile/artist/setup');
    }, 600);
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.iconHalo}>
            <Icon name="graphic-eq" size={44} color={Colors.primary} />
            <View style={styles.iconBadge}>
              <Icon name="graphic-eq" size={14} color={Colors.text.high} />
            </View>
          </View>
          <ThemedText variant="display-lg-mobile" style={styles.centerText}>
            Share Your Sound with the World
          </ThemedText>
          <ThemedText variant="body-lg" emphasis="medium" style={styles.centerText}>
            Share your music, connect with listeners and receive support directly through Mmusic.
          </ThemedText>
        </View>

        <View style={styles.menuList}>
          <MenuRow variant="feature" icon="cloud-upload" title="Share Your Music" subtitle="Upload and publish your tracks." />
          <MenuRow variant="feature" icon="volunteer-activism" title="Fan Support" subtitle="Receive support directly from listeners." />
          <MenuRow variant="feature" icon="insights" title="Artist Insights" subtitle="See how listeners engage with your music." />
        </View>

        <View style={styles.spacer} />
        <PillButton label="BECOME AN ARTIST" trailingIcon="arrow-forward" onPress={handleBecomeArtist} style={styles.cta} />
      </ScrollView>

      <Toast message="Initializing Artist Studio setup…" icon="sync" visible={initializingToastVisible} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: Spacing.margin,
    gap: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconHalo: {
    width: 96,
    height: 96,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface.l3,
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  iconBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 28,
    height: 28,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  menuList: {
    gap: Spacing.md,
  },
  spacer: {
    flex: 1,
  },
  cta: {
    height: 56,
  },
});
