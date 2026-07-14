"use client";

import { set as idbSet } from "idb-keyval";
import { useState, useTransition } from "react";

import { setFavoriteAction } from "@/lib/actions/favorites";
import { rateStudyAction } from "@/lib/actions/study";
import type { ReviewRating } from "@/lib/content/types";

const ratings: { label: string; value: ReviewRating }[] = [
  { label: "忘了", value: "forgot" },
  { label: "有点印象", value: "unsure" },
  { label: "认识", value: "known" },
];

export function StudyRater({ itemId, signedIn = false }: { itemId: string; signedIn?: boolean }) {
  const [message, setMessage] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [isPending, startTransition] = useTransition();

  function recordRating(rating: ReviewRating) {
    startTransition(async () => {
      setMessage("");
      try {
        if (signedIn) {
          await rateStudyAction({ itemId, rating });
        } else {
          await idbSet(`kotonoha:guest-progress:v1:${itemId}`, {
            itemId,
            rating,
            updatedAt: new Date().toISOString(),
          });
        }
        setMessage("已记录，下次继续。");
      } catch {
        setMessage("记录失败，请稍后重试。");
      }
    });
  }

  function toggleFavorite() {
    const next = !favorite;
    startTransition(async () => {
      try {
        if (signedIn) {
          await setFavoriteAction({ itemId, favorite: next });
        } else {
          await idbSet(`kotonoha:guest-favorite:v1:${itemId}`, {
            itemId,
            favorite: next,
            updatedAt: new Date().toISOString(),
          });
        }
        setFavorite(next);
        setMessage(next ? "已收藏。" : "已取消收藏。");
      } catch {
        setMessage("收藏失败，请稍后重试。");
      }
    });
  }

  return (
    <section aria-label="学习记录" className="mt-10 border-t border-[var(--line)] pt-6">
      <p className="data-label">这次记得怎么样？</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {ratings.map((rating) => (
          <button className="button-quiet" disabled={isPending} key={rating.value} onClick={() => recordRating(rating.value)} type="button">
            {rating.label}
          </button>
        ))}
        <button aria-pressed={favorite} className="button-quiet" disabled={isPending} onClick={toggleFavorite} type="button">
          {favorite ? "已收藏" : "收藏"}
        </button>
      </div>
      <p aria-live="polite" className="mt-3 min-h-6 text-sm text-[var(--indigo)]">{message}</p>
      {!signedIn ? <p className="text-xs text-[var(--ink-soft)]">访客记录只保存在这台设备；登录后可跨设备同步。</p> : null}
    </section>
  );
}
