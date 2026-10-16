import { execSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { startDemo } from "./helpers";

// Needs a short series (a few minutes to maturity) and the admin key, which is its issuer:
//   E2E_SHORT_SERIES=<id> E2E_SHORT_NAME="<name>" yarn e2e redeem
const SERIES = process.env.E2E_SHORT_SERIES;
const NAME = process.env.E2E_SHORT_NAME ?? "";

test.skip(!SERIES || !NAME, "set E2E_SHORT_SERIES and E2E_SHORT_NAME to a series that matures within a few minutes");

test("a saver redeems savings plus interest after maturity", async ({ page }) => {
  test.setTimeout(600_000);
  await startDemo(page, `/send`);
  await page.getByLabel("Amount in test dollars", { exact: true }).fill("200");
  await page.getByRole("spinbutton", { name: "Savings share" }).fill("50");
  await page.getByRole("radio", { name: new RegExp(NAME) }).check();
  await page.getByRole("button", { name: "Send $200.00" }).click();
  await expect(page.getByRole("region", { name: "Sent" })).toBeVisible({ timeout: 90_000 });

  const savings = page.getByRole("region", { name: "Your savings" });
  const redeem = savings.getByRole("button", { name: "Redeem savings and interest" });
  await expect(redeem).toBeVisible({ timeout: 480_000 });

  // The vault holds principal only until the issuer repays: the refusal is explained.
  await redeem.click();
  await expect(page.getByRole("alert").filter({ hasText: "The vault does not hold enough" }).first()).toBeVisible({ timeout: 90_000 });

  const root = path.resolve(__dirname, "..", "..");
  execSync(`yarn -s issuer repay --series ${SERIES} --usd 1`, { cwd: root, env: process.env, stdio: "inherit" });
  await redeem.click();
  await expect(savings).toContainText(/Redeemed \$100\.\d\d to your wallet|Nothing saved yet/, { timeout: 90_000 });
});
