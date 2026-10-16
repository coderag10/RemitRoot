import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, startDemo, watchConsole } from "./helpers";

test("a visitor with no wallet sends money home and saves, in well under two minutes", async ({ page }) => {
  const errors = watchConsole(page);
  const started = Date.now();
  await startDemo(page);
  await expect(page.getByText("$1,000.00")).toBeVisible();

  // Choose 15% of $200.
  await page.getByLabel("Amount in test dollars", { exact: true }).fill("200");
  await page.getByRole("spinbutton", { name: "Savings share" }).fill("15");
  await expect(page.getByText("$170.00").first()).toBeVisible();
  await expect(page.getByText("$30.00").first()).toBeVisible();
  await expect(page.getByText("In 12 months at this rate")).toBeVisible();

  await page.getByRole("button", { name: "Send $200.00" }).click();
  const sent = page.getByRole("region", { name: "Sent" });
  await expect(sent).toBeVisible({ timeout: 90_000 });
  await expect(sent).toContainText("$170.00 → Family");
  await expect(sent).toContainText("$30.00 →");
  expect((Date.now() - started) / 1000, "core flow took too long").toBeLessThan(120);
  await expectNoHorizontalScroll(page);

  // Balances and savings reflect the transfer.
  await expect(page.getByText("$800.00")).toBeVisible();
  const savings = page.getByRole("region", { name: "Your savings" });
  await expect(savings).toContainText("$30.00");
  await expect(savings).toContainText("Transfers");

  // The practice wallet survives a refresh mid-flow.
  await page.reload();
  await expect(page.getByRole("region", { name: "Your savings" })).toContainText("$30.00", { timeout: 60_000 });

  // History lists the transfer.
  await expect(page.getByRole("region", { name: "Recent activity" })).toContainText("Sent $200.00", { timeout: 60_000 });

  // The family sees the money and the savings.
  await page.getByRole("link", { name: "Family" }).first().click();
  await expect(page.getByRole("heading", { name: "Family view" })).toBeVisible();
  await expect(page.getByText("$170.00").first()).toBeVisible({ timeout: 60_000 });
  const familySavings = page.getByRole("region", { name: "Family savings" });
  await expect(familySavings).toContainText("$30.0");
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("a 0% transfer sends everything to the family and saves nothing", async ({ page }) => {
  await startDemo(page);
  await page.getByLabel("Amount in test dollars", { exact: true }).fill("50");
  await page.getByRole("spinbutton", { name: "Savings share" }).fill("0");
  await page.getByRole("button", { name: "Send $50.00" }).click();
  const sent = page.getByRole("region", { name: "Sent" });
  await expect(sent).toContainText("$50.00 → Family", { timeout: 90_000 });
  await expect(page.getByRole("region", { name: "Your savings" })).toContainText("Nothing saved yet");
});

test("problems are explained before anything is sent", async ({ page }) => {
  await startDemo(page);
  await page.getByLabel("Amount in test dollars", { exact: true }).fill("5000");
  await expect(page.getByText("You have $1,000.00. Enter a smaller amount")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send $5,000.00" })).toBeDisabled();
  await page.getByLabel("Amount in test dollars", { exact: true }).fill("abc");
  await expect(page.getByText("Enter an amount greater than zero.")).toBeVisible();
});

test("a savings goal is saved with the rule and shows progress", async ({ page }) => {
  await startDemo(page);
  await page.getByRole("button", { name: "Add a savings goal" }).click();
  await page.getByText("School fees", { exact: true }).click();
  await page.getByLabel("Goal amount in test dollars").fill("100");
  await page.getByLabel("Amount in test dollars", { exact: true }).fill("200");
  await page.getByRole("spinbutton", { name: "Savings share" }).fill("25");
  await page.getByRole("button", { name: "Send $200.00" }).click();
  await expect(page.getByRole("region", { name: "Sent" })).toBeVisible({ timeout: 90_000 });
  const savings = page.getByRole("region", { name: "Your savings" });
  await expect(savings).toContainText("School fees");
  await expect(savings).toContainText("$50.00 of $100.00");
});
