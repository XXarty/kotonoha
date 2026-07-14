import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({ set: vi.fn() }));
vi.mock("@/lib/actions/study", () => ({ rateStudyAction: vi.fn() }));
vi.mock("@/lib/actions/favorites", () => ({ setFavoriteAction: vi.fn() }));

import { set as idbSet } from "idb-keyval";
import { rateStudyAction } from "@/lib/actions/study";
import { StudyRater } from "./study-rater";

beforeEach(() => {
  vi.mocked(idbSet).mockReset().mockResolvedValue(undefined);
  vi.mocked(rateStudyAction).mockReset().mockResolvedValue({
    status: "reviewing",
    nextReviewAt: "2026-07-16T00:00:00.000Z",
  });
});

it("stores a guest rating in IndexedDB and announces success", async () => {
  render(<StudyRater itemId="vocabulary:jmdict:1000001" signedIn={false} />);

  fireEvent.click(screen.getByRole("button", { name: "认识" }));

  await waitFor(() =>
    expect(idbSet).toHaveBeenCalledWith(
      "kotonoha:guest-progress:v1:vocabulary:jmdict:1000001",
      expect.objectContaining({ rating: "known" }),
    ),
  );
  expect(screen.getByText("已经轻轻记下，下次再见。")).toBeVisible();
  expect(
    screen.getByText("这次记录会留在这台设备上。登录后，也能在其他设备继续。"),
  ).toBeVisible();
});

it("keeps an actionable server error visible", async () => {
  vi.mocked(rateStudyAction).mockRejectedValue(new Error("登录状态已过期"));
  render(<StudyRater itemId="grammar:tae-kim:wa-topic" signedIn />);

  fireEvent.click(screen.getByRole("button", { name: "认识" }));

  expect(await screen.findByText("记录失败：登录状态已过期。请重新登录后再试。")).toBeVisible();
});
