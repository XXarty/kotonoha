import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    )
    .toBe(true);
}

async function expectMinimumTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box, "interactive control should have a rendered box").not.toBeNull();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
}

test("home reports the verified release and the responsive header remains usable", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "今天，也为自己留一点语言的时间。" }),
  ).toBeVisible();
  await expect(page.getByText("10,000 条词汇", { exact: true })).toBeVisible();
  await expect(page.getByText("120 个语法单元", { exact: true })).toBeVisible();
  await expect(page.getByText("46 个五十音字符", { exact: true })).toBeVisible();

  const searchTrigger = page.getByRole("button", { name: "搜索全站内容" });
  await expectMinimumTouchTarget(searchTrigger);
  const width = page.viewportSize()?.width ?? 1440;
  if (width <= 720) {
    const menu = page.getByRole("button", { name: "打开主导航" });
    await expect(menu).toBeVisible();
    await expectMinimumTouchTarget(menu);
    await expect(page.getByRole("navigation", { name: "主导航" })).not.toBeVisible();
    await menu.click();
    await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
    await expect(page.getByRole("link", { name: "单词", exact: true })).toBeVisible();
  } else {
    await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
    await expect(page.getByRole("button", { name: "打开主导航" })).not.toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
});

test("global and legacy search find a real public word without leaving stale URL state", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1024", "full search flow runs once");
  await page.goto("/");
  await page.getByRole("button", { name: "搜索全站内容" }).click();
  await expectMinimumTouchTarget(page.getByRole("button", { name: "关闭搜索" }));
  const searchbox = page.getByRole("searchbox", { name: "搜索内容" });
  await searchbox.fill("灯す");
  const result = page.locator(".global-search-result", { hasText: "灯す" }).first();
  await expect(result).toBeVisible();
  await expect(result).toContainText("ともす");
  await expect(result).toHaveAttribute(
    "href",
    "/vocabulary/entry/vocabulary%3Ajmdict%3A1582140",
  );
  await page.getByRole("button", { name: "关闭搜索" }).click();

  await page.goto(`/search?q=${encodeURIComponent("灯す")}`);
  await expect(page).toHaveURL(
    new RegExp(`\\/?search=1&q=${encodeURIComponent("灯す")}$`),
  );
  await expect(page.getByRole("dialog", { name: "搜索日语内容" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "搜索内容" })).toHaveValue("灯す");
  await page.getByRole("button", { name: "关闭搜索" }).click();
  await expect(page).toHaveURL("/");
  await expectNoHorizontalOverflow(page);
});

test("vocabulary tiers and pagination expose bounded real result pages", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1024", "full vocabulary flow runs once");
  await page.goto("/vocabulary/nouns?tier=core&page=2");

  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "日常核心" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText(/第 2 \/ \d+ 页 · 共 \d+ 条/)).toBeVisible();
  await expect(page.locator(".entry-list > li")).toHaveCount(60);
  await expect(page.getByRole("navigation", { name: "词汇分页" })).toBeVisible();
  await expect(page.getByRole("link", { name: "上一页" })).toHaveAttribute(
    "href",
    /tier=core&page=1$/,
  );
  await expectNoHorizontalOverflow(page);
});

test("all four grammar paths lead to expanded sourced detail", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1024", "full grammar flow runs once");
  await page.goto("/grammar");

  for (const [name, href] of [
    ["基础", "/grammar/foundation"],
    ["核心", "/grammar/core"],
    ["常用表达", "/grammar/expressions"],
    ["进阶", "/grammar/advanced"],
  ] as const) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveAttribute(
      "href",
      href,
    );
  }

  await page.goto("/grammar/core");
  await expect(page.locator(".entry-list > li")).toHaveCount(30);
  await page.goto("/grammar/entry/morau");
  await expect(page.getByRole("heading", { level: 1, name: "もらう/~てもらう" })).toBeVisible();
  for (const section of ["接续", "说明", "容易混淆的地方", "例句", "一起比较", "来源"]) {
    await expect(page.getByRole("heading", { name: section, exact: true })).toBeVisible();
  }
  await expect(page.getByText("老师帮我修改了作文。", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("kana and guest review remain public without Neon", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1024", "full public flow runs once");
  await page.goto("/kana");
  await expect(page.getByRole("heading", { level: 1, name: "五十音" })).toBeVisible();
  await expect(page.locator(".kana-card")).toHaveCount(46);
  await expectNoHorizontalOverflow(page);

  await page.goto("/review");
  await expect(page.getByRole("heading", { level: 1, name: "复习" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "把会的，轻轻留下来" })).toBeVisible();
  await expect(page.getByRole("link", { name: "登录查看进度" })).toHaveAttribute(
    "href",
    "/sign-in?next=/review",
  );
  await expect(page.getByRole("link", { name: "继续学单词" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
