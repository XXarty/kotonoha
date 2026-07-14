import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SearchIndexEntry } from "@/lib/content/search-index";

import { GlobalSearch } from "./global-search";

const fixtureIndex: SearchIndexEntry[] = [
  {
    id: "vocabulary:akari",
    kind: "vocabulary",
    primary: "灯",
    reading: "あかり",
    romaji: "akari",
    meaning: "灯光",
    href: "/vocabulary/entry/vocabulary%3Aakari",
  },
  {
    id: "vocabulary:tomoshibi",
    kind: "vocabulary",
    primary: "灯火",
    reading: "ともしび",
    romaji: "tomoshibi",
    meaning: "light flame",
    href: "/vocabulary/entry/vocabulary%3Atomoshibi",
  },
  {
    id: "grammar:sou",
    kind: "grammar",
    primary: "〜そう",
    reading: "そう",
    romaji: "sou",
    meaning: "looks like light rain",
    href: "/grammar/grammar%3Asou",
  },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

afterEach(() => {
  document.body.style.overflow = "";
  vi.restoreAllMocks();
});

describe("GlobalSearch", () => {
  it("does not load before first open, then caches a successful index across reopen", async () => {
    const loader = vi.fn(async () => fixtureIndex);
    render(<GlobalSearch loader={loader} />);

    expect(loader).not.toHaveBeenCalled();

    const trigger = screen.getByRole("button", { name: "搜索全站内容" });
    fireEvent.click(trigger);
    expect(loader).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog", { name: "搜索日语内容" })).toBeVisible();

    const searchbox = screen.getByRole("searchbox");
    await waitFor(() => expect(searchbox).toHaveFocus());
    fireEvent.change(searchbox, { target: { value: "灯" } });
    expect(await screen.findByRole("link", { name: /灯.*あかり.*灯光/ })).toHaveAttribute(
      "href",
      fixtureIndex[0]!.href,
    );

    fireEvent.click(screen.getByRole("button", { name: "关闭搜索" }));
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("dialog", { name: "搜索日语内容" })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(loader).toHaveBeenCalledOnce();
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByText("输入日文、假名、罗马字或中文开始搜索。")).toBeVisible();
  });

  it("closes on Escape, clears the query, and restores the exact trigger", async () => {
    render(<GlobalSearch loader={async () => fixtureIndex} />);
    const trigger = screen.getByRole("button", { name: "搜索全站内容" });

    fireEvent.click(trigger);
    const searchbox = screen.getByRole("searchbox");
    await waitFor(() => expect(searchbox).toHaveFocus());
    fireEvent.change(searchbox, { target: { value: "灯" } });
    fireEvent.keyDown(searchbox, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "搜索日语内容" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("traps forward and reverse Tab and prevents programmatic focus escape", async () => {
    render(
      <>
        <button type="button">搜索层外</button>
        <GlobalSearch loader={async () => fixtureIndex} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "搜索全站内容" }));
    const searchbox = screen.getByRole("searchbox");
    const closeButton = screen.getByRole("button", { name: "关闭搜索" });
    await waitFor(() => expect(searchbox).toHaveFocus());

    fireEvent.keyDown(searchbox, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(closeButton, { key: "Tab", shiftKey: true });
    expect(searchbox).toHaveFocus();

    screen.getByRole("button", { name: "搜索层外" }).focus();
    expect(searchbox).toHaveFocus();
  });

  it("restores the exact prior body overflow on close and unmount", async () => {
    document.body.style.overflow = "clip";
    const { unmount } = render(<GlobalSearch loader={async () => fixtureIndex} />);

    fireEvent.click(screen.getByRole("button", { name: "搜索全站内容" }));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "关闭搜索" }));
    expect(document.body.style.overflow).toBe("clip");

    fireEvent.click(screen.getByRole("button", { name: "搜索全站内容" }));
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("clip");
  });

  it("wraps active results with arrows, syncs pointer and focus, and activates on Enter", async () => {
    render(<GlobalSearch loader={async () => fixtureIndex} />);
    fireEvent.click(screen.getByRole("button", { name: "搜索全站内容" }));
    const searchbox = screen.getByRole("searchbox");
    fireEvent.change(searchbox, { target: { value: "light" } });

    const results = await screen.findAllByRole("link", { name: /light/ });
    expect(results).toHaveLength(2);

    fireEvent.keyDown(searchbox, { key: "ArrowUp" });
    expect(searchbox).toHaveAttribute("aria-activedescendant", results[1]!.id);
    expect(results[1]).toHaveAttribute("data-active", "true");

    fireEvent.keyDown(searchbox, { key: "ArrowDown" });
    expect(searchbox).toHaveAttribute("aria-activedescendant", results[0]!.id);

    fireEvent.mouseEnter(results[1]!);
    expect(results[1]).toHaveAttribute("data-active", "true");
    act(() => results[0]!.focus());
    expect(searchbox).toHaveAttribute("aria-activedescendant", results[0]!.id);

    const activated = vi.fn();
    results[0]!.addEventListener("click", (event) => {
      event.preventDefault();
      activated();
    });
    fireEvent.keyDown(searchbox, { key: "Enter" });
    expect(activated).toHaveBeenCalledOnce();
  });

  it("shows a friendly error, exact directory links, and retries the loader", async () => {
    const loader = vi
      .fn<() => Promise<SearchIndexEntry[]>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(fixtureIndex);
    render(<GlobalSearch loader={loader} />);

    fireEvent.click(screen.getByRole("button", { name: "搜索全站内容" }));
    expect(await screen.findByText("暂时无法载入搜索内容。")).toBeVisible();
    expect(screen.getByRole("link", { name: "去单词目录" })).toHaveAttribute(
      "href",
      "/vocabulary",
    );
    expect(screen.getByRole("link", { name: "去语法目录" })).toHaveAttribute(
      "href",
      "/grammar",
    );

    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "灯" } });
    expect(await screen.findByRole("link", { name: /灯.*あかり.*灯光/ })).toBeVisible();
  });

  it("ignores a loader that resolves after close and loads again on the next open", async () => {
    const first = deferred<SearchIndexEntry[]>();
    const loader = vi
      .fn<() => Promise<SearchIndexEntry[]>>()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce(fixtureIndex);
    render(<GlobalSearch loader={loader} />);

    const trigger = screen.getByRole("button", { name: "搜索全站内容" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "关闭搜索" }));
    await act(async () => first.resolve(fixtureIndex));

    fireEvent.click(trigger);
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "灯" } });
    expect(await screen.findByRole("link", { name: /灯.*あかり.*灯光/ })).toBeVisible();
  });

  it("does not update state when a pending loader resolves after unmount", async () => {
    const pending = deferred<SearchIndexEntry[]>();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { unmount } = render(<GlobalSearch loader={() => pending.promise} />);

    fireEvent.click(screen.getByRole("button", { name: "搜索全站内容" }));
    unmount();
    await act(async () => pending.resolve(fixtureIndex));

    expect(consoleError).not.toHaveBeenCalled();
  });
});
