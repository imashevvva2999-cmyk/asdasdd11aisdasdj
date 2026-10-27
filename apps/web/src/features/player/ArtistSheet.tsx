import '@/platform/storage';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { getAlbumById, getArtistById, type Track } from '@mmusic/core/mocks';
import { useLibraryStore } from '@mmusic/core/state/library-store';
import { Icon } from '@mmusic/ui-kit/web';
import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';

/**
 * The player's artist sheet (the Expo app's sheets/now-playing-artist.tsx; Apple
 * Music's "artist and album" sheet): a frosted panel with exactly two rows —
 * the artist (avatar, name, Follow) and the track's album (cover, title,
 * year · type, Add). A row opens the artist profile or album; Follow and Add
 * are the library's own save actions. Catalog data only: the album row is shown
 * only when the track belongs to an album. A native modal <dialog>: focus is
 * trapped, Escape and a backdrop click close it (without also closing the player).
 */
export function ArtistSheet({ track, onClose }: { track: Track; onClose: () => void }) {
  const { t } = useAppStrings();
  const ref = useRef<HTMLDialogElement>(null);
  const artist = getArtistById(track.artistId);
  const album = track.albumId ? getAlbumById(track.albumId) : undefined;
  const following = useLibraryStore((s) => (artist ? s.isSaved('artist', artist.id) : false));
  const albumAdded = useLibraryStore((s) => (album ? s.isSaved('album', album.id) : false));
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const albumType = album?.type === 'ep' ? t('albumTypeEp') : album?.type === 'single' ? t('albumTypeSingle') : t('albumTypeAlbum');

  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // A click on the backdrop (outside the panel) lands on the <dialog> itself.
    const onBackdrop = (e: MouseEvent) => {
      if (e.target === dialog) closeRef.current();
    };
    dialog.addEventListener('click', onBackdrop);
    return () => {
      dialog.removeEventListener('click', onBackdrop);
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="np-artist-sheet glass"
      aria-label={t('artistAndAlbumLabel')}
      onCancel={(e) => {
        // Escape closes this sheet only (the player's own Escape is off while it is open).
        e.preventDefault();
        onClose();
      }}
    >
      <span className="np-artist-sheet-handle" aria-hidden="true" />
      <div className="np-artist-sheet-rows">
        <div className="np-artist-sheet-row">
          {artist ? (
            <Link to={`/artist/${artist.id}`} className="np-artist-sheet-main" onClick={onClose}>
              <Artwork source={artist.photoUri} className="np-artist-sheet-art round" />
              <span className="np-artist-sheet-text">
                <span className="t-label-lg ellipsis">{artist.name}</span>
                <span className="t-body-sm medium ellipsis">{t('artistLabel')}</span>
              </span>
            </Link>
          ) : (
            <span className="np-artist-sheet-main">
              <Artwork source={undefined} className="np-artist-sheet-art round" />
              <span className="np-artist-sheet-text">
                <span className="t-label-lg ellipsis">{track.artistName}</span>
                <span className="t-body-sm medium ellipsis">{t('artistLabel')}</span>
              </span>
            </span>
          )}
          {artist && (
            <button type="button" className="ui-btn ghost np-artist-sheet-btn" aria-pressed={following} onClick={() => toggleSaved('artist', artist.id)}>
              <Icon name={following ? 'check' : 'add'} size={18} />
              {following ? t('followingLabel') : t('followLabel')}
            </button>
          )}
        </div>
        {album && (
          <div className="np-artist-sheet-row">
            <Link to={`/album/${album.id}`} className="np-artist-sheet-main" onClick={onClose}>
              <Artwork source={album.coverUri} className="np-artist-sheet-art" />
              <span className="np-artist-sheet-text">
                <span className="t-label-lg ellipsis">{album.title}</span>
                <span className="t-body-sm medium ellipsis">
                  {album.year} · {albumType}
                </span>
              </span>
            </Link>
            <button type="button" className="ui-btn ghost np-artist-sheet-btn" aria-pressed={albumAdded} onClick={() => toggleSaved('album', album.id)}>
              <Icon name={albumAdded ? 'check' : 'add'} size={18} />
              {albumAdded ? t('addedLabel') : t('addLabel')}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
