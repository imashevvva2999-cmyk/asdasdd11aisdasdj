import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { demoAudioCredits } from '@/audio/demo-audio';
import { ThemedText } from '@/components/themed-text';
import { Icon, IconButton, PressableScale, SheetScreen } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { externalLinkAccessibilityLabel, licensedUnderLabel, playsAsLabel } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { getTrackById } from '@/mocks';
import { useAppStrings } from '@/state/locale-store';

/**
 * Demo audio credits [Т] (Фаза 2): opened from the "Demo audio" label in Now
 * Playing. CC BY 4.0 requires a visible credit — the original title, author,
 * source and licence for each recording that stands in for a catalog track.
 */
export default function DemoAudioSheet() {
  const entries = Object.entries(demoAudioCredits);
  const { t, locale } = useAppStrings();

  return (
    <SheetScreen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText variant="headline-md">{t('demoAudio')}</ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            {t('demoAudioDescriptionHint')}
          </ThemedText>
        </View>
        <IconButton icon="close" size={36} accessibilityLabel={t('closeLabel')} onPress={() => goBack()} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {entries.map(([trackId, credit]) => {
          if (!credit) return null;
          const track = getTrackById(trackId);
          return (
            <View key={trackId} style={styles.card}>
              <ThemedText variant="label-sm" emphasis="medium">
                {playsAsLabel(locale, track?.title ?? trackId)}
              </ThemedText>
              <ThemedText variant="label-lg">
                “{credit.originalTitle}” {credit.author} (incompetech.com)
              </ThemedText>
              <ThemedText variant="body-sm" emphasis="medium">
                {licensedUnderLabel(locale, credit.licenseName)}
              </ThemedText>
              <View style={styles.links}>
                <ExternalLink label={t('licenceCcBy4Label')} url={credit.licenseUrl} />
                <ExternalLink label={t('sourceIncompetechLabel')} url={credit.sourceUrl} />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SheetScreen>
  );
}

function ExternalLink({ label, url }: { label: string; url: string }) {
  const { locale } = useAppStrings();
  return (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={externalLinkAccessibilityLabel(locale, label, url)}
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
