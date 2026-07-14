import Link from "next/link";
import { notFound } from "next/navigation";

import { getVocabularyDirectory, getVocabularyList } from "@/lib/content/repository";
import { contentRoute } from "@/lib/content/routes";

export default async function VocabularyListPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const meta = getVocabularyDirectory().find((item) => item.slug === category);
  if (!meta) notFound();
  const entries = getVocabularyList(category);
  return <main className="page shell"><p className="eyebrow">Vocabulary · {entries.length} entries</p><h1 className="page-title">{meta.title}</h1><p className="lede">{meta.description}</p><ul className="entry-list">{entries.map((entry) => <li key={entry.id}><Link className="entry-row" href={contentRoute.vocabularyEntry(entry.id)}><span className="entry-primary">{entry.japanese}</span><span className="entry-reading">{entry.kana} · {entry.romaji}</span><span className="entry-meaning">{entry.meaning_zh.slice(0, 2).join("；")}</span></Link></li>)}</ul></main>;
}
