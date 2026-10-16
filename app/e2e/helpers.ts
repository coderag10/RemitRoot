import { expect, type Page } from "@playwright/test";

export const BANNER = "Educational prototype · Solana test network · No real money";

/** The page fits a 375px phone screen with no sideways scrolling. */
export async function expectNoHorizontalScroll(page: Page) {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width, "page scrolls sideways").toBeLessThanOrEqual(375);
}

/** Collects console errors, ignoring rate-limit retries from the public RPC. */
export function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !/429|Too Many Requests|WebSocket|ws error/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/** "Try the demo" from the landing page, landing on /send with a funded practice wallet. */
export async function startDemo(page: Page, path = "/") {
  await page.goto(path);
  await page.getByRole("button", { name: "Try the demo" }).first().click();
  await expect(page.getByRole("button", { name: /^Send \$/ })).toBeVisible({ timeout: 90_000 });
}
