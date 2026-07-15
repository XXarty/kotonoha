import { notFound } from "next/navigation";

import { AdjacentContentNav } from "@/components/adjacent-content-nav";
import { ConnectedStudyRater } from "@/components/study-rater";
import { isAuthConfigured } from "@/lib/auth/enabled";
import {
  getSourceAttributions,
  getVocabularyEntry,
  getVocabularyNeighbors,
} from "@/lib/content/repository";
import { contentRoute } from "@/lib/content/routes";

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
  const neighbors = getVocabularyNeighbors(decodedId);
  const source = getSourceAttributions().sources.find(
    (item) => item.id === entry.source_id && item.enabled,
  );
  return (
    <main className="detail-page page shell">
      <p className="eyebrow">单词 · {entry.tier === "core" ? "日常核心" : "进阶扩展"}</p>
      <header className="detail-header">
        <h1 className="detail-japanese" lang="ja">{entry.japanese}</h1>
        <p className="detail-reading"><span lang="ja">{entry.kana}</span> · {entry.romaji}</p>
        <p className="detail-meta">词性：{entry.part_of_speech.join(" · ")}</p>
      </header>

      <div className="detail-grid">
        <div>
          <section className="detail-section" aria-labelledby="meaning-heading">
            <h2 className="detail-section-title" id="meaning-heading">中文释义</h2>
            <ol className="meaning-list">
              {entry.meaning_zh.map((meaning) => <li key={meaning}>{meaning}</li>)}
            </ol>
          </section>

          <section className="detail-section" aria-labelledby="english-heading">
            <h2 className="detail-section-title" id="english-heading">英文释义</h2>
            <p className="detail-body-soft">{entry.meaning_en.join("; ")}</p>
          </section>
        </div>

        <div>
          {entry.examples.length > 0 ? (
            <section className="detail-section" aria-labelledby="examples-heading">
              <h2 className="detail-section-title" id="examples-heading">例句</h2>
              <ol className="detail-examples">
                {entry.examples.map((example, index) => (
                  <li className="detail-example" key={`${example.ja}-${index}`}>
                    <p lang="ja">{example.ja}</p>
                    <p>{example.zh}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {source ? (
            <section className="source-block" aria-labelledby="source-heading">
              <h2 className="detail-section-title" id="source-heading">来源</h2>
              <p className="source-link-row">
                <a href={source.url}>{source.title}</a>
                {source.license_components?.length ? (
                  source.license_components.map((component) => (
                    <a href={component.url} key={component.url}>{component.label}</a>
                  ))
                ) : (
                  <a href={source.license_url}>{source.license_name}</a>
                )}
              </p>
              <p>内容版本：{entry.content_version}</p>
            </section>
          ) : null}
        </div>
      </div>

      <AdjacentContentNav
        previous={neighbors.previous ? {
          href: contentRoute.vocabularyEntry(neighbors.previous.id),
          label: neighbors.previous.japanese,
        } : null}
        next={neighbors.next ? {
          href: contentRoute.vocabularyEntry(neighbors.next.id),
          label: neighbors.next.japanese,
        } : null}
      />

      <div className="detail-learning-rater">
        <ConnectedStudyRater authEnabled={isAuthConfigured()} itemId={entry.id} />
      </div>
    </main>
  );
}
