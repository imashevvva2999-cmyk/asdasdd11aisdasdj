import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { demoAudioCredits } from '@/audio/demo-audio';
import { ThemedText } from '@/components/themed-text';
import { Icon, IconButton, PressableScale, SheetScreen } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { goBack } from '@/lib/navigation';
import { getTrackById } from '@/mocks';

/**
 * Demo audio credits [Т] (Фаза 2): opened from the "Demo audio" label in Now
 * Playing. CC BY 4.0 requires a visible credit — the original title, author,
 * source and licence for each recording that stands in for a catalog track.
 */
export default function DemoAudioSheet() {
  const entries = Object.entries(demoAudioCredits);

  return (
    <SheetScreen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText variant="headline-md">Demo audio</ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            These tracks play licensed demo audio so the player can be tested. It is not the original recording.
          </ThemedText>
        </View>
        <IconButton icon="close" size={36} accessibilityLabel="Close" onPress={() => goBack()} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {entries.map(([trackId, credit]) => {
          if (!credit) return null;
          const track = getTrackById(trackId);
          return (
            <View key={trackId} style={styles.card}>
              <ThemedText variant="label-sm" emphasis="medium">
                Plays as “{track?.title ?? trackId}”
              </ThemedText>
              <ThemedText variant="label-lg">
                “{credit.originalTitle}” {credit.author} (incompetech.com)
              </ThemedText>
              <ThemedText variant="body-sm" emphasis="medium">
                Licensed under {credit.licenseName}
              </ThemedText>
              <View style={styles.links}>
                <ExternalLink label="Licence (CC BY 4.0)" url={credit.licenseUrl} />
                <ExternalLink label="Source: incompetech.com" url={credit.sourceUrl} />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SheetScreen>
  );
}

function ExternalLink({ label, url }: { label: string; url: string }) {
  return (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={`${label}, opens ${url}`}
      onPress={() => {
        Linking.openURL(url).catch(() => {});
      }}
      style={styles.link}
    >
      <ThemedText variant="label-md" emphasis="primary">
        {label}
      </ThemedText>
      <Icon name="open-in-new" size={14} color={Colors.primary} />
    </PressableScale>
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
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  card: {
    gap: 4,
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface.l2,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.lg,
    rowGap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
  },
});
