export interface SearchIndexEntry {
  id: string;
  kind: "vocabulary" | "grammar" | "kana";
  primary: string;
  reading: string;
  romaji: string;
  meaning: string;
  href: string;
}

export function normalizeSearch(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ja");
}

function score(entry: SearchIndexEntry, query: string): number | null {
  const fields = [entry.primary, entry.reading, entry.romaji, entry.meaning].map(normalizeSearch);

  if (fields[0] === query) return 0;
  if (fields[1] === query || fields[2] === query) return 1;
  if (fields.some((field) => field.startsWith(query))) return 2;
  if (fields.some((field) => field.includes(query))) return 3;

  return null;
}

function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left);
  const rightPoints = Array.from(right);
  const sharedLength = Math.min(leftPoints.length, rightPoints.length);

  for (let index = 0; index < sharedLength; index += 1) {
    const order =
      (leftPoints[index]?.codePointAt(0) ?? 0) - (rightPoints[index]?.codePointAt(0) ?? 0);
    if (order) return order;
  }

  return leftPoints.length - rightPoints.length;
}

function normalizeResultLimit(limit: number): number {
  // NaN uses the default; infinities clamp to a bound; finite fractions truncate before clamping.
  if (Number.isNaN(limit)) return 8;
  if (limit === Number.POSITIVE_INFINITY) return 8;
  if (limit === Number.NEGATIVE_INFINITY) return 1;
  return Math.min(8, Math.max(1, Math.trunc(limit)));
}

export function rankSearchResults(
  entries: readonly SearchIndexEntry[],
  query: string,
  limit = 8,
): SearchIndexEntry[] {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return [];

  const resultLimit = normalizeResultLimit(limit);

  return entries
    .map((entry) => ({ entry, score: score(entry, normalizedQuery) }))
    .filter(
      (result): result is { entry: SearchIndexEntry; score: number } => result.score !== null,
    )
    .sort((left, right) => {
      const scoreOrder = left.score - right.score;
      if (scoreOrder) return scoreOrder;

      const primaryOrder = left.entry.primary.localeCompare(right.entry.primary, "ja");
      if (primaryOrder) return primaryOrder;

      return compareCodePoints(left.entry.id, right.entry.id);
    })
    .slice(0, resultLimit)
    .map(({ entry }) => entry);
}

export async function loadSearchIndex(signal?: AbortSignal): Promise<SearchIndexEntry[]> {
  const response = await fetch("/content/search-index.json", { signal });
  if (!response.ok) throw new Error("search index unavailable");

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new Error("search index unavailable");
  }
  if (!Array.isArray(payload)) throw new Error("search index unavailable");

  return payload as SearchIndexEntry[];
}
