import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Artwork, Icon, PillButton, SheetScreen, TextLinkButton } from '@/components/ui';
import { DemoNotice } from '@/components/demo-notice';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { confirmAndSendLabel, supportTitleLabel } from '@/lib/i18n';
import { formatKgsAmount } from '@/lib/format-currency';
import { goBack } from '@/lib/navigation';
import { getArtistById } from '@/mocks';
import { useAppStrings } from '@/state/locale-store';
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
  const { t, locale } = useAppStrings();

  const artist = artistId ? getArtistById(artistId) : undefined;

  if (!artist || !amount) {
    return (
      <SheetScreen>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          {t('nothingToConfirmMessage')}
        </ThemedText>
        <TextLinkButton label={t('backLabel')} onPress={() => goBack()} style={styles.notFoundLink} />
      </SheetScreen>
    );
  }

  async function handleConfirm() {
    await confirm();
    router.replace('/sheets/support-success');
  }

  return (
    <SheetScreen>
      <View style={styles.content}>
        <View style={styles.avatarHalo}>
          <Artwork shape="circle" size={88} radius={44} uri={artist.photoUri} placeholderIcon="person" />
        </View>
        <View style={styles.nameRow}>
          <ThemedText variant="headline-md">{supportTitleLabel(locale, artist.name)}</ThemedText>
          {artist.verified && <Icon name="verified" size={18} color={Colors.primary} />}
        </View>
        {artist.genres && artist.genres.length > 0 && (
          <ThemedText variant="body-md" emphasis="medium" numberOfLines={1} style={styles.centerText}>
            {artist.genres.join(' · ')}
          </ThemedText>
        )}

        <View style={styles.amountCard}>
          <ThemedText variant="label-sm" style={styles.amountEyebrow}>
            {t('contributionAmountLabel')}
          </ThemedText>
          <View style={styles.amountRow}>
            <ThemedText variant="display-lg">{formatKgsAmount(amount)}</ThemedText>
            <ThemedText variant="headline-sm" emphasis="medium">
              сом
            </ThemedText>
          </View>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <Icon name="account-balance-wallet" size={22} color={Colors.secondary} />
          </View>
          <ThemedText variant="label-lg" style={styles.accountTitle} numberOfLines={1}>
            {t('mbankAccountMasked')}
          </ThemedText>
          <View style={styles.directBadge}>
            <ThemedText variant="label-md" style={styles.directBadgeText}>
              {t('directWordLabel')}
            </ThemedText>
          </View>
        </View>

        <DemoNotice text={t('demoNoMoneySentLabel')} style={styles.demoNotice} />

        <PillButton
          label={confirmAndSendLabel(locale, formatKgsAmount(amount))}
          trailingIcon="bolt"
          loading={stage === 'processing'}
          onPress={handleConfirm}
          style={styles.cta}
        />
        <TextLinkButton label={t('cancel')} tone="muted" onPress={() => goBack()} disabled={stage === 'processing'} style={styles.cancel} />
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
  avatarHalo: {
    padding: 6,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 75, 75, 0.18)',
  },
  amountCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: Colors.surface.l2,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    gap: 2,
  },
  amountEyebrow: {
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  accountCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface.l2,
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surface.l3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTitle: {
    flex: 1,
  },
  directBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(245, 166, 35, 0.18)',
  },
  directBadgeText: {
    color: Colors.secondary,
  },
  cta: {
    width: '100%',
    height: 56,
    marginTop: Spacing.md,
  },
  cancel: {
    marginTop: Spacing.sm,
  },
});
