import Link from "next/link";

import type { DailyWordCandidate } from "@/lib/content/types";
import { contentRoute } from "@/lib/content/routes";

export function SpecimenWord({ word }: { word: DailyWordCandidate }) {
  return (
    <article className="relative mt-12 overflow-hidden border-y border-[var(--line)] py-8 sm:py-12">
      <span aria-hidden="true" className="absolute right-0 top-6 border border-[var(--seal)] px-2 py-1 font-[var(--font-data)] text-xs text-[var(--seal)]">今日</span>
      <p className="eyebrow">今日の一个词</p>
      <div className="grid gap-8 md:grid-cols-[1.2fr_.8fr] md:items-end">
        <div>
          <h2 className="font-[var(--font-display)] text-[clamp(4rem,14vw,10rem)] font-medium leading-none tracking-[-.07em]">{word.japanese}</h2>
          <p className="mt-3 font-[var(--font-data)] text-sm tracking-[.12em] text-[var(--indigo)]">{word.kana} · {word.romaji}</p>
        </div>
        <div className="pb-2">
          <p className="text-xl">{word.meaningZh}</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{word.meaningEn}</p>
          <Link className="mt-7 inline-flex border-b border-[var(--ink)] text-sm" href={contentRoute.vocabularyEntry(word.id)}>打开词条 →</Link>
        </div>
      </div>
    </article>
  );
}
