import { getSourceAttributions } from "@/lib/content/repository";

export default function SourcesPage() {
  const { snapshots } = getSourceAttributions();
  return (
    <main className="page shell">
      <p className="eyebrow">Provenance & licenses</p>
      <h1 className="page-title">来源与许可</h1>
      <p className="lede">本站不使用 OCR 内容。公开学习资料随代码仓库发布，浏览与搜索无需数据库。</p>
      <section className="mt-12 grid gap-px border border-[var(--line)] bg-[var(--line)] md:grid-cols-3">
        <article className="bg-[var(--paper)] p-6"><p className="data-label">VOCABULARY</p><h2 className="mt-3 font-[var(--font-display)] text-2xl">JMdict × 中文维基词典</h2><p className="mt-4 text-sm text-[var(--ink-soft)]">词形、读音、词性与英文释义来自 JMdict；中文释义由 Kaikki 提供的中文维基词典机器可读数据匹配。</p><p className="mt-5 flex gap-4 text-sm underline underline-offset-4"><a href="https://www.edrdg.org/edrdg/licence.html">JMdict</a><a href="https://kaikki.org/zhwiktionary/rawdata.html">Kaikki</a><a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a></p></article>
        <article className="bg-[var(--paper)] p-6"><p className="data-label">GRAMMAR</p><h2 className="mt-3 font-[var(--font-display)] text-2xl">Tae Kim 基础语法</h2><p className="mt-4 text-sm text-[var(--ink-soft)]">依据原指南重新组织 30 个基础单元；中文说明与标注为本站整理，例句来源逐条标明。</p><p className="mt-5 text-sm underline underline-offset-4"><a href="https://guidetojapanese.org/translations.html">Tae Kim · CC BY-NC-SA 3.0</a></p></article>
        <article className="bg-[var(--paper)] p-6"><p className="data-label">KANA</p><h2 className="mt-3 font-[var(--font-display)] text-2xl">基础五十音</h2><p className="mt-4 text-sm text-[var(--ink-soft)]">46 组事实性平假名、片假名与罗马字对照由 KOTONOHA 编排并以 CC0 发布。</p><p className="mt-5 text-sm underline underline-offset-4"><a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a></p></article>
      </section>
      <section className="mt-12"><h2 className="font-[var(--font-display)] text-3xl">数据快照</h2><p className="mt-2 text-sm text-[var(--ink-soft)]">所有快照均记录 SHA-256 哈希，可复核生成内容是否来自固定版本。</p><ul className="entry-list">{snapshots.map((snapshot, index) => <li className="grid gap-2 py-4 sm:grid-cols-[12rem_8rem_1fr]" key={`${snapshot.source_id}-${snapshot.sha256}`}><span>{snapshot.source_id}{index < 2 ? ` · ${index === 0 ? "JMdict" : "Kaikki"}` : ""}</span><time>{snapshot.snapshot_date}</time><code className="break-all text-xs text-[var(--ink-soft)]">{snapshot.sha256}</code></li>)}</ul></section>
      <section className="mt-12 border-l-2 border-[var(--seal)] pl-6"><h2 className="font-[var(--font-display)] text-2xl">非商业使用声明</h2><p className="mt-3 max-w-3xl text-[var(--ink-soft)]">启用 Tae Kim 衍生语法内容期间，本项目保持非商业：不投放广告、不收费、不设订阅或赞助位。若未来改变商业模式，必须先移除或重新取得该部分内容的授权。</p></section>
    </main>
  );
}
