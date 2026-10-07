import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SettingsSectionCard, useSettingsSections } from '@/components/settings-sections';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon, PressableScale, TextField } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';

/**
 * S-24 Settings — Audio & Account (docs/screens.md §3.11): the full approved
 * Stitch screen with every section. Profile Hub's Audio Quality & Playback,
 * Downloads & Offline and Account & Security rows open their own focused
 * screens built from the same shared sections (components/settings-sections),
 * so values stay in sync. All values are session-local mock state.
 */
export default function SettingsScreen() {
  const [query, setQuery] = useState('');
  const { showToast, toast } = useToast();
  const byId = useSettingsSections(showToast);
  const sections = [byId.audio, byId.downloads, byId.playback, byId.account];

  const normalized = query.trim().toLowerCase();
  const filteredSections = normalized
    ? sections
        .map((section) => ({ ...section, rows: section.rows.filter((row) => row.label.toLowerCase().includes(normalized)) }))
        .filter((section) => section.rows.length > 0)
    : sections;

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <TextField
          placeholder="Search settings"
          value={query}
          onChangeText={setQuery}
          leftAccessory={<Icon name="search" size={18} color={Colors.text.medium} />}
        />

        {filteredSections.length === 0 ? (
          <ThemedText variant="body-md" emphasis="medium" style={styles.noResults}>
            No settings match &quot;{query}&quot;.
          </ThemedText>
        ) : (
          filteredSections.map((section) => <SettingsSectionCard key={section.id} section={section} />)
        )}

        <View style={styles.footer}>
          <ThemedText variant="body-sm" emphasis="medium" style={styles.centerText}>
            Mmusic v0.1.0 (Фаза 4)
          </ThemedText>
          <ThemedText variant="body-sm" emphasis="medium" style={styles.centerText}>
            Powered by MBANK Core Architecture
          </ThemedText>
          <View style={styles.footerLinks}>
            {['Terms', 'Privacy', 'Audio Licenses'].map((label) => (
              <PressableScale
                key={label}
                accessibilityRole="link"
                accessibilityLabel={label}
                onPress={() => showToast(`The ${label} page isn't available yet`, 'info')}
              >
                <ThemedText variant="body-sm" emphasis="primary">
                  {label}
                </ThemedText>
              </PressableScale>
            ))}
          </View>
        </View>
      </ScrollView>

      {toast}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl * 3,
  },
  noResults: {
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  centerText: {
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
});
