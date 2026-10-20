export function serializeLikedTrackIds(ids: Set<string>): string[] {
  return Array.from(ids);
}

/** Never throws — missing, null, or malformed stored data degrades to an empty Set. */
export function deserializeLikedTrackIds(raw: unknown): Set<string> {
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((id): id is string => typeof id === 'string'));
}
