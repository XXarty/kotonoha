import Link from "next/link";

export default function ReviewPage() {
  return (
    <main className="page shell">
      <p className="eyebrow">Review queue</p>
      <h1 className="page-title">复习</h1>
      <div className="mt-12 max-w-2xl border-y border-[var(--line)] py-10">
        <h2 className="font-[var(--font-display)] text-3xl">在这台设备上继续</h2>
        <p className="mt-4 text-[var(--ink-soft)]">访客评分会保存在浏览器中。登录后，复习日期和收藏可以写入你的个人进度，并在不同设备之间同步。</p>
        <div className="mt-7 flex flex-wrap gap-3"><Link className="button-primary" href="/sign-in?next=/review">登录查看进度</Link><Link className="button-quiet" href="/vocabulary">继续学单词</Link></div>
      </div>
    </main>
  );
}
