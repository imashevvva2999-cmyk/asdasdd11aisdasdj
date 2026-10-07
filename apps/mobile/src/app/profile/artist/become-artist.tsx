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
            <Icon name="graphic-eq" size={36} color={Colors.primary} />
          </View>
          <ThemedText variant="headline-lg" style={styles.centerText}>
            Share Your Sound with the World
          </ThemedText>
          <ThemedText variant="body-md" emphasis="medium" style={styles.centerText}>
            Set up an artist profile to publish tracks and connect with listeners on Mmusic.
          </ThemedText>
        </View>

        <View style={styles.menuList}>
          <MenuRow icon="library-music" title="Share Your Music" subtitle="Publish tracks straight to your own public artist profile" />
          <MenuRow icon="volunteer-activism" title="Fan Support" subtitle="Receive direct patronage from listeners who support your work" />
          <MenuRow icon="insights" title="Artist Insights" subtitle="See how your releases are landing with listeners" />
        </View>

        <PillButton label="Become an Artist" trailingIcon="arrow-forward" onPress={handleBecomeArtist} style={styles.cta} />
      </ScrollView>

      <Toast message="Initializing Artist Studio setup…" icon="sync" visible={initializingToastVisible} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
    gap: Spacing.xl,
    paddingBottom: Spacing.xl * 3,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconHalo: {
    width: 80,
    height: 80,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  centerText: {
    textAlign: 'center',
  },
  menuList: {
    gap: Spacing.xs,
  },
  cta: {
    marginTop: Spacing.sm,
  },
});
