export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

const DEFAULT_PAGE_SIZE = 60;
const MAX_PAGE_SIZE = 80;
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

function normalizePageSize(pageSize: number): number {
  if (Number.isNaN(pageSize)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(pageSize)));
}

function normalizeRequestedPage(rawPage: string | string[] | undefined): number {
  const candidate = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  if (candidate === undefined || !POSITIVE_INTEGER_PATTERN.test(candidate)) return 1;

  const parsed = Number(candidate);
  return Number.isSafeInteger(parsed) ? parsed : 1;
}

export function paginate<T>(
  items: readonly T[],
  rawPage: string | string[] | undefined,
  pageSize = DEFAULT_PAGE_SIZE,
): PaginatedResult<T> {
  const size = normalizePageSize(pageSize);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const page = Math.min(normalizeRequestedPage(rawPage), pageCount);
  const start = (page - 1) * size;

  return {
    items: items.slice(start, start + size),
    page,
    pageCount,
    total,
  };
}
