import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Artwork, IconButton, MenuRow, PillButton, SheetScreen, TextLinkButton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { goBack } from '@/lib/navigation';
import { shareEntity } from '@/lib/share';
import { getAlbumById, getTrackById } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { usePlaylistsStore } from '@/state/playlists-store';

type OptionsKind = 'track' | 'album' | 'playlist';

/**
 * Track options sheet (docs/screens.md §3.7 "Track options sheet"; the
 * S-13 HTML's hidden overlay lists: Add to playlist, View artist, Go to
 * album, Share track, Cancel). Opened by every track-row ⋮ and the player's
 * ⋯. The same sheet also serves the album/playlist ⋯ menus (Album ⋯,
 * Library row ⋮, See All hero ⋯), offering only those screens' own
 * documented actions — Save, Download, View artist, Share — rather than
 * inventing new ones.
 */
export default function OptionsSheet() {
  const { kind = 'track', id = '' } = useLocalSearchParams<{ kind?: OptionsKind; id?: string }>();
  const playlist = usePlaylistsStore((s) => (kind === 'playlist' ? s.getPlaylistById(id) : undefined));
  const isSaved = useLibraryStore((s) => (kind === 'album' || kind === 'playlist' ? s.isSaved(kind, id) : false));
  const isDownloaded = useLibraryStore((s) => s.isDownloaded(id));
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const toggleDownloaded = useLibraryStore((s) => s.toggleDownloaded);
  const { showToast, toast } = useToast();

  const track = kind === 'track' ? getTrackById(id) : undefined;
  const album = kind === 'album' ? getAlbumById(id) : track?.albumId ? getAlbumById(track.albumId) : undefined;

  const header =
    kind === 'track' && track
      ? { title: track.title, subtitle: track.artistName, coverUri: track.coverUri }
      : kind === 'album' && album
        ? { title: album.title, subtitle: album.artistName, coverUri: album.coverUri }
        : kind === 'playlist' && playlist
          ? { title: playlist.title, subtitle: playlist.curator ?? 'Playlist', coverUri: playlist.coverUri }
          : undefined;

  async function handleShare() {
    if (!header) return;
    const shared = await shareEntity(kind, id, header.title);
    if (shared) {
      goBack();
    } else {
      showToast(`Sharing isn't supported here — link: mmusic://${kind}/${id}`, 'share');
    }
  }

  function goTo(pathname: '/artist/[id]' | '/album/[id]', entityId: string) {
    goBack();
    router.push({ pathname, params: { id: entityId } });
  }

  if (!header) {
    return (
      <SheetScreen>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          Nothing to show.
        </ThemedText>
        <TextLinkButton label="Close" onPress={() => goBack()} style={styles.cancel} />
      </SheetScreen>
    );
  }

  return (
    <SheetScreen>
      <View style={styles.header}>
        <Artwork uri={header.coverUri} size={48} radius={8} />
        <View style={styles.headerText}>
          <ThemedText variant="label-lg" numberOfLines={1}>
            {header.title}
          </ThemedText>
          <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
            {header.subtitle}
          </ThemedText>
        </View>
        <IconButton icon="close" size={36} accessibilityLabel="Close" onPress={() => goBack()} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {kind === 'track' && track && (
          <>
            <MenuRow
              variant="flat"
              icon="playlist-add"
              title="Add to playlist"
              onPress={() => router.replace({ pathname: '/sheets/add-to-playlist', params: { trackId: track.id } })}
            />
            <MenuRow variant="flat" icon="person" title="View artist" onPress={() => goTo('/artist/[id]', track.artistId)} />
            {album && <MenuRow variant="flat" icon="album" title="Go to album" onPress={() => goTo('/album/[id]', album.id)} />}
            <MenuRow variant="flat" icon="share" title="Share track" onPress={handleShare} />
          </>
        )}

        {(kind === 'album' || kind === 'playlist') && (
          <>
            <MenuRow
              variant="flat"
              icon={isSaved ? 'library-add-check' : 'library-add'}
              title={isSaved ? 'Remove from Library' : 'Save to Library'}
              onPress={() => {
                toggleSaved(kind, id);
                showToast(isSaved ? 'Removed from Library' : 'Saved to Library', isSaved ? 'remove-circle-outline' : 'check');
              }}
            />
            <MenuRow
              variant="flat"
              icon={isDownloaded ? 'download-done' : 'download'}
              title={isDownloaded ? 'Remove download' : 'Download'}
              onPress={() => {
                toggleDownloaded(id, kind);
                showToast(isDownloaded ? 'Download removed' : 'Marked for offline (demo — no audio is stored yet)', 'download');
              }}
            />
            {kind === 'album' && album && <MenuRow variant="flat" icon="person" title="View artist" onPress={() => goTo('/artist/[id]', album.artistId)} />}
            <MenuRow variant="flat" icon="share" title={kind === 'album' ? 'Share album' : 'Share playlist'} onPress={handleShare} />
          </>
        )}
      </ScrollView>

      <PillButton label="Cancel" variant="secondary" onPress={() => goBack()} style={styles.cancel} />
      {toast}
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  list: {
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  notFound: {
    padding: Spacing.margin,
  },
  cancel: {
    marginHorizontal: Spacing.margin,
    marginTop: Spacing.sm,
  },
});
