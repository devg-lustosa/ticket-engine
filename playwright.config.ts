import { defineConfig } from "@playwright/test";

if (!process.env.TICKET_ENGINE_BROWSER_RUN) throw new Error("Execute npm run test:browser para criar um ambiente próprio e descartável.");

export default defineConfig({
  testDir: "./test/browser",
  testMatch: "**/*.spec.ts",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://localhost:3101", browserName: "chromium", trace: "off", video: "off", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "celular", use: { viewport: { width: 375, height: 812 } } },
  ],
});
