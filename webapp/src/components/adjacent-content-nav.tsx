import Link from "next/link";

interface AdjacentContentLink {
  href: string;
  label: string;
}

interface AdjacentContentNavProps {
  previous: AdjacentContentLink | null;
  next: AdjacentContentLink | null;
}

function DirectionLink({
  direction,
  item,
}: {
  direction: "previous" | "next";
  item: AdjacentContentLink;
}) {
  const isNext = direction === "next";
  return (
    <Link
      className={`adjacent-content-link${isNext ? " adjacent-content-link-next" : ""}`}
      href={item.href}
    >
      <span aria-hidden="true" className="adjacent-content-arrow">
        {isNext ? "→" : "←"}
      </span>
      <span>
        <span className="adjacent-content-direction">{isNext ? "下一个" : "上一个"}</span>
        <span className="adjacent-content-label" lang="ja">{item.label}</span>
      </span>
    </Link>
  );
}

export function AdjacentContentNav({ previous, next }: AdjacentContentNavProps) {
  if (!previous && !next) return null;

  return (
    <nav aria-label="相邻内容" className="adjacent-content-nav">
      {previous ? <DirectionLink direction="previous" item={previous} /> : <span />}
      {next ? <DirectionLink direction="next" item={next} /> : null}
    </nav>
  );
}
