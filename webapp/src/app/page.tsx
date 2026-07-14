import Link from "next/link";

import { SpecimenWord } from "@/components/specimen-word";
import { getGrammarDirectory, getVocabularyDirectory } from "@/lib/content/repository";
import { siteCopy } from "@/lib/site-copy";
import { getDailyWord } from "@/lib/study/daily-word";

export default function Home() {
  const dailyWord = getDailyWord();
  const vocabularyCount = getVocabularyDirectory().reduce((sum, item) => sum + item.count, 0);
  const grammarCount = getGrammarDirectory().reduce((sum, item) => sum + item.count, 0);

  return (
    <main className="page shell">
      <p className="eyebrow">{siteCopy.home.eyebrow}</p>
      <h1 className="display-title page-intro reveal-soft">{siteCopy.home.title}</h1>
      <div className="mt-8 flex max-w-3xl flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
        <p className="lede m-0">{siteCopy.home.description}</p>
        <Link className="button-primary shrink-0" href="/vocabulary">
          {siteCopy.home.primaryAction}
        </Link>
      </div>
      {dailyWord ? <SpecimenWord word={dailyWord} /> : null}
      <section aria-label="内容概览" className="mt-14 grid gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
        {[[vocabularyCount, "公开词汇", "/vocabulary"], [grammarCount, "基础语法", "/grammar"], [46, "五十音", "/kana"]].map(([count, label, href]) => (
          <Link className="bg-[var(--paper)] p-6" href={String(href)} key={String(label)}>
            <strong className="font-[var(--font-display)] text-4xl font-medium">{count}</strong>
            <span className="ml-3 text-sm text-[var(--ink-soft)]">{label}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
