"use client";

import Link from "next/link";
import { Menu as MenuIcon, Search as SearchIcon, X } from "lucide-react";
import { flushSync } from "react-dom";
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  loadSearchIndex,
  rankSearchResults,
  type SearchIndexEntry,
} from "@/lib/content/search-index";

type SearchState = "closed" | "loading" | "ready" | "error";
type SearchLoader = () => Promise<SearchIndexEntry[]>;

const kindLabels: Record<SearchIndexEntry["kind"], string> = {
  vocabulary: "单词",
  grammar: "语法",
  kana: "五十音",
};

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const openDialogStack: symbol[] = [];
let bodyScrollLockCount = 0;
let bodyOverflowBeforeLock: string | undefined;

function acquireBodyScrollLock() {
  if (bodyScrollLockCount === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyScrollLockCount += 1;
}

function releaseBodyScrollLock() {
  if (bodyScrollLockCount === 0) return;
  bodyScrollLockCount -= 1;
  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = bodyOverflowBeforeLock ?? "";
    bodyOverflowBeforeLock = undefined;
  }
}

export interface GlobalSearchProps {
  loader?: SearchLoader;
}

export function GlobalSearch({ loader = loadSearchIndex }: GlobalSearchProps) {
  const [state, setState] = useState<SearchState>("closed");
  const [index, setIndex] = useState<SearchIndexEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const dialogId = useId();
  const resultListId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogTokenRef = useRef(Symbol("global-search-dialog"));
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const lastErrorRef = useRef<unknown>(null);
  const wasOpenRef = useRef(false);
  const restoreFocusOnCloseRef = useRef(true);
  const isOpen = state !== "closed";

  const results = useMemo(
    () => (state === "ready" && index ? rankSearchResults(index, query) : []),
    [index, query, state],
  );

  const activeResult = activeIndex >= 0 ? results[activeIndex] : undefined;
  const activeResultId = activeResult ? `${resultListId}-result-${activeIndex}` : undefined;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const dialogToken = dialogTokenRef.current;
    acquireBodyScrollLock();
    openDialogStack.push(dialogToken);

    const keepFocusInside = (event: FocusEvent) => {
      if (openDialogStack.at(-1) !== dialogToken) return;
      const dialog = dialogRef.current;
      if (dialog && event.target instanceof Node && !dialog.contains(event.target)) {
        inputRef.current?.focus();
      }
    };

    document.addEventListener("focusin", keepFocusInside);
    inputRef.current?.focus();
    return () => {
      document.removeEventListener("focusin", keepFocusInside);
      const stackIndex = openDialogStack.lastIndexOf(dialogToken);
      if (stackIndex >= 0) openDialogStack.splice(stackIndex, 1);
      releaseBodyScrollLock();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      if (restoreFocusOnCloseRef.current) triggerRef.current?.focus();
      restoreFocusOnCloseRef.current = true;
    }
  }, [isOpen]);

  const requestIndex = useCallback(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    lastErrorRef.current = null;
    setState("loading");

    void loader().then(
      (loadedIndex) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setIndex(loadedIndex);
        setState("ready");
      },
      (error: unknown) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        lastErrorRef.current = error;
        setState("error");
      },
    );
  }, [loader]);

  const openSearch = (event: MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget;
    restoreFocusOnCloseRef.current = true;
    setQuery("");
    setActiveIndex(-1);
    if (index !== null) {
      setState("ready");
      return;
    }
    requestIndex();
  };

  const closeSearch = useCallback((restoreFocus: boolean) => {
    requestIdRef.current += 1;
    lastErrorRef.current = null;
    restoreFocusOnCloseRef.current = restoreFocus;
    setQuery("");
    setActiveIndex(-1);
    setState("closed");
  }, []);

  const closeAndRestoreFocus = useCallback(() => closeSearch(true), [closeSearch]);
  const closeForNavigation = useCallback(() => {
    flushSync(() => closeSearch(false));
  }, [closeSearch]);

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndRestoreFocus();
      return;
    }
    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) => element.getAttribute("aria-hidden") !== "true",
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current < 0 ? 0 : (current + 1) % results.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      resultRefs.current[activeIndex]?.click();
    }
  };

  return (
    <>
      <button
        aria-controls={isOpen ? dialogId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="搜索全站内容"
        className="global-search-trigger"
        onClick={openSearch}
        type="button"
      >
        <SearchIcon aria-hidden="true" size={20} strokeWidth={1.8} />
        <span className="global-search-trigger-text">搜索</span>
      </button>

      {isOpen ? (
        <div
          aria-label="搜索日语内容"
          aria-modal="true"
          className="global-search-layer"
          id={dialogId}
          onKeyDown={handleDialogKeyDown}
          ref={dialogRef}
          role="dialog"
          tabIndex={-1}
        >
          <section className="global-search-panel">
            <button
              aria-label="关闭搜索"
              className="global-search-close"
              onClick={closeAndRestoreFocus}
              type="button"
            >
              <X aria-hidden="true" size={24} strokeWidth={1.6} />
            </button>

            <label className="sr-only" htmlFor={`${dialogId}-input`}>
              搜索内容
            </label>
            <div className="global-search-input-row">
              <SearchIcon aria-hidden="true" size={25} strokeWidth={1.7} />
              <input
                aria-activedescendant={activeResultId}
                aria-controls={state === "ready" ? resultListId : undefined}
                autoComplete="off"
                id={`${dialogId}-input`}
                onChange={(event) => {
                  setQuery(event.currentTarget.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="输入日文、假名、罗马字或中文"
                ref={inputRef}
                role="searchbox"
                type="search"
                value={query}
              />
            </div>

            <div aria-live="polite" className="global-search-status" role="status">
              {state === "loading" ? "正在载入搜索内容…" : null}
              {state === "error" ? "暂时无法载入搜索内容。" : null}
              {state === "ready" && !query ? "输入日文、假名、罗马字或中文开始搜索。" : null}
              {state === "ready" && query && results.length > 0
                ? `找到 ${results.length} 条结果。`
                : null}
              {state === "ready" && query && results.length === 0
                ? "这里暂时还没有匹配内容。换一个关键词，或回到学习路径看看。"
                : null}
            </div>

            {state === "ready" ? (
              <ul className="global-search-results" id={resultListId}>
                {results.map((result, resultIndex) => {
                  const resultId = `${resultListId}-result-${resultIndex}`;
                  return (
                    <li className="global-search-result-item" key={result.id}>
                      <Link
                        className="global-search-result"
                        data-active={activeIndex === resultIndex ? "true" : "false"}
                        href={result.href}
                        id={resultId}
                        onClick={closeForNavigation}
                        onFocus={() => setActiveIndex(resultIndex)}
                        onMouseEnter={() => setActiveIndex(resultIndex)}
                        prefetch={false}
                        ref={(element) => {
                          resultRefs.current[resultIndex] = element;
                        }}
                      >
                        <span className="global-search-result-kind">{kindLabels[result.kind]}</span>
                        <span className="global-search-result-primary">{result.primary}</span>
                        <span className="global-search-result-reading">{result.reading}</span>
                        <span className="global-search-result-meaning">{result.meaning}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {state === "error" ? (
              <div className="global-search-error-actions">
                <button className="button-primary" onClick={requestIndex} type="button">
                  重试
                </button>
                <Link
                  className="button-quiet"
                  href="/vocabulary"
                  onClick={closeForNavigation}
                  prefetch={false}
                >
                  去单词目录
                </Link>
                <Link
                  className="button-quiet"
                  href="/grammar"
                  onClick={closeForNavigation}
                  prefetch={false}
                >
                  去语法目录
                </Link>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

export function MobileNavigation({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigationId = useId();

  return (
    <>
      <button
        aria-controls={navigationId}
        aria-expanded={isOpen}
        aria-label={isOpen ? "关闭主导航" : "打开主导航"}
        className="site-menu-toggle"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        {isOpen ? (
          <X aria-hidden="true" size={22} strokeWidth={1.7} />
        ) : (
          <MenuIcon aria-hidden="true" size={22} strokeWidth={1.7} />
        )}
      </button>
      <nav
        aria-label="主导航"
        className="site-navigation"
        data-open={isOpen ? "true" : "false"}
        id={navigationId}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("a")) setIsOpen(false);
        }}
      >
        {children}
      </nav>
    </>
  );
}
