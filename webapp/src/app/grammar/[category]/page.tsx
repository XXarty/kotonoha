import Link from "next/link";
import { notFound } from "next/navigation";

import { getGrammarDirectory, getGrammarList } from "@/lib/content/repository";
import { contentRoute } from "@/lib/content/routes";

export default async function GrammarListPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const meta = getGrammarDirectory().find((item) => item.slug === category);
  if (!meta) notFound();
  const entries = getGrammarList(category);
  return <main className="page shell"><p className="eyebrow">Grammar · {entries.length} units</p><h1 className="page-title">{meta.title}</h1><ul className="entry-list">{entries.map((entry) => <li key={entry.id}><Link className="entry-row" href={contentRoute.grammarEntry(entry.slug)}><span className="entry-primary">{entry.expression}</span><span className="entry-reading">{entry.connection}</span><span className="entry-meaning">{entry.explanation_zh}</span></Link></li>)}</ul></main>;
}
