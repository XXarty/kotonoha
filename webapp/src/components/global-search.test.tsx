import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigationState = vi.hoisted(() => ({ pathname: "/", search: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useSearchParams: () => new URLSearchParams(navigationState.search),
}));

import type { SearchIndexEntry } from "@/lib/content/search-index";

import { GlobalSearch } from "./global-search";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

function cssRule(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{([^}]*)\\}`, "s"))?.[1] ?? "";
}

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

beforeEach(() => {
  navigationState.pathname = "/";
  navigationState.search = "";
  window.history.replaceState(null, "", "/");
});

describe("GlobalSearch", () => {
  it("does not open or load when the URL has no search trigger", () => {
    const loader = vi.fn(async () => fixtureIndex);
    const { rerender } = render(<GlobalSearch loader={loader} />);

    rerender(<GlobalSearch loader={loader} />);

    expect(loader).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "搜索日语内容" })).not.toBeInTheDocument();
  });

  it("opens once from the URL, seeds ranking before results, focuses, and lazy-loads", async () => {
    navigationState.search = "search=1&q=%E7%81%AF";
    const loader = vi.fn(async () => fixtureIndex);
    const { rerender } = render(
      <StrictMode>
        <GlobalSearch loader={loader} />
      </StrictMode>,
    );

    const searchbox = await screen.findByRole("searchbox");
    expect(searchbox).toHaveValue("灯");
    await waitFor(() => expect(searchbox).toHaveFocus());
    expect(await screen.findByRole("link", { name: /灯.*あかり.*灯光/ })).toBeVisible();
    expect(loader).toHaveBeenCalledOnce();

    rerender(
      <StrictMode>
        <GlobalSearch loader={loader} />
      </StrictMode>,
    );
    expect(loader).toHaveBeenCalledOnce();
    expect(screen.getAllByRole("dialog", { name: "搜索日语内容" })).toHaveLength(1);
  });

  it("clears the URL before Escape close and does not reopen from the consumed trigger", async () => {
    navigationState.pathname = "/grammar";
    navigationState.search = "search=1&q=sou";
    const replaceState = vi.spyOn(window.history, "replaceState");
    const loader = vi.fn(async () => fixtureIndex);
    const { rerender } = render(<GlobalSearch loader={loader} />);
    const searchbox = await screen.findByRole("searchbox");

    fireEvent.keyDown(searchbox, { key: "Escape" });

    expect(replaceState).toHaveBeenCalledWith(null, "", "/grammar");
    expect(screen.queryByRole("dialog", { name: "搜索日语内容" })).not.toBeInTheDocument();
    rerender(<GlobalSearch loader={loader} />);
    expect(screen.queryByRole("dialog", { name: "搜索日语内容" })).not.toBeInTheDocument();
    expect(loader).toHaveBeenCalledOnce();
  });

  it("clears the URL when the close button dismisses a URL-triggered overlay", async () => {
    navigationState.search = "search=1&q=%E7%81%AF";
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<GlobalSearch loader={async () => fixtureIndex} />);

    fireEvent.click(await screen.findByRole("button", { name: "关闭搜索" }));

    expect(replaceState).toHaveBeenCalledWith(null, "", "/");
    expect(screen.queryByRole("dialog", { name: "搜索日语内容" })).not.toBeInTheDocument();
  });

  it("treats the same trigger as new only after the URL trigger disappears", async () => {
    navigationState.search = "search=1&q=%E7%81%AF";
    const loader = vi.fn(async () => fixtureIndex);
    const { rerender } = render(<GlobalSearch loader={loader} />);
    fireEvent.click(await screen.findByRole("button", { name: "关闭搜索" }));

    navigationState.search = "";
    rerender(<GlobalSearch loader={loader} />);
    navigationState.search = "search=1&q=%E7%81%AF";
    rerender(<GlobalSearch loader={loader} />);

    expect(await screen.findByRole("searchbox")).toHaveValue("灯");
    expect(loader).toHaveBeenCalledOnce();
  });

  it("clears the URL before URL-triggered result navigation", async () => {
    navigationState.pathname = "/";
    navigationState.search = "search=1&q=%E7%81%AF";
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<GlobalSearch loader={async () => fixtureIndex} />);
    const result = await screen.findByRole("link", { name: /灯.*あかり.*灯光/ });
    result.addEventListener("click", (event) => event.preventDefault());

    fireEvent.click(result);

    expect(replaceState).toHaveBeenCalledWith(null, "", "/");
    expect(screen.queryByRole("dialog", { name: "搜索日语内容" })).not.toBeInTheDocument();
  });

  it("clears the URL before URL-triggered directory navigation", async () => {
    navigationState.search = "search=1&q=offline";
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<GlobalSearch loader={async () => { throw new Error("offline"); }} />);
    const directoryLink = await screen.findByRole("link", { name: "去语法目录" });
    directoryLink.addEventListener("click", (event) => event.preventDefault());

    fireEvent.click(directoryLink);

    expect(replaceState).toHaveBeenCalledWith(null, "", "/");
    expect(screen.queryByRole("dialog", { name: "搜索日语内容" })).not.toBeInTheDocument();
  });

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
    document.body.style.overflow = "clip";
    render(<GlobalSearch loader={async () => fixtureIndex} />);
    const trigger = screen.getByRole("button", { name: "搜索全站内容" });
    fireEvent.click(trigger);
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
    expect(screen.queryByRole("dialog", { name: "搜索日语内容" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("clip");
    expect(trigger).not.toHaveFocus();
  });

  it("closes and releases the body lock before pointer result navigation", async () => {
    document.body.style.overflow = "clip";
    render(<GlobalSearch loader={async () => fixtureIndex} />);
    const trigger = screen.getByRole("button", { name: "搜索全站内容" });

    fireEvent.click(trigger);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "灯" } });
    const result = await screen.findByRole("link", { name: /灯.*あかり.*灯光/ });
    result.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(result);

    expect(screen.queryByRole("dialog", { name: "搜索日语内容" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("clip");
    expect(trigger).not.toHaveFocus();
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

  it("closes without trigger restoration when a directory link is clicked", async () => {
    document.body.style.overflow = "clip";
    render(<GlobalSearch loader={async () => { throw new Error("offline"); }} />);
    const trigger = screen.getByRole("button", { name: "搜索全站内容" });

    fireEvent.click(trigger);
    const directoryLink = await screen.findByRole("link", { name: "去单词目录" });
    directoryLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(directoryLink);

    expect(screen.queryByRole("dialog", { name: "搜索日语内容" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("clip");
    expect(trigger).not.toHaveFocus();
  });

  it("uses the same close path for Enter activation of a directory link", async () => {
    document.body.style.overflow = "clip";
    render(<GlobalSearch loader={async () => { throw new Error("offline"); }} />);
    const trigger = screen.getByRole("button", { name: "搜索全站内容" });

    fireEvent.click(trigger);
    const directoryLink = await screen.findByRole("link", { name: "去语法目录" });
    directoryLink.addEventListener("click", (event) => event.preventDefault());
    directoryLink.focus();
    fireEvent.keyDown(directoryLink, { key: "Enter" });
    fireEvent.click(directoryLink, { detail: 0 });

    expect(screen.queryByRole("dialog", { name: "搜索日语内容" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("clip");
    expect(trigger).not.toHaveFocus();
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

  it("does not mutate the detached UI or reacquire scroll lock after a late loader resolution", async () => {
    const pending = deferred<SearchIndexEntry[]>();
    document.body.style.overflow = "clip";
    const { container, unmount } = render(<GlobalSearch loader={() => pending.promise} />);

    fireEvent.click(screen.getByRole("button", { name: "搜索全站内容" }));
    unmount();
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => mutations.push(...records));
    observer.observe(container, { attributes: true, childList: true, subtree: true });
    await act(async () => pending.resolve(fixtureIndex));
    observer.disconnect();

    expect(container).toBeEmptyDOMElement();
    expect(mutations).toEqual([]);
    expect(document.body.style.overflow).toBe("clip");
  });

  it.each([
    ["older first", 0],
    ["topmost first", 1],
  ])("coordinates two open instances when closing the %s", async (_label, firstCloseIndex) => {
    document.body.style.overflow = "clip";
    render(
      <>
        <button type="button">搜索层外</button>
        <GlobalSearch loader={async () => fixtureIndex} />
        <GlobalSearch loader={async () => fixtureIndex} />
      </>,
    );
    const triggers = screen.getAllByRole("button", { name: "搜索全站内容" });
    fireEvent.click(triggers[0]!);
    fireEvent.click(triggers[1]!);

    const searchboxes = screen.getAllByRole("searchbox");
    await waitFor(() => expect(searchboxes[1]).toHaveFocus());
    screen.getByRole("button", { name: "搜索层外" }).focus();
    expect(searchboxes[1]).toHaveFocus();
    expect(searchboxes[0]).not.toHaveFocus();

    const closeButtons = screen.getAllByRole("button", { name: "关闭搜索" });
    fireEvent.click(closeButtons[firstCloseIndex]!);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "关闭搜索" }));
    expect(document.body.style.overflow).toBe("clip");
  });

  it("renders a full-viewport modal layer while keeping the panel below the header", () => {
    render(<GlobalSearch loader={async () => fixtureIndex} />);
    fireEvent.click(screen.getByRole("button", { name: "搜索全站内容" }));

    const dialog = screen.getByRole("dialog", { name: "搜索日语内容" });
    expect(dialog).toHaveClass("global-search-layer");
    expect(dialog.querySelector(".global-search-panel")).toBeInstanceOf(HTMLElement);
    expect(cssRule(".global-search-layer")).toMatch(/position:\s*fixed/);
    expect(cssRule(".global-search-layer")).toMatch(/inset:\s*0/);
    expect(cssRule(".global-search-layer")).toMatch(/z-index:\s*70/);
    expect(cssRule(".site-header")).toMatch(/z-index:\s*50/);
    expect(cssRule(".global-search-panel")).toMatch(/margin-top:\s*4\.5rem/);
  });

  it("keeps search, menu, and modal-close controls at the 44px target contract", () => {
    expect(cssRule(".global-search-trigger")).toMatch(/min-height:\s*2\.75rem/);
    expect(cssRule(".site-menu-toggle")).toMatch(/min-(?:width|inline-size):\s*2\.75rem/);
    expect(cssRule(".site-menu-toggle")).toMatch(/min-height:\s*2\.75rem/);
    expect(cssRule(".global-search-close")).toMatch(/min-(?:width|inline-size):\s*2\.75rem/);
    expect(cssRule(".global-search-close")).toMatch(/min-height:\s*2\.75rem/);
  });
});
