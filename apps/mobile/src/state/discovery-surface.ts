import { makeMutable } from 'react-native-reanimated';

/** Horizontal genre-axis position, mirroring player-surface.ts's carouselPos
 * but entirely separate — genres are not part of the global player queue. */
export const genrePos = makeMutable(0);
export const genreTarget = makeMutable(0);

/** Clamp semantics only (no wrap, no repeat-all — genres aren't a play queue). */
export function canStepGenre(base: number, dir: 1 | -1, count: number): boolean {
  'worklet';
  const index = Math.round(base);
  return dir > 0 ? index < count - 1 : index > 0;
}
