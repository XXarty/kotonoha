import Link from "next/link";

import { HomeHero } from "@/components/home-hero";
import { SpecimenWord } from "@/components/specimen-word";
import { getGrammarDirectory, getKanaTable, getVocabularyDirectory } from "@/lib/content/repository";
import { siteCopy } from "@/lib/site-copy";
import { getDailyWord } from "@/lib/study/daily-word";

const numberFormatter = new Intl.NumberFormat("zh-CN");

const learningEntrances = [
  {
    href: "/vocabulary",
    marker: "言",
    title: "词汇积累",
    description: "从日常核心到进阶扩展，结合读音与词义，把词语慢慢记牢。",
  },
  {
    href: "/grammar",
    marker: "文",
    title: "语法理解",
    description: "沿着四条路径理解结构，在真实例句里看见表达如何发生。",
  },
  {
    href: "/kana",
    marker: "あ",
    title: "五十音入门",
    description: "从发音与书写开始，让阅读和听力有一处安稳的起点。",
  },
] as const;

export default function Home() {
  const dailyWord = getDailyWord();
  const vocabularyCount = getVocabularyDirectory().reduce((sum, item) => sum + item.count, 0);
  const grammarCount = getGrammarDirectory().reduce((sum, item) => sum + item.count, 0);
  const kanaCount = getKanaTable().length;

  return (
    <main className="home-page shell">
      <div className="home-opening-grid washi-surface">
        <HomeHero />
        {dailyWord ? <SpecimenWord word={dailyWord} /> : null}
      </div>

      <section aria-labelledby="continue-learning-title" className="home-guidance">
        <div>
          <p className="eyebrow">今日のつづき</p>
          <h2 id="continue-learning-title">{siteCopy.home.continueTitle}</h2>
          <p>{siteCopy.home.continueDescription}</p>
        </div>
        <div className="home-guidance-actions">
          <Link className="button-primary" href="/review">回到复习</Link>
          <Link className="button-quiet" href="/sign-in">登录保存进度</Link>
        </div>
      </section>

      <section aria-label="学习入口" className="home-entrances">
        <div className="home-section-heading">
          <h2 id="learning-entrances-title">{siteCopy.home.entrancesTitle}</h2>
          <span aria-hidden="true" />
        </div>
        <div className="home-entrance-grid">
          {learningEntrances.map((entrance) => (
            <Link href={entrance.href} key={entrance.href}>
              <span aria-hidden="true" className="home-entrance-marker">{entrance.marker}</span>
              <span>
                <strong>{entrance.title}</strong>
                <small>{entrance.description}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="内容与来源" className="home-source-note">
        <div>
          <p className="eyebrow">{siteCopy.home.sourceTitle}</p>
          <h2 id="content-sources-title">
            <span>{numberFormatter.format(vocabularyCount)} 条词汇</span>
            <span>{numberFormatter.format(grammarCount)} 个语法单元</span>
            <span>{numberFormatter.format(kanaCount)} 个五十音字符</span>
          </h2>
        </div>
        <p>
          所有数量都来自当前启用的公开内容快照。词义、语法与许可信息可以在
          <Link href="/sources">来源与许可</Link>
          中逐项查看。
        </p>
      </section>
    </main>
  );
}
