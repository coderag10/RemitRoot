import { expect, test } from "@playwright/test";
import { BANNER, expectNoHorizontalScroll, watchConsole } from "./helpers";

const PAGES = ["/", "/send", "/family", "/bond", "/bond/0", "/history", "/issuer"];

test("every page shows the prototype banner and fits a phone", async ({ page }) => {
  const errors = watchConsole(page);
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.getByRole("note")).toHaveText(BANNER);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await expectNoHorizontalScroll(page);
  }
  expect(errors).toEqual([]);
});

test("the language toggle switches every label to Nepali and remembers it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "ने" }).click();
  await expect(page.getByRole("note")).toHaveText("शैक्षिक प्रोटोटाइप · सोलाना परीक्षण नेटवर्क · वास्तविक पैसा होइन");
  await expect(page.locator("html")).toHaveAttribute("lang", "ne");
  await expect(page.getByRole("button", { name: "डेमो चलाएर हेर्नुहोस्" })).toBeVisible();
  await page.goto("/bond");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("बचतपत्र");
  await expectNoHorizontalScroll(page);
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Savings bonds");
});

test("the public bond page reads the series from chain", async ({ page }) => {
  await page.goto("/bond/0");
  await expect(page.getByText(/Raised \$[\d,.]+ of \$[\d,]+/).first()).toBeVisible();
  await expect(page.getByText("Can the vault pay savers?")).toBeVisible();
  await expect(page.getByText("Where the money went")).toBeVisible();
  await page.goto("/bond/999");
  await expect(page.getByRole("alert").filter({ hasText: "does not exist" })).toBeVisible();
});

test("the issuer page asks for the issuer's wallet", async ({ page }) => {
  await page.goto("/issuer");
  await expect(page.getByText("Connect the issuer's wallet")).toBeVisible();
});
