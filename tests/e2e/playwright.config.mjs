// Browser tests of the main journeys, on the test copy (fake backend from tests/mock-supabase.js, nothing touches the
// real database). Run with `pnpm e2e`. CI installs Chromium; locally, PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers works.
import { defineConfig } from "playwright/test";

const port = Number(process.env.E2E_PORT || 4195);
const out = process.env.E2E_OUT || ".e2e-site";
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.mjs",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: { baseURL: `http://127.0.0.1:${port}/`, locale: "en-GB", trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: false } },
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: `MOCK=1 OUT=${out} node scripts/build.mjs && node scripts/serve.mjs ${out} ${port}`,
    cwd: "../..",
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
