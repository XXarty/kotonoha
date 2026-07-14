import Link from "next/link";

const navigation = [
  ["单词", "/vocabulary"],
  ["语法", "/grammar"],
  ["五十音", "/kana"],
  ["搜索", "/search"],
  ["复习", "/review"],
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--line)] bg-[color:var(--paper)]/95">
      <div className="shell flex min-h-18 flex-wrap items-center gap-x-6">
        <Link className="mr-auto py-4 font-[var(--font-display)] text-xl tracking-[-.03em]" href="/">
          ことのは <span className="data-label">KOTONOHA</span>
        </Link>
        <nav aria-label="主导航" className="order-3 flex w-full gap-5 overflow-x-auto border-t border-[var(--line)] py-2 text-sm md:order-none md:w-auto md:gap-6 md:border-0 md:py-0">
          {navigation.map(([label, href]) => <Link className="shrink-0" key={href} href={href}>{label}</Link>)}
        </nav>
        <Link className="button-quiet min-h-9 px-4 py-1 text-sm" href="/sign-in">登录</Link>
      </div>
    </header>
  );
}
