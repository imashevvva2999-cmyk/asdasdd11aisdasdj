import { Share } from 'react-native';

export type ShareableKind = 'track' | 'album' | 'artist' | 'playlist';

/**
 * Opens the platform share sheet with the documented deep-link format
 * (docs/screens.md "Deep links: mmusic://track/{id} …"). What a recipient
 * without the app sees is still OQ-30 — this only shares the link text.
 * Returns false when sharing isn't available (e.g. a desktop browser without
 * the Web Share API) so the caller can show feedback instead of failing
 * silently.
 */
export async function shareEntity(kind: ShareableKind, id: string, title: string): Promise<boolean> {
  try {
    await Share.share({ message: `${title} on Mmusic — mmusic://${kind}/${id}` });
    return true;
  } catch (error) {
    // The user dismissing the Web Share sheet rejects with AbortError — that
    // isn't "sharing unavailable", so don't report it as a failure.
    return error instanceof Error && error.name === 'AbortError';
  }
}
