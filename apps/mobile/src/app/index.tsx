import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/**
 * Phase 1 placeholder root screen ("Hello Mmusic" — docs/development-plan.md Фаза 1).
 * Replaced by the real Home (S-01) screen and tab navigation in Фаза 3/4.
 */
export default function HomeScreen() {
  return (
    <ThemedView surface="canvas" style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText variant="display-lg-mobile" emphasis="primary">
          Mmusic
        </ThemedText>
        <ThemedText variant="body-md" emphasis="medium" style={styles.tagline}>
          Hello Mmusic — project scaffold ready.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.margin,
  },
  tagline: {
    textAlign: 'center',
  },
});
