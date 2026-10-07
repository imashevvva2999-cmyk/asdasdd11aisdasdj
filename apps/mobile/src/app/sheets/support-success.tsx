import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon, PillButton, TextLinkButton } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getArtistById } from '@/mocks';
import { useSupportStore } from '@/state/support-store';

/**
 * S-21 Support Success (docs/screens.md §3.12). Shows the artist/amount from
 * the local donation flow. No fake transaction ID is generated and no real
 * bank transaction occurred — "Authorized via MBANK Biometric • 0 Fee" (fee
 * claim, OQ-10) and the "Top 1% Patron" / "Attached Note" gamification
 * copy from the Stitch design are intentionally omitted: OQ-10/OQ-11/OQ-12
 * are unresolved, so this screen does not present them as real.
 */
export default function SupportSuccessSheet() {
  const artistId = useSupportStore((s) => s.artistId);
  const amount = useSupportStore((s) => s.amount);
  const currency = useSupportStore((s) => s.currency);
  const reset = useSupportStore((s) => s.reset);

  const artist = artistId ? getArtistById(artistId) : undefined;

  if (!artist || !amount) {
    return (
      <ThemedView surface="l2" style={styles.flex}>
        <View style={styles.handle} />
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          No recent support to show.
        </ThemedText>
        <TextLinkButton label="Close" onPress={() => router.back()} style={styles.notFoundLink} />
      </ThemedView>
    );
  }

  function handleDone() {
    reset();
    router.back();
  }

  return (
    <ThemedView surface="l2" style={styles.flex}>
      <View style={styles.handle} />
      <View style={styles.content}>
        <View style={styles.iconHalo}>
          <Icon name="favorite" size={36} color={Colors.primary} />
        </View>
        <ThemedText variant="headline-md" style={styles.centerText}>
          Direct Patronage Complete
        </ThemedText>
        <ThemedText variant="headline-sm" style={styles.centerText}>
          Supported {amount} {currency === 'KGS' ? 'сом' : currency}
        </ThemedText>

        <View style={styles.artistChip}>
          <ThemedText variant="label-md">{artist.name}</ThemedText>
          {artist.verified && <Icon name="verified" size={14} color={Colors.secondary} />}
        </View>

        <PillButton label="Done" onPress={handleDone} style={styles.cta} />
        <TextLinkButton
          label="View Support Receipt in History"
          onPress={() => {
            reset();
            router.dismissTo('/profile/support-history');
          }}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notFound: {
    padding: Spacing.margin,
    textAlign: 'center',
  },
  notFoundLink: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.text.low,
    marginTop: Spacing.sm,
  },
  content: {
    padding: Spacing.margin,
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
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
  artistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface.l3,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  cta: {
    width: '100%',
    marginTop: Spacing.sm,
  },
});
