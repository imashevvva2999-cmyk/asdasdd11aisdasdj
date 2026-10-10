import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Artwork, Icon, PillButton, SheetScreen, TextLinkButton } from '@/components/ui';
import { DemoNotice } from '@/components/demo-notice';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { formatKgsAmount } from '@/lib/format-currency';
import { goBack } from '@/lib/navigation';
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
      <SheetScreen>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          No recent support to show.
        </ThemedText>
        <TextLinkButton label="Close" onPress={() => goBack()} style={styles.notFoundLink} />
      </SheetScreen>
    );
  }

  function handleDone() {
    reset();
    goBack();
  }

  return (
    <SheetScreen>
      <View style={styles.content}>
        <View style={styles.iconGlow}>
          <View style={styles.iconCircle}>
            <Icon name="favorite" size={32} color={Colors.primary} />
          </View>
        </View>
        <ThemedText variant="label-md" emphasis="primary" style={styles.eyebrow}>
          Direct Patronage Complete
        </ThemedText>
        <ThemedText variant="display-lg" style={styles.centerText}>
          Supported {formatKgsAmount(amount)} {currency === 'KGS' ? 'сом' : currency}
        </ThemedText>

        <View style={styles.artistChip}>
          <Artwork shape="circle" size={24} radius={12} uri={artist.photoUri} placeholderIcon="person" />
          <ThemedText variant="label-lg">{artist.name}</ThemedText>
          {artist.verified && <Icon name="verified" size={16} color={Colors.primary} />}
        </View>

        <DemoNotice text="Demo — no money was sent" style={styles.demoNotice} />
        <PillButton label="Done" trailingIcon="check" onPress={handleDone} style={styles.cta} />
        <TextLinkButton
          tone="muted"
          icon="receipt-long"
          label="View Support Receipt in History"
          style={styles.receiptLink}
          onPress={() => {
            reset();
            router.dismissTo('/profile/support-history');
          }}
        />
      </View>
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  demoNotice: {
    marginTop: Spacing.md,
  },
  notFound: {
    padding: Spacing.margin,
    textAlign: 'center',
  },
  notFoundLink: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  content: {
    padding: Spacing.margin,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconGlow: {
    padding: 14,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 75, 75, 0.12)',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface.l3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    shadowOpacity: 0.55,
    elevation: 8,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  centerText: {
    textAlign: 'center',
  },
  artistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface.l2,
    borderRadius: Radii.full,
    paddingLeft: 6,
    paddingRight: Spacing.md,
    paddingVertical: 6,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  cta: {
    width: '100%',
    height: 52,
  },
  receiptLink: {
    marginTop: Spacing.sm,
  },
});
