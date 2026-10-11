import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon, PressableScale } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useAppStrings, type AppLocale } from '@/state/locale-store';

/** Each language's own native name — shown as-is regardless of the current
 * app language (standard language-picker convention: a reader must be able
 * to find their language even if they can't read the UI's current one), so
 * these are literal strings, not `t()` lookups. */
const OPTIONS: { value: AppLocale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
];

/**
 * App Language — dedicated selection screen (Settings > App Language).
 * Tap a language to select it directly (no cycling). Updates the shared
 * global locale store immediately, which every screen (including the
 * Artist Dashboard) reads from and which persists across reloads.
 */
export default function SettingsLanguageScreen() {
  const { locale, setLocale } = useAppStrings();

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <View style={styles.content}>
        <View style={styles.card}>
          {OPTIONS.map((option, index) => {
            const selected = locale === option.value;
            return (
              <PressableScale
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setLocale(option.value)}
                style={[styles.row, index > 0 && styles.rowDivider]}
              >
                <ThemedText variant="label-lg" style={styles.rowLabel}>
                  {option.label}
                </ThemedText>
                {selected && <Icon name="check" color={Colors.primary} />}
              </PressableScale>
            );
          })}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
  },
  card: {
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: Spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  rowLabel: {
    flex: 1,
  },
});
