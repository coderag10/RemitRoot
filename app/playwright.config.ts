import { defineConfig, devices } from "@playwright/test";

// Runs against a running app: `yarn dev` or `yarn start` locally, or the public URL with BASE_URL.
export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    ...devices["iPhone 13"],
    browserName: "chromium",
    viewport: { width: 375, height: 812 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  outputDir: "e2e/.results",
});
