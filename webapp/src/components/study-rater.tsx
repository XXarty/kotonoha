"use client";

import { set as idbSet } from "idb-keyval";
import { useState, useTransition } from "react";

import { setFavoriteAction } from "@/lib/actions/favorites";
import { rateStudyAction } from "@/lib/actions/study";
import { authClient } from "@/lib/auth/client";
import type { ReviewRating } from "@/lib/content/types";

const ratings: { label: string; value: ReviewRating }[] = [
  { label: "忘了", value: "forgot" },
  { label: "有点印象", value: "unsure" },
  { label: "认识", value: "known" },
];

const GUEST_GUIDANCE = "这次记录会留在这台设备上。登录后，也能在其他设备继续。";

function studyError(action: "记录" | "收藏", error: unknown, signedIn: boolean): string {
  if (signedIn && error instanceof Error && error.message === "Authentication required") {
    return "登录状态已过期，请重新登录后再试。";
  }
  if (error instanceof Error && error.message === "content item not found") {
    return "这项内容暂时不可用，请返回目录选择其他内容。";
  }
  if (signedIn) return `${action}失败。请检查网络连接后稍后重试。`;
  return `${action}失败：无法写入这台设备。请检查浏览器存储权限后再试。`;
}

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
        setMessage("已经轻轻记下，下次再见。");
      } catch (error) {
        setMessage(studyError("记录", error, signedIn));
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
      } catch (error) {
        setMessage(studyError("收藏", error, signedIn));
      }
    });
  }

  return (
    <section aria-label="学习记录" className="study-rater">
      <p className="detail-section-title">这次记得怎么样？</p>
      <div className="study-rater-actions">
        {ratings.map((rating) => (
          <button className="button-quiet" disabled={isPending} key={rating.value} onClick={() => recordRating(rating.value)} type="button">
            {rating.label}
          </button>
        ))}
        <button aria-pressed={favorite} className="button-quiet" disabled={isPending} onClick={toggleFavorite} type="button">
          {favorite ? "已收藏" : "收藏"}
        </button>
      </div>
      <p aria-live="polite" className="study-rater-message">{message}</p>
      {!signedIn ? <p className="study-rater-guidance">{GUEST_GUIDANCE}</p> : null}
    </section>
  );
}

export function ConnectedStudyRater({ itemId, authEnabled }: { itemId: string; authEnabled: boolean }) {
  return authEnabled ? <SessionStudyRater itemId={itemId} /> : <StudyRater itemId={itemId} />;
}

function SessionStudyRater({ itemId }: { itemId: string }) {
  const session = authClient.useSession();
  return <StudyRater itemId={itemId} signedIn={Boolean(session.data?.user)} />;
}
