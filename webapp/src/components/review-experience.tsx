"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { getDueReviewAction } from "@/lib/actions/study";
import { authClient } from "@/lib/auth/client";
import { contentRoute } from "@/lib/content/routes";

type DueReviewItem = Awaited<ReturnType<typeof getDueReviewAction>>[number];

export function ReviewExperience({ authEnabled }: { authEnabled: boolean }) {
  if (!authEnabled) return <ReviewGuidance />;
  return <SessionReviewExperience />;
}

function SessionReviewExperience() {
  const session = authClient.useSession();
  const [items, setItems] = useState<DueReviewItem[] | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (session.isPending) {
    return <p className="mt-12 text-[var(--ink-soft)]">正在读取账号状态…</p>;
  }
  if (!session.data?.user) return <ReviewGuidance />;

  function loadQueue() {
    startTransition(async () => {
      setError("");
      try {
        setItems(await getDueReviewAction());
      } catch {
        setError("暂时无法读取复习队列，请稍后重试。");
      }
    });
  }

  return (
    <section className="mt-12 max-w-3xl">
      <button className="button-primary" disabled={isPending} onClick={loadQueue} type="button">
        {isPending ? "读取中…" : "查看到期内容"}
      </button>
      <p aria-live="polite" className="mt-3 text-sm text-red-700">{error}</p>
      {items?.length === 0 ? <p className="mt-8 border-y border-[var(--line)] py-8">现在没有到期内容，继续学习新的词条吧。</p> : null}
      {items?.length ? <ul className="entry-list">{items.map((item) => <li key={item.progressId}><Link className="entry-row" href={reviewHref(item)}><span className="entry-primary">{primaryText(item)}</span><span className="entry-reading">{item.kind}</span><span className="entry-meaning">下次复习：{new Date(item.nextReviewAt).toLocaleDateString("zh-CN")}</span></Link></li>)}</ul> : null}
    </section>
  );
}

function ReviewGuidance() {
  return <div className="mt-12 max-w-2xl border-y border-[var(--line)] py-10"><h2 className="font-[var(--font-display)] text-3xl">在这台设备上继续</h2><p className="mt-4 text-[var(--ink-soft)]">访客评分会保存在浏览器中。登录后，复习日期和收藏可以写入你的个人进度，并在不同设备之间同步。</p><div className="mt-7 flex flex-wrap gap-3"><Link className="button-primary" href="/sign-in?next=/review">登录查看进度</Link><Link className="button-quiet" href="/vocabulary">继续学单词</Link></div></div>;
}

function reviewHref(item: DueReviewItem): string {
  if (item.kind === "vocabulary") return contentRoute.vocabularyEntry(item.id);
  if (item.kind === "grammar") return contentRoute.grammarEntry(item.slug);
  return contentRoute.kana;
}

function primaryText(item: DueReviewItem): string {
  if (item.kind === "vocabulary") return item.japanese;
  if (item.kind === "grammar") return item.expression;
  return `${item.hiragana} · ${item.katakana}`;
}
