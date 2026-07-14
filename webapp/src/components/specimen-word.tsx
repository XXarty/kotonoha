import Link from "next/link";

import type { DailyWordCandidate } from "@/lib/content/types";
import { contentRoute } from "@/lib/content/routes";

export function SpecimenWord({ word }: { word: DailyWordCandidate }) {
  return (
    <section aria-labelledby="daily-word-title" className="daily-word paper-panel reveal-soft">
      <div className="daily-word-ring" aria-hidden="true" />
      <div className="daily-word-content">
        <h2 className="eyebrow" id="daily-word-title">今日のことば</h2>
        <div className="daily-word-main">
          <h3>{word.japanese}</h3>
          <p className="daily-word-reading">{word.kana}</p>
          <p className="daily-word-romaji">{word.romaji}</p>
        </div>
        <div className="daily-word-meaning">
          <p>{word.meaningZh}</p>
          <p>{word.meaningEn}</p>
          <Link href={contentRoute.vocabularyEntry(word.id)}>
            打开词条
            <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
              <path d="M3.75 9h10.5M10.5 5.25 14.25 9l-3.75 3.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
            </svg>
          </Link>
        </div>
        <p className="daily-word-source">词义来源：{word.sourceTitle}</p>
      </div>
    </section>
  );
}
