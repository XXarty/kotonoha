import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/content/repository", () => ({ getContentItem: vi.fn() }));
vi.mock("@/lib/db/queries", () => ({
  getItemProgress: vi.fn(),
  saveItemProgress: vi.fn(),
}));

import { requireUser } from "@/lib/auth/require-user";
import { getContentItem } from "@/lib/content/repository";
import { getItemProgress, saveItemProgress } from "@/lib/db/queries";
import { rateStudyAction } from "./study";

describe("rateStudyAction", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset().mockResolvedValue("user-42");
    vi.mocked(getContentItem).mockReset();
    vi.mocked(getItemProgress).mockReset().mockResolvedValue(null);
    vi.mocked(saveItemProgress).mockReset().mockResolvedValue(undefined);
  });

  it("rejects a rating for a nonexistent static item", async () => {
    vi.mocked(getContentItem).mockReturnValue(null);

    await expect(
      rateStudyAction({ itemId: "vocabulary:jmdict:9999999", rating: "known" }),
    ).rejects.toThrow("content item not found");
    expect(saveItemProgress).not.toHaveBeenCalled();
  });

  it("uses the authenticated user and server-calculated progress", async () => {
    vi.mocked(getContentItem).mockReturnValue({
      kind: "vocabulary",
      id: "vocabulary:jmdict:1000001",
    } as ReturnType<typeof getContentItem>);

    await rateStudyAction({ itemId: "vocabulary:jmdict:1000001", rating: "known" });

    expect(saveItemProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-42",
        itemId: "vocabulary:jmdict:1000001",
        kind: "vocabulary",
        reviewCount: 1,
        correctStreak: 1,
      }),
    );
  });
});
