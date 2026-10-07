import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Icon, PillButton, TextLinkButton } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { getArtistById } from '@/mocks';
import { useSupportStore } from '@/state/support-store';

/**
 * S-20 Donation Confirmation (docs/screens.md §3.12). Frontend confirmation
 * step only — no real MBANK transaction, balance retrieval, or bank auth.
 * `useSupportStore.confirm()` is the single place a future payment call
 * replaces the local success transition (see its own comment).
 */
export default function SupportConfirmSheet() {
  const artistId = useSupportStore((s) => s.artistId);
  const amount = useSupportStore((s) => s.amount);
  const stage = useSupportStore((s) => s.stage);
  const confirm = useSupportStore((s) => s.confirm);

  const artist = artistId ? getArtistById(artistId) : undefined;

  if (!artist || !amount) {
    return (
      <ThemedView surface="l2" style={styles.flex}>
        <View style={styles.handle} />
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          Nothing to confirm. Go back and choose a support amount.
        </ThemedText>
        <TextLinkButton label="Back" onPress={() => router.back()} style={styles.notFoundLink} />
      </ThemedView>
    );
  }

  async function handleConfirm() {
    await confirm();
    router.replace('/sheets/support-success');
  }

  return (
    <ThemedView surface="l2" style={styles.flex}>
      <View style={styles.handle} />
      <View style={styles.content}>
        <Artwork shape="circle" size={72} radius={36} />
        <View style={styles.nameRow}>
          <ThemedText variant="headline-sm">Support {artist.name}</ThemedText>
          {artist.verified && <Icon name="verified" size={16} color={Colors.secondary} />}
        </View>
        {artist.bio && (
          <ThemedText variant="body-sm" emphasis="medium" numberOfLines={2} style={styles.centerText}>
            {artist.bio}
          </ThemedText>
        )}

        <View style={styles.amountBlock}>
          <ThemedText variant="body-sm" emphasis="medium">
            Contribution Amount
          </ThemedText>
          <ThemedText variant="headline-lg">{amount} сом</ThemedText>
        </View>

        <View style={styles.accountRow}>
          <Icon name="account-balance" size={18} color={Colors.text.medium} />
          <ThemedText variant="body-sm" emphasis="medium">
            MBANK account •••• 4892 • Direct
          </ThemedText>
        </View>

        <PillButton
          label={`Confirm & Send ${amount} сом`}
          loading={stage === 'processing'}
          onPress={handleConfirm}
          style={styles.cta}
        />
        <TextLinkButton label="Cancel" onPress={() => router.back()} disabled={stage === 'processing'} />
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
  amountBlock: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: 2,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cta: {
    width: '100%',
    marginTop: Spacing.md,
  },
});
