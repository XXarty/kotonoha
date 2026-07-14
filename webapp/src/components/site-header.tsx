import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { Suspense } from "react";

import { GlobalSearch, MobileNavigation } from "./global-search";

const navigation = [
  ["单词", "/vocabulary"],
  ["语法", "/grammar"],
  ["五十音", "/kana"],
  ["复习", "/review"],
] as const;

function SearchTriggerSkeleton() {
  return (
    <span aria-hidden="true" className="global-search-trigger global-search-trigger-skeleton">
      <SearchIcon size={20} strokeWidth={1.8} />
      <span className="global-search-trigger-text">搜索</span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header-row">
        <Link className="site-brand" href="/">
          ことのは <span className="data-label">KOTONOHA</span>
        </Link>
        <MobileNavigation>
          {navigation.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </MobileNavigation>
        <Suspense fallback={<SearchTriggerSkeleton />}>
          <GlobalSearch />
        </Suspense>
        <Link className="button-quiet site-login" href="/sign-in">
          登录
        </Link>
      </div>
    </header>
  );
}
