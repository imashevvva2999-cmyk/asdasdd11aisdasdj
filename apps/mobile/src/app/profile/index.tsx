import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Icon, IconButton, MenuRow, PressableScale, StatCard } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { formatKgsAmount } from '@/lib/format-currency';
import { currentUser } from '@/mocks';
import { manageReleasesLabel } from '@/lib/i18n';
import { useArtistStore } from '@/state/artist-store';
import { useAppStrings } from '@/state/locale-store';
import { useSupportStore } from '@/state/support-store';

/**
 * S-23 Profile Hub (docs/screens.md §3.11). Mock/local auth state only — no
 * real account. "Become an Artist" conditionally becomes "Artist Dashboard"
 * once the local user has completed Artist Setup (docs/screens.md §S-23
 * [Доп] note) — this is frontend/session state only (useArtistStore.artist),
 * not a real role/account change. The global entry point into this screen
 * remains open (OQ-17) — this screen itself is unaffected by that and is
 * fully implemented regardless.
 */
export default function ProfileScreen() {
  const history = useSupportStore((s) => s.history);
  const myArtist = useArtistStore((s) => s.artist);
  const { showToast, toast } = useToast();
  const { t, locale } = useAppStrings();

  const totalSupported = history.reduce((sum, entry) => sum + entry.amount, 0);
  const distinctArtistCount = new Set(history.map((entry) => entry.artistId)).size;

  /** No real account/session exists in the frontend-only build (MBANK auth is
   * a backend concern), so Log Out says so honestly instead of pretending. */
  function handleLogOut() {
    showToast(t('toastSignOut'), 'logout');
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.heroGlow, styles.heroGlowPrimary]} pointerEvents="none" />
          <View style={[styles.heroGlow, styles.heroGlowSecondary]} pointerEvents="none" />
          <View style={styles.avatarWrap}>
            <View style={styles.avatarGlow} />
            <Artwork
              shape="circle"
              size={96}
              radius={48}
              uri={currentUser.photoUri}
              placeholderIcon="person"
              onPress={() => showToast(t('toastChangePhoto'), 'edit')}
              accessibilityLabel={t('changeProfilePhotoLabel')}
            />
            <IconButton
              icon="edit"
              accessibilityLabel={t('editProfilePhotoLabel')}
              size={32}
              style={styles.editAvatarButton}
              onPress={() => showToast(t('toastChangePhoto'), 'edit')}
            />
          </View>
          <View style={styles.nameRow}>
            <ThemedText variant="headline-lg">{currentUser.name}</ThemedText>
            {currentUser.verified && <Icon name="verified" size={20} color={Colors.secondary} />}
          </View>
          <ThemedText variant="body-sm" emphasis="medium">
            @{currentUser.username} • {t('memberSince')} {currentUser.memberSinceYear}
          </ThemedText>
          <View style={styles.vipBadge}>
            <Icon name="graphic-eq" size={14} color={Colors.secondary} />
            <ThemedText variant="label-sm" style={styles.vipBadgeText}>
              MBANK VIP SOUND
            </ThemedText>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard variant="metric" label={t('statSaved')} value={String(currentUser.savedCount)} />
          <StatCard variant="metric" label={t('statPlaylists')} value={String(currentUser.playlistsCount)} />
          <StatCard variant="metric" label={t('statSupported')} value={formatKgsAmount(totalSupported)} unit="сом" style={styles.supportedStat} />
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('studioSanctuary')}</ThemedText>
          <View style={styles.menuList}>
            <MenuRow
              icon="settings"
              title={t('menuSettings')}
              subtitle={t('menuSettingsSubtitle')}
              onPress={() => router.push('/profile/settings')}
            />
            <MenuRow
              icon="volunteer-activism"
              title={t('menuSupportHistory')}
              subtitle={`${formatKgsAmount(totalSupported)} сом ${t('supportedSuffix')} • ${distinctArtistCount} ${t('artistsSuffix')}`}
              onPress={() => router.push('/profile/support-history')}
            />
            <MenuRow
              icon="mic"
              tone="secondary"
              title={myArtist ? t('menuArtistDashboard') : t('menuBecomeArtist')}
              subtitle={myArtist ? manageReleasesLabel(locale, myArtist.name) : t('becomeArtistSubtitle')}
              onPress={() => router.push(myArtist ? '/profile/artist/dashboard' : '/profile/artist/become-artist')}
            />
          </View>
        </View>

        <PressableScale accessibilityRole="button" onPress={handleLogOut} style={styles.logOut}>
          <Icon name="logout" size={20} color={Colors.primary} />
          <ThemedText variant="label-lg" emphasis="primary">
            {t('logOut')}
          </ThemedText>
        </PressableScale>
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
  hero: {
    alignItems: 'center',
    gap: 4,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l1,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: Radii.full,
    opacity: 0.05,
  },
  heroGlowPrimary: {
    top: -90,
    left: -80,
    backgroundColor: Colors.primary,
  },
  heroGlowSecondary: {
    bottom: -110,
    right: -90,
    backgroundColor: Colors.secondary,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    opacity: 0.18,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface.l3,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginTop: Spacing.sm,
  },
  vipBadgeText: {
    color: Colors.secondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.sm,
  },
  supportedStat: {
    backgroundColor: 'rgba(255, 75, 75, 0.06)',
  },
  menuList: {
    gap: Spacing.sm,
  },
  logOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l1,
    marginTop: Spacing.sm,
  },
});
