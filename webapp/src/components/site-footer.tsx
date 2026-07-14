import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--line)] py-8">
      <div className="shell flex flex-col justify-between gap-3 text-sm text-[var(--ink-soft)] sm:flex-row">
        <p>ことばを、少しずつ。公开内容，非商业学习使用。</p>
        <Link className="underline underline-offset-4" href="/sources">来源与许可</Link>
      </div>
    </footer>
  );
}
