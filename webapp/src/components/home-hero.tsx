import Link from "next/link";

import { siteCopy } from "@/lib/site-copy";

export function HomeHero() {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <p className="eyebrow">{siteCopy.home.eyebrow}</p>
      <h1 className="display-title reveal-soft" id="home-title">
        {siteCopy.home.title}
      </h1>
      <p className="lede">{siteCopy.home.description}</p>
      <div className="home-hero-actions">
        <Link className="button-primary" href="/vocabulary">
          {siteCopy.home.primaryAction}
        </Link>
        <Link className="button-quiet" href="/grammar">
          {siteCopy.home.secondaryAction}
        </Link>
      </div>
    </section>
  );
}
