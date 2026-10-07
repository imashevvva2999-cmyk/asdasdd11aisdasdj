import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Icon, IconButton, MenuRow, StatCard, Toast } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { currentUser, getArtistById } from '@/mocks';
import { useArtistStore } from '@/state/artist-store';
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
  const [loggedOutToastVisible, setLoggedOutToastVisible] = useState(false);

  const totalSupported = history.reduce((sum, entry) => sum + entry.amount, 0);
  const topArtist = currentUser.topArtistId ? getArtistById(currentUser.topArtistId) : undefined;

  function handleLogOut() {
    setLoggedOutToastVisible(true);
    setTimeout(() => setLoggedOutToastVisible(false), 2000);
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <Artwork shape="circle" size={96} radius={48} uri={currentUser.photoUri} />
            <IconButton icon="edit" accessibilityLabel="Edit profile photo" size={32} style={styles.editAvatarButton} onPress={() => {}} />
          </View>
          <View style={styles.nameRow}>
            <ThemedText variant="headline-lg">{currentUser.name}</ThemedText>
            {currentUser.verified && <Icon name="verified" size={20} color={Colors.secondary} />}
          </View>
          <ThemedText variant="body-sm" emphasis="medium">
            @{currentUser.username} • Member since {currentUser.memberSinceYear}
          </ThemedText>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Saved" value={String(currentUser.savedCount)} icon="favorite" />
          <StatCard label="Playlists" value={String(currentUser.playlistsCount)} icon="queue-music" />
          <StatCard label="Supported" value={`${totalSupported} сом`} icon="volunteer-activism" />
        </View>

        {(topArtist || currentUser.topGenre || currentUser.monthlyListeningHours) && (
          <View style={styles.section}>
            <ThemedText variant="headline-sm">Listening Pulse — This Month</ThemedText>
            <View style={styles.pulseRow}>
              {topArtist && <StatCard label="Top Artist" value={topArtist.name} icon="person" />}
              {currentUser.monthlyListeningHours !== undefined && (
                <StatCard label="Listened" value={`${currentUser.monthlyListeningHours} hrs`} icon="schedule" />
              )}
              {currentUser.topGenre && <StatCard label="Top Genre" value={currentUser.topGenre} icon="category" />}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <ThemedText variant="headline-sm">Studio Sanctuary</ThemedText>
          <View style={styles.menuList}>
            <MenuRow
              icon="volunteer-activism"
              title="Support History"
              subtitle={`${history.length} contributions`}
              onPress={() => router.push('/profile/support-history')}
            />
            <MenuRow
              icon="graphic-eq"
              title="Audio Quality & Playback"
              subtitle="Lossless, Dolby Atmos, Crossfade"
              onPress={() => router.push('/profile/settings')}
            />
            <MenuRow
              icon="download-done"
              title="Downloads & Offline"
              subtitle="14.2 GB • 348 songs"
              onPress={() => router.push('/profile/settings')}
            />
            <MenuRow
              icon="verified-user"
              title="Account & Security"
              subtitle="MBANK Connected ID"
              onPress={() => router.push('/profile/settings')}
            />
            <MenuRow
              icon="mic"
              title={myArtist ? 'Artist Dashboard' : 'Become an Artist'}
              subtitle={myArtist ? `Manage ${myArtist.name}'s releases` : 'Publish and monetize your tracks on Mmusic'}
              onPress={() => router.push(myArtist ? '/profile/artist/dashboard' : '/profile/artist/become-artist')}
            />
          </View>
        </View>

        <MenuRow icon="logout" title="Log Out" onPress={handleLogOut} />
      </ScrollView>

      <Toast message="Logged out" icon="logout" visible={loggedOutToastVisible} />
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
  },
  avatarWrap: {
    position: 'relative',
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
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.sm,
  },
  pulseRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  menuList: {
    gap: Spacing.xs,
  },
});
