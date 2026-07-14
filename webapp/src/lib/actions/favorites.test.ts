import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/content/repository", () => ({ getContentItem: vi.fn() }));
vi.mock("@/lib/db/queries", () => ({ setFavorite: vi.fn() }));

import { requireUser } from "@/lib/auth/require-user";
import { getContentItem } from "@/lib/content/repository";
import { setFavorite } from "@/lib/db/queries";
import { setFavoriteAction } from "./favorites";

describe("setFavoriteAction", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset().mockResolvedValue("user-42");
    vi.mocked(getContentItem).mockReset();
    vi.mocked(setFavorite).mockReset().mockResolvedValue(undefined);
  });

  it("never accepts a missing static item", async () => {
    vi.mocked(getContentItem).mockReturnValue(null);

    await expect(
      setFavoriteAction({ itemId: "grammar:tae-kim:missing", favorite: true }),
    ).rejects.toThrow("content item not found");
    expect(setFavorite).not.toHaveBeenCalled();
  });

  it("scopes the favorite mutation to the authenticated user", async () => {
    vi.mocked(getContentItem).mockReturnValue({
      kind: "grammar",
      id: "grammar:tae-kim:topic-particle",
    } as ReturnType<typeof getContentItem>);

    await setFavoriteAction({ itemId: "grammar:tae-kim:topic-particle", favorite: true });

    expect(setFavorite).toHaveBeenCalledWith({
      userId: "user-42",
      kind: "grammar",
      itemId: "grammar:tae-kim:topic-particle",
      favorite: true,
    });
  });
});
