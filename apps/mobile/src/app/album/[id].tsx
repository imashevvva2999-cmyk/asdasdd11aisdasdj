import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MINI_PLAYER_OVERLAY_CLEARANCE, MiniPlayerOverlay } from '@/components/mini-player';
import { RootNavBar } from '@/components/nav/root-nav-bar';
import { ThemedView } from '@/components/themed-view';
import { Artwork, CircleButton, IconButton, TrackRow } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { albums, getAlbumById, getTrackById } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { useAppStrings } from '@/state/locale-store';
import { usePlayerStore } from '@/state/player-store';

/** Pre-renders every catalog album for the static website, so a direct link or
 * refresh serves that album's own HTML (React #418: the shared `[id]` shell said
 * "not found" before the browser rendered the album). */
export function generateStaticParams() {
  return albums.map((album) => ({ id: album.id }));
}

/** S-09 Album (docs/screens.md §3.4). */
export default function AlbumScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const album = getAlbumById(id);
  const play = usePlayerStore((s) => s.play);
  const playShuffled = usePlayerStore((s) => s.playShuffled);
  const isSaved = useLibraryStore((s) => s.isSaved('album', id));
  const isDownloaded = useLibraryStore((s) => s.isDownloaded(id));
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const toggleDownloaded = useLibraryStore((s) => s.toggleDownloaded);
  const { showToast, toast } = useToast();
  const { t } = useAppStrings();
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  if (!album) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          {t('albumNotFoundMessage')}
        </ThemedText>
      </ThemedView>
    );
  }

  const trackList = (album.trackIds ?? []).map((trackId) => getTrackById(trackId)).filter(Boolean);
  const typeLabel = album.type === 'ep' ? t('albumTypeEp') : album.type === 'single' ? t('albumTypeSingle') : t('albumTypeAlbum');

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Artwork uri={album.coverUri} size={256} radius={Radii.md} />
          <ThemedText variant="headline-lg" style={styles.title} numberOfLines={2}>
            {album.title}
          </ThemedText>
          <ThemedText
            variant="body-lg"
            emphasis="primary"
            onPress={() => router.push({ pathname: '/artist/[id]', params: { id: album.artistId } })}
          >
            {album.artistName}
          </ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            {album.year} • {typeLabel} • {trackList.length || album.trackCount} {(trackList.length || album.trackCount) === 1 ? t('trackCountSingular') : t('trackCountPlural')}
          </ThemedText>

          <View style={styles.actionsRow}>
            <IconButton
              icon={isSaved ? 'favorite' : 'favorite-border'}
              color={isSaved ? Colors.primary : undefined}
              accessibilityLabel={isSaved ? t('removeAlbumFromLibrary') : t('saveAlbum')}
              onPress={() => {
                toggleSaved('album', album.id);
                showToast(isSaved ? t('removedFromLibrary') : t('savedToLibrary'), 'check');
              }}
            />
            <IconButton
              icon={isDownloaded ? 'download-done' : 'download'}
              color={isDownloaded ? Colors.secondary : undefined}
              accessibilityLabel={isDownloaded ? t('removeDownloadLabel') : t('download')}
              onPress={() => {
                toggleDownloaded(album.id, 'album');
                showToast(isDownloaded ? t('toastDownloadRemoved') : t('toastMarkedForOffline'), 'download');
              }}
            />
            <IconButton
              icon="more-horiz"
              accessibilityLabel={t('moreOptionsLabel')}
              onPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'album', id: album.id } })}
            />
            <View style={styles.spacer} />
            <IconButton
              icon="shuffle"
              accessibilityLabel={t('shuffleLabel')}
              disabled={trackList.length === 0}
              onPress={() => playShuffled(trackList.map((t) => t!.id))}
            />
            <CircleButton
              icon="play-arrow"
              accessibilityLabel={t('playAlbumLabel')}
              size={56}
              iconSize={26}
              disabled={trackList.length === 0}
              onPress={() => trackList.length > 0 && play(trackList[0]!.id, trackList.map((t) => t!.id))}
            />
          </View>
        </View>

        <View style={styles.trackList}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.overline}>
            {t('tracksHeaderLabel')}
          </ThemedText>
          {trackList.length === 0 ? (
            <ThemedText variant="body-sm" emphasis="medium" style={styles.emptyTracks}>
              {t('noTracksAvailableMessage')}
            </ThemedText>
          ) : (
            trackList.map((track, index) => (
              <TrackRow
                key={track!.id}
                index={index + 1}
                active={currentTrackId === track!.id}
                title={track!.title}
                artist={track!.artistName}
                explicit={track!.explicit}
                lossless={track!.lossless}
                isPlaying={currentTrackId === track!.id && isPlaying}
                onPress={() => play(track!.id, trackList.map((t) => t!.id))}
                onOptionsPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: track!.id } })}
              />
            ))
          )}
        </View>

        <View style={styles.footerBlock}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.overline}>
            {t('releasedPrefix')} {album.year}
          </ThemedText>
          <ThemedText variant="body-sm" emphasis="low" style={styles.footer}>
            ℗ {album.year} {album.artistName}
          </ThemedText>
        </View>
      </ScrollView>
      {toast}
      <RootNavBar />
      <MiniPlayerOverlay />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notFound: {
    padding: Spacing.margin,
  },
  content: {
    padding: Spacing.margin,
    paddingBottom: MINI_PLAYER_OVERLAY_CLEARANCE,
    gap: Spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: 4,
  },
  overline: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  footerBlock: {
    alignItems: 'center',
    gap: 2,
  },
  title: {
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    width: '100%',
  },
  spacer: {
    flex: 1,
  },
  trackList: {
    gap: 2,
  },
  footer: {
    textAlign: 'center',
    color: Colors.text.low,
  },
  emptyTracks: {
    color: Colors.text.low,
  },
});
