import { expect, test } from "@playwright/test";

test("guest completes the static learning path", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /ことのは/ })).toBeVisible();

  await page.getByRole("link", { name: "单词", exact: true }).click();
  await page.locator('a[href="/vocabulary/verbs"]').click();
  await page
    .locator('a[href="/vocabulary/entry/vocabulary%3Ajmdict%3A1436730"]')
    .click();

  await expect(page.getByRole("heading", { name: "諦める" })).toBeVisible();
  await page.getByRole("button", { name: "认识", exact: true }).click();
  await expect(page.getByText("已记录，下次继续。", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "来源与许可", exact: true }).click();
  await expect(page.getByRole("heading", { name: "非商业使用声明" })).toBeVisible();
});
