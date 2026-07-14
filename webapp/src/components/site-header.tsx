import Link from "next/link";

import { GlobalSearch, MobileNavigation } from "./global-search";

const navigation = [
  ["单词", "/vocabulary"],
  ["语法", "/grammar"],
  ["五十音", "/kana"],
  ["复习", "/review"],
] as const;

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
        <GlobalSearch />
        <Link className="button-quiet site-login" href="/sign-in">
          登录
        </Link>
      </div>
    </header>
  );
}
