import { defineConfig, devices } from "@playwright/test";

const frontend = "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./e2e",
  // The browser projects share the same seeded resources and booking windows.
  workers: 1,
  use: {
    baseURL: frontend,
    timezoneId: "UTC",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: [
    {
      name: "Express API",
      command: "npm run dev:lab",
      url: "http://127.0.0.1:3000/api/v1/health",
      reuseExistingServer: false,
      timeout: 180_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
    {
      name: "React frontend",
      command:
        "npm --prefix client run dev -- --host 127.0.0.1 --port 5173 --strictPort",
      url: frontend,
      env: { VITE_API_BASE_URL: "/api/v1" },
      reuseExistingServer: false,
    },
  ],
});
