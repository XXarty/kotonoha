import { notFound } from "next/navigation";

import { ConnectedStudyRater } from "@/components/study-rater";
import { isAuthConfigured } from "@/lib/auth/enabled";
import { getSourceAttributions, getVocabularyEntry } from "@/lib/content/repository";

export default async function VocabularyEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let decodedId: string;
  try {
    decodedId = decodeURIComponent(id);
  } catch {
    notFound();
  }
  const entry = getVocabularyEntry(decodedId);
  if (!entry) notFound();
  const source = getSourceAttributions().sources.find((item) => item.id === entry.source_id);
  return <main className="page shell"><p className="eyebrow">Vocabulary specimen</p><div className="detail-grid"><section><h1 className="detail-japanese">{entry.japanese}</h1><p className="detail-reading">{entry.kana} · {entry.romaji}</p><p className="mt-8 text-sm text-[var(--ink-soft)]">词性：{entry.part_of_speech.join(" · ")}</p><ConnectedStudyRater authEnabled={isAuthConfigured()} itemId={entry.id} /></section><section><p className="data-label">中文释义</p><ol className="meaning-list">{entry.meaning_zh.map((meaning) => <li key={meaning}>{meaning}</li>)}</ol><p className="data-label mt-8">English</p><p className="mt-2 text-[var(--ink-soft)]">{entry.meaning_en.join("; ")}</p>{source ? <p className="source-note">来源：<a className="underline underline-offset-4" href={source.url}>{source.title}</a> · <a className="underline underline-offset-4" href={source.license_url}>{source.license_name}</a></p> : null}</section></div></main>;
}
