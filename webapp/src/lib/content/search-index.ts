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

export function rankSearchResults(
  entries: readonly SearchIndexEntry[],
  query: string,
  limit = 8,
): SearchIndexEntry[] {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return [];

  const resultLimit = Math.min(8, Math.max(1, limit));

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

      return left.entry.id.localeCompare(right.entry.id);
    })
    .slice(0, resultLimit)
    .map(({ entry }) => entry);
}

export async function loadSearchIndex(signal?: AbortSignal): Promise<SearchIndexEntry[]> {
  const response = await fetch("/content/search-index.json", { signal });
  if (!response.ok) throw new Error("search index unavailable");

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("search index unavailable");

  return payload as SearchIndexEntry[];
}
