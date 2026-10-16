import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Artwork, IconButton, Icon, PressableScale, SheetScreen } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { artists } from '@/mocks';
import { goBack } from '@/lib/navigation';
import { useAppStrings } from '@/state/locale-store';

/**
 * Artist picker for the floating MBANK button's "Artist Donation" scenario —
 * donations need an artist and none is invented here: picking one starts the
 * EXACT same flow as tapping "Support" from an artist's own profile
 * (sheets/support.tsx reads `artistId` from the route param, unchanged).
 */
export default function MbankLauncherDonateSheet() {
  const { t } = useAppStrings();

  function pick(artistId: string) {
    router.replace({ pathname: '/sheets/support', params: { artistId } });
  }

  return (
    <SheetScreen>
      <View style={styles.header}>
        <ThemedText variant="headline-md" style={styles.headerText}>
          {t('mbankPickArtistTitle')}
        </ThemedText>
        <IconButton icon="close" size={36} accessibilityLabel={t('closeLabel')} onPress={() => goBack()} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {artists.map((artist) => (
          <PressableScale key={artist.id} style={styles.row} onPress={() => pick(artist.id)} accessibilityRole="button">
            <Artwork shape="circle" size={44} radius={22} uri={artist.photoUri} placeholderIcon="person" />
            <ThemedText variant="label-lg" style={styles.name} numberOfLines={1}>
              {artist.name}
            </ThemedText>
            {artist.verified && <Icon name="verified" size={16} color={Colors.primary} />}
          </PressableScale>
        ))}
      </ScrollView>
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  list: {
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: 2,
    maxHeight: 440,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  name: {
    flex: 1,
    minWidth: 0,
  },
});
