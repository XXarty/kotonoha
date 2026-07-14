import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

const { getDueReviewAction, useSession } = vi.hoisted(() => ({
  getDueReviewAction: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock("@/lib/actions/study", () => ({ getDueReviewAction }));
vi.mock("@/lib/auth/client", () => ({
  authClient: { useSession },
}));

import { siteCopy } from "@/lib/site-copy";
import { ReviewExperience } from "./review-experience";

it("uses the approved review prompt and guest storage guidance", () => {
  render(<ReviewExperience authEnabled={false} />);

  expect(screen.getByText(siteCopy.review.prompt)).toBeVisible();
  expect(
    screen.getByText("这次记录会留在这台设备上。登录后，也能在其他设备继续。"),
  ).toBeVisible();
});

it("keeps the review service error visible and actionable", async () => {
  useSession.mockReturnValue({ isPending: false, data: { user: { id: "user-1" } } });
  getDueReviewAction.mockRejectedValue(new Error("数据库连接中断"));
  render(<ReviewExperience authEnabled />);

  fireEvent.click(screen.getByRole("button", { name: "查看到期内容" }));

  expect(
    await screen.findByText("暂时无法读取复习队列：数据库连接中断。请稍后重试。"),
  ).toBeVisible();
});
