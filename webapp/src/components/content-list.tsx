import Link from "next/link";

import type { ContentDirectoryItem } from "@/lib/content/types";

export function ContentDirectory({ items, hrefFor }: { items: ContentDirectoryItem[]; hrefFor: (slug: string) => string }) {
  return (
    <div className="directory-grid">
      {items.map((item) => (
        <Link
          className="directory-card"
          data-tone={item.tone ?? "paper"}
          href={hrefFor(item.slug)}
          key={item.slug}
        >
          <span className="directory-count">
            {item.meta ?? `${item.count.toLocaleString("zh-CN")} 条`}
          </span>
          <h2>{item.title}</h2>
          <p>{item.description}</p>
          <span className="directory-action">
            打开这条路径
            <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
              <path d="M3.75 9h10.5M10.5 5.25 14.25 9l-3.75 3.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
            </svg>
          </span>
        </Link>
      ))}
    </div>
  );
}
