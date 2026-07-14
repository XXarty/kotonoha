import { getKanaTable } from "@/lib/content/repository";

export default function KanaPage() {
  const kana = getKanaTable();
  return (
    <main className="page shell">
      <p className="eyebrow">46 组基础假名</p>
      <h1 className="page-title">五十音</h1>
      <p className="lede">先慢慢认出平假名与片假名，再用罗马字核对读音。每次熟悉一行就很好。</p>
      <ul className="kana-grid">
        {kana.map((item) => (
          <li className="kana-card paper-panel" key={item.id}>
            <span className="kana-hiragana" lang="ja">{item.hiragana}</span>
            <span className="kana-katakana" lang="ja">{item.katakana}</span>
            <span className="data-label kana-romaji">{item.romaji}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
