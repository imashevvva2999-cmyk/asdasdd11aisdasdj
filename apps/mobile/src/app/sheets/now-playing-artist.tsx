import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Artwork, PillButton, SheetScreen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useHydratedSearchParams } from '@/hooks/use-hydrated-search-params';
import { useToast } from '@/hooks/use-toast';
import { goBack } from '@/lib/navigation';
import { getAlbumById, getArtistById, getTrackById } from '@/mocks';
import { useLibraryStore } from '@/state/library-store';
import { useAppStrings } from '@/state/locale-store';

/**
 * Artist sheet of the player (Apple Music's "artist and album" sheet): tapping
 * the artist name in the player opens this compact frosted sheet with exactly
 * two rows — the artist (avatar, name, Follow) and the current track's album
 * (cover, title, year · type, Add). A row opens the full artist profile or
 * album; Follow and Add are the library's own save actions. Catalog data only:
 * the album row is shown only when the track belongs to an album.
 */
export default function NowPlayingArtistSheet() {
  const params = useHydratedSearchParams<{ trackId: string }>();
  // Static HTML / hydration: which track is not known yet.
  if (!params) return <SheetScreen variant="glass">{null}</SheetScreen>;
  return <ArtistSheetContent trackId={params.trackId ?? ''} />;
}

function ArtistSheetContent({ trackId }: { trackId: string }) {
  const { t } = useAppStrings();
  const { showToast, toast } = useToast();
  const track = getTrackById(trackId);
  const artist = track ? getArtistById(track.artistId) : undefined;
  const album = track?.albumId ? getAlbumById(track.albumId) : undefined;
  const following = useLibraryStore((s) => (artist ? s.isSaved('artist', artist.id) : false));
  const albumAdded = useLibraryStore((s) => (album ? s.isSaved('album', album.id) : false));
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);

  // Close the sheet, then open the page from the player underneath (like the options sheet).
  const open = (href: Href) => {
    goBack();
    router.push(href);
  };
  const albumType = album?.type === 'ep' ? t('albumTypeEp') : album?.type === 'single' ? t('albumTypeSingle') : t('albumTypeAlbum');

  return (
    <SheetScreen variant="glass">
      <View style={styles.rows} accessibilityLabel={t('artistAndAlbumLabel')}>
        {artist ? (
          <Row
            artwork={<Artwork uri={artist.photoUri} size={52} shape="circle" placeholderIcon="person" />}
            title={artist.name}
            subtitle={t('artistLabel')}
            onPress={() => open({ pathname: '/artist/[id]', params: { id: artist.id } })}
            action={
              <PillButton
                variant="secondary"
                label={following ? t('followingLabel') : t('followLabel')}
                leadingIcon={following ? 'check' : 'add'}
                onPress={() => toggleSaved('artist', artist.id)}
              />
            }
          />
        ) : (
          track && <Row artwork={<Artwork size={52} shape="circle" placeholderIcon="person" />} title={track.artistName} subtitle={t('artistLabel')} />
        )}
        {album && (
          <>
            <View style={styles.separator} />
            <Row
              artwork={<Artwork uri={album.coverUri} size={52} radius={8} />}
              title={album.title}
              subtitle={`${album.year} · ${albumType}`}
              onPress={() => open({ pathname: '/album/[id]', params: { id: album.id } })}
              action={
                <PillButton
                  variant="secondary"
                  label={albumAdded ? t('addedLabel') : t('addLabel')}
                  leadingIcon={albumAdded ? 'check' : 'add'}
                  onPress={() => {
                    toggleSaved('album', album.id);
                    showToast(albumAdded ? t('removedFromLibrary') : t('savedToLibrary'));
                  }}
                />
              }
            />
          </>
        )}
      </View>
      {toast}
    </SheetScreen>
  );
}

function Row({ artwork, title, subtitle, onPress, action }: { artwork: ReactNode; title: string; subtitle: string; onPress?: () => void; action?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole={onPress ? 'link' : undefined}
        accessibilityLabel={`${title}, ${subtitle}`}
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
      >
        {artwork}
        <View style={styles.text}>
          <ThemedText variant="label-lg" numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        </View>
      </Pressable>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { paddingHorizontal: Spacing.margin, paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 72 },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 12 },
  pressed: { opacity: 0.6 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255, 255, 255, 0.12)', marginLeft: 52 + Spacing.md },
});
