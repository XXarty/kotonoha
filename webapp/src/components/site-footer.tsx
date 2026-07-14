import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--line)] py-8">
      <div className="shell flex flex-col justify-between gap-4 text-[var(--ink-soft)] sm:flex-row sm:items-end">
        <div>
          <p>ことばを、少しずつ。愿每一次打开，都能轻轻记住一点。</p>
          <p className="mt-1 text-sm">公开内容，非商业学习使用。</p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center underline underline-offset-4"
          href="/sources"
        >
          来源与许可
        </Link>
      </div>
    </footer>
  );
}
