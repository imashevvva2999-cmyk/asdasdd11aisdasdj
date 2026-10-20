/** Normalises a typed query for matching: trimmed and lower-cased. */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * The one text-matching rule shared by Search results and Library search:
 * case-insensitive substring match against any of the given fields. An empty
 * query matches everything; missing fields are skipped.
 */
export function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  const q = normalizeQuery(query);
  if (q === '') return true;
  return fields.some((field) => field !== undefined && field.toLowerCase().includes(q));
}
