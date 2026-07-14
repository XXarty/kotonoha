import Link from "next/link";
import { notFound } from "next/navigation";

import { getVocabularyDirectory, getVocabularyList } from "@/lib/content/repository";
import { paginate } from "@/lib/content/pagination";
import { contentRoute } from "@/lib/content/routes";
import type { VocabularyEntry } from "@/lib/content/types";

type VocabularyListPageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{
    page?: string | string[];
    tier?: string | string[];
  }>;
};

const TIER_FILTERS: ReadonlyArray<{
  label: string;
  value?: VocabularyEntry["tier"];
}> = [
  { label: "全部" },
  { label: "日常核心", value: "core" },
  { label: "进阶扩展", value: "extended" },
];

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTier(
  value: string | string[] | undefined,
): VocabularyEntry["tier"] | undefined {
  const first = firstQueryValue(value);
  return first === "core" || first === "extended" ? first : undefined;
}

function listHref(
  category: string,
  tier: VocabularyEntry["tier"] | undefined,
  page?: number,
): string {
  const query = new URLSearchParams();
  if (tier) query.set("tier", tier);
  if (page !== undefined) query.set("page", String(page));
  const suffix = query.toString();
  return `${contentRoute.vocabularyList(category)}${suffix ? `?${suffix}` : ""}`;
}

function pageNavigationItems(
  currentPage: number,
  pageCount: number,
): Array<number | "start-ellipsis" | "end-ellipsis"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const visiblePages =
    currentPage <= 4
      ? [1, 2, 3, 4, 5, pageCount]
      : currentPage >= pageCount - 3
        ? [1, pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount]
        : [1, currentPage - 1, currentPage, currentPage + 1, pageCount];

  return visiblePages.flatMap((page, index) => {
    const previous = visiblePages[index - 1];
    if (previous !== undefined && page - previous > 1) {
      return [index === 1 ? "start-ellipsis" : "end-ellipsis", page] as const;
    }
    return [page];
  });
}

export default async function VocabularyListPage({
  params,
  searchParams,
}: VocabularyListPageProps) {
  const { category } = await params;
  const meta = getVocabularyDirectory().find((item) => item.slug === category);
  if (!meta) notFound();
  const query = await searchParams;
  const tier = normalizeTier(query.tier);
  const entries = getVocabularyList(category, { tier });
  const result = paginate(entries, query.page);
  const pageItems = pageNavigationItems(result.page, result.pageCount);

  return (
    <main className="page shell">
      <header className="page-intro">
        <p className="eyebrow">把今天遇见的词，慢慢留在身边</p>
        <h1 className="page-title">{meta.title}</h1>
        <p className="lede">{meta.description}</p>
      </header>

      <nav
        aria-label="词汇分层"
        className="mt-8 flex flex-wrap gap-3 border-y border-[var(--line)] py-4"
      >
        {TIER_FILTERS.map((filter) => (
          <Link
            aria-current={tier === filter.value ? "page" : undefined}
            className={
              tier === filter.value
                ? "button-primary min-w-11"
                : "button-quiet min-w-11"
            }
            href={listHref(category, filter.value)}
            key={filter.label}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      <p aria-live="polite" className="mt-6 text-sm text-[var(--ink-soft)]">
        第 {result.page} / {result.pageCount} 页 · 共 {result.total} 条
      </p>

      {result.items.length > 0 ? (
        <ul className="entry-list">
          {result.items.map((entry) => (
            <li key={entry.id}>
              <Link
                className="entry-row"
                href={contentRoute.vocabularyEntry(entry.id)}
              >
                <span className="entry-primary">{entry.japanese}</span>
                <span className="entry-reading">
                  {entry.kana} · {entry.romaji}
                </span>
                <span className="entry-meaning">
                  {entry.meaning_zh.slice(0, 2).join("；")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <section className="paper-panel mt-8 max-w-2xl p-6" aria-labelledby="empty-title">
          <h2 className="font-[var(--font-display)] text-2xl" id="empty-title">
            这一路暂时还没有可展示的单词
          </h2>
          <p className="mt-3 text-[var(--ink-soft)]">
            换一个分层看看，或回到单词目录，继续寻找适合今天的一小步。
          </p>
          <Link className="button-quiet mt-5" href={listHref(category, undefined)}>
            看看全部单词
          </Link>
        </section>
      )}

      <nav
        aria-label="词汇分页"
        className="mt-10 flex flex-wrap items-center justify-center gap-2 border-t border-[var(--line)] pt-6"
      >
        {result.page > 1 ? (
          <Link
            className="button-quiet min-w-11"
            href={listHref(category, tier, result.page - 1)}
          >
            上一页
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex min-h-11 min-w-11 items-center justify-center px-4 text-[var(--ink-soft)] opacity-60"
          >
            上一页
          </span>
        )}

        {pageItems.map((item) =>
          typeof item === "number" ? (
            <Link
              aria-current={item === result.page ? "page" : undefined}
              aria-label={`第 ${item} 页`}
              className={
                item === result.page
                  ? "button-primary min-w-11 px-3"
                  : "button-quiet min-w-11 px-3"
              }
              href={listHref(category, tier, item)}
              key={item}
            >
              {item}
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className="inline-flex min-h-11 items-center justify-center px-1 text-[var(--ink-soft)]"
              key={item}
            >
              …
            </span>
          ),
        )}

        {result.page < result.pageCount ? (
          <Link
            className="button-quiet min-w-11"
            href={listHref(category, tier, result.page + 1)}
          >
            下一页
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex min-h-11 min-w-11 items-center justify-center px-4 text-[var(--ink-soft)] opacity-60"
          >
            下一页
          </span>
        )}
      </nav>
    </main>
  );
}
