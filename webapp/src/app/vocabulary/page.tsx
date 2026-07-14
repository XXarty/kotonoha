import { ContentDirectory } from "@/components/content-list";
import { getVocabularyDirectory } from "@/lib/content/repository";
import { contentRoute } from "@/lib/content/routes";

export default function VocabularyPage() {
  const directory = getVocabularyDirectory();
  const total = directory.reduce((sum, item) => sum + item.count, 0);

  return (
    <main className="page shell directory-page">
      <header className="directory-intro">
        <p className="eyebrow">ことばを、少しずつ</p>
        <h1 className="page-title">单词标本</h1>
        <p className="lede">
          当前收录 {total.toLocaleString("zh-CN")} 条公开词汇。先把常见的词留在身边，再按自己的节奏向外延伸。
        </p>
      </header>

      <section aria-label="词汇层级" className="vocabulary-tier-intro">
        <article>
          <p className="data-label">从这里开始</p>
          <h2>日常核心</h2>
          <p>优先学习带有可验证常用标记的词，把每天更容易遇见的表达先放进日常。</p>
        </article>
        <article>
          <p className="data-label">继续向外</p>
          <h2>进阶扩展</h2>
          <p>在核心词汇之外继续拓宽阅读范围；不以未经授权的等级或频率标签代替真实来源。</p>
        </article>
      </section>

      <section aria-labelledby="vocabulary-categories-title" className="directory-section">
        <div className="directory-section-heading">
          <h2 id="vocabulary-categories-title">按词性选择</h2>
          <p>每一条路径都显示当前快照里的真实数量。</p>
        </div>
        <ContentDirectory items={directory} hrefFor={contentRoute.vocabularyList} />
      </section>
    </main>
  );
}
