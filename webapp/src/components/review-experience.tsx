"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { getDueReviewAction } from "@/lib/actions/study";
import { authClient } from "@/lib/auth/client";
import { contentRoute } from "@/lib/content/routes";
import { siteCopy } from "@/lib/site-copy";

type DueReviewItem = Awaited<ReturnType<typeof getDueReviewAction>>[number];

const GUEST_GUIDANCE = "这次记录会留在这台设备上。登录后，也能在其他设备继续。";

function reviewError(error: unknown): string {
  if (error instanceof Error) {
    const detail = error.message.trim().replace(/[。.!！]+$/, "");
    if (detail) return `暂时无法读取复习队列：${detail}。请稍后重试。`;
  }
  return "暂时无法读取复习队列。请检查网络连接后重试。";
}

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
      } catch (caughtError) {
        setError(reviewError(caughtError));
      }
    });
  }

  return (
    <section className="review-queue">
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
  return (
    <section className="review-guidance paper-panel" aria-labelledby="review-guidance-heading">
      <h2 id="review-guidance-heading">把会的，轻轻留下来</h2>
      <p>{siteCopy.review.prompt}</p>
      <p>{GUEST_GUIDANCE}</p>
      <div className="review-guidance-actions">
        <Link className="button-primary" href="/sign-in?next=/review">登录查看进度</Link>
        <Link className="button-quiet" href="/vocabulary">继续学单词</Link>
      </div>
    </section>
  );
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
