import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  use: {
    slowMo: 500,
    screenshot: "only-on-failure", // 'on', 'off', 'only-on-failure'
    video: "on", // 'on', 'off', 'on-first-retry', 'retain-on-failure'
    viewport: { width: 1280, height: 720 },
  },
  outputDir: "test-results/",

  reporter: [
    ["list"],
    [
      "playwright-qase-reporter",
      {
        mode: "report", // testops,report
        debug: false,
        testops: {
          api: {
            token: process.env.QASE_API_TOKEN || "<your-api-token>",
          },
          project: process.env.QASE_TESTOPS_PROJECT || "<your-project-code>",
          uploadAttachments: true,
          run: {
            title: "Version 1 Test Run",
            description: "Automated Test Run by Playwright",
            complete: true,
          },
          environment: "prod",
        },
      },
    ],
  ],
});
