import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({ set: vi.fn() }));
vi.mock("@/lib/actions/study", () => ({ rateStudyAction: vi.fn() }));
vi.mock("@/lib/actions/favorites", () => ({ setFavoriteAction: vi.fn() }));

import { set as idbSet } from "idb-keyval";
import { StudyRater } from "./study-rater";

beforeEach(() => vi.mocked(idbSet).mockReset().mockResolvedValue(undefined));

it("stores a guest rating in IndexedDB and announces success", async () => {
  render(<StudyRater itemId="vocabulary:jmdict:1000001" signedIn={false} />);

  fireEvent.click(screen.getByRole("button", { name: "认识" }));

  await waitFor(() =>
    expect(idbSet).toHaveBeenCalledWith(
      "kotonoha:guest-progress:v1:vocabulary:jmdict:1000001",
      expect.objectContaining({ rating: "known" }),
    ),
  );
  expect(screen.getByText("已记录，下次继续。" )).toBeVisible();
});
