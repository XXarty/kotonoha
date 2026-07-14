import Link from "next/link";
import { notFound } from "next/navigation";

import { ConnectedStudyRater } from "@/components/study-rater";
import { isAuthConfigured } from "@/lib/auth/enabled";
import {
  getGrammarEntry,
  getRelatedGrammar,
  getSourceAttributions,
} from "@/lib/content/repository";
import { contentRoute } from "@/lib/content/routes";

export default async function GrammarEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getGrammarEntry(slug);
  if (!entry) notFound();
  const source = getSourceAttributions().sources.find(
    (item) => item.id === entry.source_id && item.enabled,
  );
  const relatedEntries = getRelatedGrammar(entry.related_entries);

  return (
    <main className="detail-page page shell">
      <p className="eyebrow">语法单元 · {entry.display_order.toString().padStart(2, "0")}</p>
      <h1 className="page-title" lang="ja">{entry.expression}</h1>

      <div className="detail-grid grammar-detail-grid">
        <div>
          <section className="detail-section" aria-labelledby="connection-heading">
            <h2 className="detail-section-title" id="connection-heading">接续</h2>
            <p className="grammar-connection" lang="ja">{entry.connection}</p>
          </section>

          <section className="detail-section" aria-labelledby="explanation-heading">
            <h2 className="detail-section-title" id="explanation-heading">说明</h2>
            <p className="detail-explanation">{entry.explanation_zh}</p>
          </section>

          {entry.common_mistakes.length > 0 ? (
            <section className="detail-section" aria-labelledby="mistakes-heading">
              <h2 className="detail-section-title" id="mistakes-heading">容易混淆的地方</h2>
              <ul className="detail-note-list">
                {entry.common_mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}
              </ul>
            </section>
          ) : null}
        </div>

        <div>
          <section className="detail-section" aria-labelledby="grammar-examples-heading">
            <h2 className="detail-section-title" id="grammar-examples-heading">例句</h2>
            <ol className="detail-examples">
              {entry.examples.map((example, index) => (
                <li className="detail-example" key={`${example.ja}-${index}`}>
                  <p lang="ja">{example.ja}</p>
                  <p>{example.zh}</p>
                </li>
              ))}
            </ol>
          </section>

          {relatedEntries.length > 0 ? (
            <section className="detail-section" aria-labelledby="related-heading">
              <h2 className="detail-section-title" id="related-heading">一起比较</h2>
              <ul className="related-entry-list">
                {relatedEntries.map((related) => (
                  <li key={related.id}>
                    <Link href={contentRoute.grammarEntry(related.slug)} lang="ja">
                      {related.expression}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {source ? (
            <section className="source-block" aria-labelledby="grammar-source-heading">
              <h2 className="detail-section-title" id="grammar-source-heading">来源</h2>
              <p className="source-link-row">
                <a href={entry.source_url}>{source.title}</a>
                <a href={source.license_url}>{source.license_name}</a>
              </p>
              {entry.provenance_kind === "project-authored-extension" ? (
                <>
                  {entry.provenance_note ? <p>{entry.provenance_note}</p> : null}
                  {entry.curriculum_context_url ? (
                    <p><a href={entry.curriculum_context_url}>课程参考脉络</a></p>
                  ) : null}
                </>
              ) : null}
              <p>内容版本：{entry.content_version}</p>
            </section>
          ) : null}
        </div>
      </div>

      <div className="detail-learning-rater">
        <ConnectedStudyRater authEnabled={isAuthConfigured()} itemId={entry.id} />
      </div>
    </main>
  );
}
