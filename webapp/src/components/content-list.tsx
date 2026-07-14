import Link from "next/link";

import type { ContentDirectoryItem } from "@/lib/content/types";

export function ContentDirectory({ items, hrefFor }: { items: ContentDirectoryItem[]; hrefFor: (slug: string) => string }) {
  return (
    <div className="directory-grid">
      {items.map((item) => (
        <Link className="directory-card" href={hrefFor(item.slug)} key={item.slug}>
          <span className="directory-count">{item.count} 条</span>
          <h2>{item.title}</h2>
          <p>{item.description}</p>
          <span className="data-label">OPEN COLLECTION →</span>
        </Link>
      ))}
    </div>
  );
}
