import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Artwork, IconButton, MenuRow, PillButton, SheetScreen, TextLinkButton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useHydratedSearchParams } from '@/hooks/use-hydrated-search-params';
import { useToast } from '@/hooks/use-toast';
import { sharingNotSupportedToast } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { shareEntity } from '@/lib/share';
import { forYouMenuActions } from '@/lib/for-you-menu';
import { forYouTiles, getAlbumById, getTrackById } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { useAppStrings } from '@/state/locale-store';
import { usePlayerStore } from '@/state/player-store';
import { usePlaylistsStore } from '@/state/playlists-store';

type OptionsKind = 'track' | 'album' | 'playlist' | 'mix';

/**
 * Track options sheet (docs/screens.md §3.7 "Track options sheet"; the
 * S-13 HTML's hidden overlay lists: Add to playlist, View artist, Go to
 * album, Share track, Cancel). Opened by every track-row ⋮ and the player's
 * ⋯. The same sheet also serves the album/playlist ⋯ menus (Album ⋯,
 * Library row ⋮, See All hero ⋯), offering only those screens' own
 * documented actions — Save, Download, View artist, Share — rather than
 * inventing new ones. Home's "For you" tiles (`kind=mix`) offer what the app
 * supports for a mix: Play, Shuffle and, for an artist's mix, View artist.
 */
export default function OptionsSheet() {
  const params = useHydratedSearchParams<{ kind: OptionsKind; id: string }>();
  // Static HTML / hydration: which item is not known yet — an empty sheet, not "Nothing to show." (#418).
  if (!params) return <SheetScreen>{null}</SheetScreen>;
  return <OptionsSheetContent kind={params.kind ?? 'track'} id={params.id ?? ''} />;
}

function OptionsSheetContent({ kind, id }: { kind: OptionsKind; id: string }) {
  const playlist = usePlaylistsStore((s) => (kind === 'playlist' ? s.getPlaylistById(id) : undefined));
  const isSaved = useLibraryStore((s) => (kind === 'album' || kind === 'playlist' ? s.isSaved(kind, id) : false));
  const isDownloaded = useLibraryStore((s) => s.isDownloaded(id));
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const toggleDownloaded = useLibraryStore((s) => s.toggleDownloaded);
  const { showToast, toast } = useToast();
  const { locale, t } = useAppStrings();

  const playMix = usePlayerStore((s) => s.play);
  const shuffleMix = usePlayerStore((s) => s.playShuffled);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const mix = kind === 'mix' ? forYouTiles.find((tile) => tile.id === id) : undefined;
  const track = kind === 'track' ? getTrackById(id) : undefined;
  const album = kind === 'album' ? getAlbumById(id) : track?.albumId ? getAlbumById(track.albumId) : undefined;

  const header =
    kind === 'track' && track
      ? { title: track.title, subtitle: track.artistName, coverUri: track.coverUri }
      : kind === 'album' && album
        ? { title: album.title, subtitle: album.artistName, coverUri: album.coverUri }
        : kind === 'playlist' && playlist
          ? { title: playlist.title, subtitle: playlist.curator ?? t('playlistLabel'), coverUri: playlist.coverUri }
          : kind === 'mix' && mix
            ? { title: mix.title, subtitle: `${mix.trackIds.length} ${t('tracksCountSuffix')}`, coverUri: mix.coverUri }
            : undefined;

  async function handleShare() {
    if (!header || kind === 'mix') return;
    const shared = await shareEntity(kind, id, header.title);
    if (shared) {
      goBack();
    } else {
      showToast(sharingNotSupportedToast(locale, `mmusic://${kind}/${id}`), 'share');
    }
  }

  function goTo(pathname: '/artist/[id]' | '/album/[id]', entityId: string) {
    goBack();
    router.push({ pathname, params: { id: entityId } });
  }

  function goToSupport(artistId: string) {
    goBack();
    router.push({ pathname: '/sheets/support', params: { artistId } });
  }

  if (!header) {
    return (
      <SheetScreen>
        <ThemedText variant="body-md" emphasis="medium" style={styles.notFound}>
          {t('nothingToShowLabel')}
        </ThemedText>
        <TextLinkButton label={t('closeLabel')} onPress={() => goBack()} style={styles.cancel} />
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
        <IconButton icon="close" size={36} accessibilityLabel={t('closeLabel')} onPress={() => goBack()} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {kind === 'track' && track && (
          <>
            <MenuRow
              variant="flat"
              icon={likedTrackIds.has(track.id) ? 'favorite' : 'favorite-border'}
              title={likedTrackIds.has(track.id) ? t('unlikeLabel') : t('likeLabel')}
              onPress={() => toggleLike(track.id)}
            />
            <MenuRow
              variant="flat"
              icon="playlist-add"
              title={t('addToPlaylistRowLabel')}
              onPress={() => router.replace({ pathname: '/sheets/add-to-playlist', params: { trackId: track.id } })}
            />
            <MenuRow variant="flat" icon="person" title={t('viewArtistLabel')} onPress={() => goTo('/artist/[id]', track.artistId)} />
            {album && <MenuRow variant="flat" icon="album" title={t('goToAlbumLabel')} onPress={() => goTo('/album/[id]', album.id)} />}
            <MenuRow variant="flat" icon="volunteer-activism" title={t('donate')} onPress={() => goToSupport(track.artistId)} />
            <MenuRow variant="flat" icon="share" title={t('shareTrackLabel')} onPress={handleShare} />
          </>
        )}

        {kind === 'mix' && mix && (
          <>
            {forYouMenuActions(mix).map((action) =>
              action === 'play' ? (
                <MenuRow
                  key={action}
                  variant="flat"
                  icon="play-arrow"
                  title={t('playLabel')}
                  onPress={() => {
                    playMix(mix.trackIds[0]!, mix.trackIds);
                    goBack();
                  }}
                />
              ) : action === 'shuffle' ? (
                <MenuRow
                  key={action}
                  variant="flat"
                  icon="shuffle"
                  title={t('shuffleLabel')}
                  onPress={() => {
                    shuffleMix(mix.trackIds);
                    goBack();
                  }}
                />
              ) : mix.artistId ? (
                <MenuRow key={action} variant="flat" icon="person" title={t('viewArtistLabel')} onPress={() => goTo('/artist/[id]', mix.artistId!)} />
              ) : null,
            )}
          </>
        )}

        {(kind === 'album' || kind === 'playlist') && (
          <>
            <MenuRow
              variant="flat"
              icon={isSaved ? 'library-add-check' : 'library-add'}
              title={isSaved ? t('removeFromLibraryLabel') : t('saveToLibraryLabel')}
              onPress={() => {
                toggleSaved(kind, id);
                showToast(isSaved ? t('removedFromLibrary') : t('savedToLibrary'), isSaved ? 'remove-circle-outline' : 'check');
              }}
            />
            <MenuRow
              variant="flat"
              icon={isDownloaded ? 'download-done' : 'download'}
              title={isDownloaded ? t('removeDownloadLabel') : t('download')}
              onPress={() => {
                toggleDownloaded(id, kind);
                showToast(isDownloaded ? t('toastDownloadRemoved') : t('toastMarkedForOffline'), 'download');
              }}
            />
            {kind === 'album' && album && <MenuRow variant="flat" icon="person" title={t('viewArtistLabel')} onPress={() => goTo('/artist/[id]', album.artistId)} />}
            <MenuRow variant="flat" icon="share" title={kind === 'album' ? t('shareAlbumLabel') : t('sharePlaylistLabel')} onPress={handleShare} />
          </>
        )}
      </ScrollView>

      <PillButton label={t('cancel')} variant="secondary" onPress={() => goBack()} style={styles.cancel} />
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
