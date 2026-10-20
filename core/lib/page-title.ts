import { getAlbumById, getArtistById, getGenreById, getPlaylistById, type Track } from '../mocks';

export const SITE_NAME = 'Mmusic';

/** "<page> – Mmusic", or just "Mmusic". */
function withSite(page?: string): string {
  return page ? `${page} – ${SITE_NAME}` : SITE_NAME;
}

/**
 * Browser tab / history / share title for a route (W1). Pure: the caller
 * passes the pathname (route groups removed), its params and the track the
 * player shows, so it renders the same on the server and in the browser.
 */
export function pageTitle(pathname: string, params: Record<string, string | string[] | undefined>, track?: Track): string {
  const id = typeof params.id === 'string' ? params.id : undefined;
  const parts = pathname.split('/').filter(Boolean);
  const [section, sub] = parts;

  switch (section) {
    case undefined:
    case 'home':
      return sub === 'see-all' ? withSite('New Releases') : withSite();
    case 'search':
      if (sub === 'all-genres') return withSite('Genres & Moods');
      if (sub === 'genre') return withSite(getGenreById(parts[2] ?? '')?.title ?? 'Genre');
      return withSite('Search');
    case 'library':
      return withSite(sub === 'liked-songs' ? 'Liked Songs' : 'Your Library');
    case 'artist':
      return withSite(getArtistById(id ?? sub ?? '')?.name ?? 'Artist');
    case 'album':
      return withSite(getAlbumById(id ?? sub ?? '')?.title ?? 'Album');
    case 'playlist':
      return withSite(getPlaylistById(id ?? sub ?? '')?.title ?? 'Playlist');
    case 'player':
      if (sub === 'queue') return withSite('Queue');
      if (!track) return withSite('Now Playing');
      return sub === 'lyrics' ? withSite(`Lyrics: ${track.title}`) : withSite(`${track.title} by ${track.artistName}`);
    case 'profile':
      if (sub === 'settings') return withSite('Settings');
      if (sub === 'support-history') return withSite('Support History');
      if (sub === 'artist') return withSite('Artist Studio');
      return withSite('Profile');
    case 'create-playlist':
      return withSite('Create Playlist');
    default:
      return withSite();
  }
}
