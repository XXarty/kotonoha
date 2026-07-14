import Link from "next/link";

import { searchContent } from "@/lib/content/repository";
import { contentRoute } from "@/lib/content/routes";

type SearchPageProps = { searchParams: Promise<{ q?: string | string[] }> };

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const rawQuery = (await searchParams).q;
  const query = Array.isArray(rawQuery) ? rawQuery[0] ?? "" : rawQuery ?? "";
  const results = searchContent(query);
  const total = results.vocabulary.length + results.grammar.length + results.kana.length;

  return (
    <main className="page shell">
      <p className="eyebrow">Static multi-script search</p>
      <h1 className="page-title">搜索</h1>
      <form action="/search" className="mt-10 flex max-w-3xl gap-2" role="search">
        <label className="sr-only" htmlFor="content-search">搜索日语内容</label>
        <input autoFocus className="min-w-0 flex-1 border-b-2 border-[var(--ink)] bg-transparent px-1 py-3 text-xl outline-none" defaultValue={query} id="content-search" name="q" placeholder="日文、假名、罗马字或中文" />
        <button className="button-primary" type="submit">搜索</button>
      </form>
      {query ? <p className="mt-5 text-sm text-[var(--ink-soft)]">“{query}” 找到 {total} 条结果</p> : <p className="lede">可同时搜索日文写法、假名、罗马字、中文释义与语法例句。</p>}
      {results.vocabulary.length ? <ResultSection title="单词">{results.vocabulary.map((item) => <Link className="entry-row" href={contentRoute.vocabularyEntry(item.id)} key={item.id}><span className="entry-primary">{item.japanese}</span><span className="entry-reading">{item.kana} · {item.romaji}</span><span className="entry-meaning">{item.meaning_zh.join("；")}</span></Link>)}</ResultSection> : null}
      {results.grammar.length ? <ResultSection title="语法">{results.grammar.map((item) => <Link className="entry-row" href={contentRoute.grammarEntry(item.slug)} key={item.id}><span className="entry-primary">{item.expression}</span><span className="entry-reading">{item.connection}</span><span className="entry-meaning">{item.explanation_zh}</span></Link>)}</ResultSection> : null}
      {results.kana.length ? <ResultSection title="五十音">{results.kana.map((item) => <Link className="entry-row" href="/kana" key={item.id}><span className="entry-primary">{item.hiragana} · {item.katakana}</span><span className="entry-reading">{item.romaji}</span><span className="entry-meaning">{item.row_group}</span></Link>)}</ResultSection> : null}
      {query && total === 0 ? <div className="mt-12 border-y border-[var(--line)] py-10"><h2 className="font-[var(--font-display)] text-2xl">还没有匹配内容</h2><p className="mt-2 text-[var(--ink-soft)]">试试基本形、假名或更短的中文关键词。</p></div> : null}
    </main>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-12"><h2 className="eyebrow">{title}</h2><div className="entry-list">{children}</div></section>;
}
