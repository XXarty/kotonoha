import { notFound } from "next/navigation";

import { ConnectedStudyRater } from "@/components/study-rater";
import { isAuthConfigured } from "@/lib/auth/enabled";
import { getGrammarEntry } from "@/lib/content/repository";

export default async function GrammarEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getGrammarEntry(slug);
  if (!entry) notFound();
  return <main className="page shell"><p className="eyebrow">Grammar unit · {entry.display_order.toString().padStart(2, "0")}</p><h1 className="page-title">{entry.expression}</h1><div className="detail-grid"><section><p className="data-label">接续</p><p className="mt-3 text-xl">{entry.connection}</p><p className="mt-10 text-lg leading-8">{entry.explanation_zh}</p><ConnectedStudyRater authEnabled={isAuthConfigured()} itemId={entry.id} /></section><section className="border-l border-[var(--line)] pl-7"><p className="data-label">例句</p><p className="mt-4 font-[var(--font-display)] text-3xl leading-relaxed">{entry.example_ja}</p><p className="mt-3 text-[var(--ink-soft)]">{entry.example_zh}</p><p className="source-note">参考：<a className="underline underline-offset-4" href={entry.source_url}>Tae Kim Japanese Grammar Guide</a><br />本站重新组织课程并撰写中文说明；仅作非商业学习使用。</p></section></div></main>;
}
