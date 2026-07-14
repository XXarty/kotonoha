import { getSourceAttributions } from "@/lib/content/repository";

export default function SourcesPage() {
  const { snapshots } = getSourceAttributions();
  return (
    <main className="page shell">
      <p className="eyebrow">Provenance & licenses</p>
      <h1 className="page-title">来源与许可</h1>
      <p className="lede">本站不使用 OCR 内容。公开学习资料随代码仓库发布，浏览与搜索无需数据库。</p>
      <section className="mt-12 grid gap-px border border-[var(--line)] bg-[var(--line)] md:grid-cols-4">
        <article className="bg-[var(--paper)] p-6"><p className="data-label">VOCABULARY</p><h2 className="mt-3 font-[var(--font-display)] text-2xl">JMdict × 中文维基词典</h2><p className="mt-4 text-sm text-[var(--ink-soft)]">词形、读音、词性与英文释义来自 JMdict；中文释义由 Kaikki 提供的中文维基词典机器可读数据匹配。</p><p className="mt-5 flex gap-4 text-sm underline underline-offset-4"><a href="https://www.edrdg.org/edrdg/licence.html">JMdict</a><a href="https://kaikki.org/zhwiktionary/rawdata.html">Kaikki</a><a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a></p></article>
        <article className="bg-[var(--paper)] p-6"><p className="data-label">GRAMMAR · DIRECT</p><h2 className="mt-3 font-[var(--font-display)] text-2xl">Tae Kim 语法课程</h2><p className="mt-4 text-sm text-[var(--ink-soft)]">直接对应官方课程的语法单元保留官方课程链接，并标明为直接来源。</p><p className="mt-5 text-sm underline underline-offset-4"><a href="https://creativecommons.org/licenses/by-nc-sa/3.0/us/">Tae Kim · CC BY-NC-SA 3.0</a></p></article>
        <article className="bg-[var(--paper)] p-6"><p className="data-label">GRAMMAR · EXTENSION</p><h2 className="mt-3 font-[var(--font-display)] text-2xl">KOTONOHA 原创扩展</h2><p className="mt-4 text-sm text-[var(--ink-soft)]">无法直接对应官方课程的说明与例句标为 KOTONOHA 原创；相关课程链接仅提供学习语境。</p><p className="mt-5 text-sm"><a className="underline underline-offset-4" href="https://github.com/XXarty/kotonoha">KOTONOHA 原创扩展</a><br />All rights reserved</p></article>
        <article className="bg-[var(--paper)] p-6"><p className="data-label">KANA</p><h2 className="mt-3 font-[var(--font-display)] text-2xl">基础五十音</h2><p className="mt-4 text-sm text-[var(--ink-soft)]">46 组事实性平假名、片假名与罗马字对照由 KOTONOHA 编排并以 CC0 发布。</p><p className="mt-5 text-sm underline underline-offset-4"><a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a></p></article>
      </section>
      <section className="mt-12"><h2 className="font-[var(--font-display)] text-3xl">数据快照</h2><p className="mt-2 text-sm text-[var(--ink-soft)]">所有快照均记录 SHA-256 哈希，可复核生成内容是否来自固定版本。</p><ul className="entry-list">{snapshots.map((snapshot, index) => <li className="grid gap-2 py-4 sm:grid-cols-[12rem_8rem_1fr]" key={`${snapshot.source_id}-${snapshot.sha256}`}><span>{snapshot.source_id}{index < 2 ? ` · ${index === 0 ? "JMdict" : "Kaikki"}` : ""}</span><time>{snapshot.snapshot_date}</time><code className="break-all text-xs text-[var(--ink-soft)]">{snapshot.sha256}</code></li>)}</ul></section>
      <section className="mt-12 border-l-2 border-[var(--seal)] pl-6"><h2 className="font-[var(--font-display)] text-2xl">非商业使用声明</h2><p className="mt-3 max-w-3xl text-[var(--ink-soft)]">本项目当前作为非商业学习项目发布。各条内容的直接来源、原创扩展标记与对应许可分别记录，不以课程语境链接代替直接来源证明。</p></section>
    </main>
  );
}
