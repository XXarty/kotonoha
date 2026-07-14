import { getKanaTable } from "@/lib/content/repository";

export default function KanaPage() {
  const kana = getKanaTable();
  return <main className="page shell"><p className="eyebrow">Kana table · 46 pairs</p><h1 className="page-title">五十音</h1><p className="lede">先认识 46 组基础平假名与片假名。按行分组，配合罗马字快速核对读音。</p><ul className="mt-12 grid list-none grid-cols-3 gap-px border border-[var(--line)] bg-[var(--line)] p-0 sm:grid-cols-5 md:grid-cols-10">{kana.map((item) => <li className="bg-[var(--paper)] p-4 text-center" key={item.id}><span className="block font-[var(--font-display)] text-3xl">{item.hiragana}</span><span className="block font-[var(--font-display)] text-xl text-[var(--ink-soft)]">{item.katakana}</span><span className="data-label mt-2 block">{item.romaji}</span></li>)}</ul></main>;
}
