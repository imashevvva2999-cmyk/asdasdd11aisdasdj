#!/usr/bin/env node
/**
 * Frontend functional QA pass — tests for the shared Library state
 * (src/state/library-store.ts), the Playlists store's create/add flow, and the
 * local track sort helper (src/lib/sort-tracks.ts). Same approach as the other
 * verify-*.mjs scripts: exercise the real modules via `tsx` and assert on
 * their public API (no Jest/RNTL is configured).
 *
 * Usage: npx tsx scripts/verify-library-store.mjs
 */
import { getTrackById } from '../src/mocks/index.ts';
import { nextSortMode, sortTracks } from '../src/lib/sort-tracks.ts';
import { useLibraryStore } from '../src/state/library-store.ts';
import { usePlaylistsStore } from '../src/state/playlists-store.ts';

let failures = 0;

function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const lib = () => useLibraryStore.getState();

// Save / unsave (Album ♥, See All bookmark, Artist Follow all use this).
check('seeded album is saved', lib().isSaved('album', 'horizon-deluxe'));
check('unseeded album is not saved', !lib().isSaved('album', 'refraction-horizon'));
lib().toggleSaved('album', 'refraction-horizon');
check('toggleSaved() adds the album to Library items', lib().isSaved('album', 'refraction-horizon'));
check('newly saved item is listed first (Recently Added)', lib().items[0].refId === 'refraction-horizon');
lib().toggleSaved('album', 'refraction-horizon');
check('toggleSaved() again removes it', !lib().isSaved('album', 'refraction-horizon'));

// Same refId under a different kind is independent.
lib().toggleSaved('artist', 'horizon-deluxe');
check('save state is keyed by kind + id', lib().isSaved('artist', 'horizon-deluxe') && lib().isSaved('album', 'horizon-deluxe'));
lib().toggleSaved('artist', 'horizon-deluxe');

// Artist follow (Artist Profile ↔ Library "Artists" filter).
check('seeded artist is followed', lib().isSaved('artist', 'solaris-echo'));
lib().toggleSaved('artist', 'solaris-echo');
check('unfollowing removes the artist from Library', !lib().items.some((i) => i.kind === 'artist' && i.refId === 'solaris-echo'));
lib().toggleSaved('artist', 'solaris-echo');

// Downloads (Library "Downloaded" filter).
check('seeded downloaded album is downloaded', lib().isDownloaded('horizon-deluxe'));
lib().toggleDownloaded('late-night-driving', 'playlist');
check('toggleDownloaded() marks a saved playlist downloaded', lib().isDownloaded('late-night-driving'));
lib().toggleDownloaded('late-night-driving', 'playlist');
check('toggleDownloaded() again clears it', !lib().isDownloaded('late-night-driving'));
lib().toggleDownloaded('resonant-field', 'album');
check('downloading an unsaved album also saves it', lib().isDownloaded('resonant-field') && lib().isSaved('album', 'resonant-field'));
lib().toggleSaved('album', 'resonant-field');
check('removing an item from Library also clears its download', !lib().isDownloaded('resonant-field'));
lib().toggleDownloaded('liked-songs');
check('download without a kind (Liked Songs) does not add a Library item', lib().isDownloaded('liked-songs') && !lib().items.some((i) => i.refId === 'liked-songs'));

// Genre follow.
check('genre is not followed by default', !lib().isGenreFollowed('electronic'));
lib().toggleGenreFollowed('electronic');
check('toggleGenreFollowed() follows', lib().isGenreFollowed('electronic'));
lib().toggleGenreFollowed('electronic');
check('toggleGenreFollowed() again unfollows', !lib().isGenreFollowed('electronic'));

// Create Playlist → Playlist screen / Library / Add to Playlist consistency.
const created = usePlaylistsStore.getState().createPlaylist({ title: 'QA Mix' });
check('created playlist is resolvable by id (Playlist screen reads the store)', usePlaylistsStore.getState().getPlaylistById(created.id)?.title === 'QA Mix');
usePlaylistsStore.getState().addTrackToPlaylist(created.id, 'horizon');
check('added track appears in the playlist', usePlaylistsStore.getState().getPlaylistById(created.id)?.trackIds?.includes('horizon') === true);
lib().toggleSaved('playlist', created.id);
check('created playlist can be saved to Library', lib().isSaved('playlist', created.id));

// Sort helper (Playlist / Liked Songs "Sort").
const list = ['midnight-mirage', 'horizon', 'ember-tide'].map((id) => getTrackById(id)).filter(Boolean);
const byTitle = sortTracks(list, 'Title').map((t) => t.title);
check('sortTracks(Title) sorts alphabetically by title', byTitle.join('|') === [...byTitle].sort((a, b) => a.localeCompare(b)).join('|'));
check('sortTracks(Default order) keeps the original order', sortTracks(list, 'Default order') === list);
check('sortTracks() does not mutate its input', list.map((t) => t.id).join(',') === 'midnight-mirage,horizon,ember-tide');
check('nextSortMode() cycles Default → Title → Artist → Default', nextSortMode(nextSortMode(nextSortMode('Default order'))) === 'Default order' && nextSortMode('Default order') === 'Title');

if (failures > 0) {
  console.error(`\n${failures} library-store check(s) failed.`);
  process.exit(1);
}

console.log('\nAll library-store checks passed.');
