import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Icon, IconButton, MenuRow, PillButton, PlaylistPickerRow, TextField, Toast } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { getTrackById } from '@/mocks';
import { usePlaylistsStore } from '@/state/playlists-store';
import { usePlayerStore } from '@/state/player-store';

/**
 * S-18 Add to Playlist (bottom sheet, docs/screens.md §3.7). Local/mock
 * playlists only — no backend persistence. Reached from Now Playing's "⋯"
 * for the current track (no separate Track Options sheet exists yet in this
 * batch's scope, so this is wired as the direct entry point).
 */
export default function AddToPlaylistSheet() {
  const { trackId: trackIdParam } = useLocalSearchParams<{ trackId?: string }>();
  const playerCurrentTrackId = usePlayerStore((s) => s.currentTrackId());
  const trackId = trackIdParam ?? playerCurrentTrackId;
  const track = trackId ? getTrackById(trackId) : undefined;

  const playlists = usePlaylistsStore((s) => s.playlists);
  const addTrackToPlaylist = usePlaylistsStore((s) => s.addTrackToPlaylist);
  const removeTrackFromPlaylist = usePlaylistsStore((s) => s.removeTrackFromPlaylist);

  const [query, setQuery] = useState('');
  const [toastLabel, setToastLabel] = useState<string | null>(null);

  const filteredPlaylists = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return playlists;
    return playlists.filter((playlist) => playlist.title.toLowerCase().includes(normalized));
  }, [playlists, query]);

  function handleToggle(playlistId: string, playlistTitle: string, alreadyAdded: boolean) {
    if (!trackId) return;
    if (alreadyAdded) {
      removeTrackFromPlaylist(playlistId, trackId);
    } else {
      addTrackToPlaylist(playlistId, trackId);
      setToastLabel(`Added to ${playlistTitle}`);
      setTimeout(() => setToastLabel(null), 2000);
    }
  }

  return (
    <ThemedView surface="l2" style={styles.flex}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText variant="headline-sm">Add to Playlist</ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            Choose one or more destinations
          </ThemedText>
        </View>
        <IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />
      </View>

      {track && (
        <View style={styles.trackCard}>
          <Artwork uri={track.coverUri} size={44} radius={8} />
          <View style={styles.trackText}>
            <ThemedText variant="label-lg" numberOfLines={1}>
              {track.title}
            </ThemedText>
            <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
              {track.artistName}
            </ThemedText>
          </View>
        </View>
      )}

      <View style={styles.searchBlock}>
        <TextField
          placeholder="Find a playlist…"
          value={query}
          onChangeText={setQuery}
          leftAccessory={<Icon name="search" size={18} color={Colors.text.medium} />}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <MenuRow
          icon="playlist-add"
          title="New Playlist"
          subtitle="Create and auto-insert current track"
          onPress={() =>
            router.push({
              pathname: '/create-playlist',
              params: trackId ? { initialTrackId: trackId } : {},
            })
          }
        />

        {filteredPlaylists.map((playlist) => {
          const added = trackId ? (playlist.trackIds ?? []).includes(trackId) : false;
          const countLabel = `${playlist.trackCount} songs${playlist.updatedLabel ? ` • ${playlist.updatedLabel}` : ''}`;
          return (
            <PlaylistPickerRow
              key={playlist.id}
              coverUri={playlist.coverUri}
              title={playlist.title}
              trackCountLabel={countLabel}
              selected={added}
              onPress={() => handleToggle(playlist.id, playlist.title, added)}
            />
          );
        })}
      </ScrollView>

      <PillButton label="Done" onPress={() => router.back()} style={styles.doneButton} />

      <Toast message={toastLabel ? `✓ ${toastLabel}` : ''} icon="check" visible={Boolean(toastLabel)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.text.low,
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.margin,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 12,
    backgroundColor: Colors.surface.l3,
  },
  trackText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  searchBlock: {
    paddingHorizontal: Spacing.margin,
    marginTop: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  doneButton: {
    marginHorizontal: Spacing.margin,
    marginVertical: Spacing.md,
  },
});
