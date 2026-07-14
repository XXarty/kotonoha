const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";

export function getHongKongDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: HONG_KONG_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type === "year" || type === "month" || type === "day")
      .map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function hashDate(value: string): number {
  return [...value].reduce(
    (hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
}

export function selectDailyWord<T extends { id: string }>(
  candidates: readonly T[],
  dateKey: string,
): T | null {
  const sorted = [...candidates].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );

  return sorted.length === 0 ? null : sorted[hashDate(dateKey) % sorted.length];
}
