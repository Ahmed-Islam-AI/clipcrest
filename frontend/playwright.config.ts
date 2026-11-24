/* End-to-end parity tests: they click through the real pages the way a person does, against two throwaway
   ClipCrest servers. They are written against the old plain-HTML pages in web/ and must pass, unchanged, against
   the React pages too. That is how we know no feature was lost. See e2e/README.md.

   npm run e2e       run everything
   npm run e2e:ui    the Playwright window, to watch or pick single tests

   Locally the tests use the Microsoft Edge already on the computer, so nothing has to be downloaded. On CI they use
   Playwright's own Chromium, which CI must install first:  npx playwright install --with-deps chromium

   The servers need Python (through uv) and ffmpeg on the PATH, like ClipCrest itself. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

// This file is read again by every test worker. Ports and folders are chosen once, in the first read, and kept in
// the environment, which the workers inherit, so every worker talks to the same two servers.
function freePort(): number {
  const pick = "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})";
  return Number(execFileSync(process.execPath, ["-e", pick]).toString());   // a port the system has free (never 8765-8800)
}
const env = process.env;
env.E2E_PORT_LOCAL ||= String(freePort());
env.E2E_PORT_ACCOUNTS ||= String(freePort());
env.E2E_DATA_LOCAL ||= fs.mkdtempSync(path.join(os.tmpdir(), "clipcrest-e2e-local-"));
env.E2E_DATA_ACCOUNTS ||= fs.mkdtempSync(path.join(os.tmpdir(), "clipcrest-e2e-accounts-"));

// What both servers share: a fresh, empty data folder each, and nothing that reaches outside this computer.
function server(port: string, data: string, extra: Record<string, string>) {
  const url = `http://127.0.0.1:${port}`;
  return {
    command: "uv run --frozen python -m studio.server",
    cwd: "..",
    url: url + "/healthz",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      CLIPCREST_DATA: data, CLIPCREST_STORAGE_FILE: path.join(data, "storage.json"),   // never the real storage.json
      CLIPCREST_PORT: port, CLIPCREST_HOST: "127.0.0.1", CLIPCREST_PUBLIC_URL: url,
      CLIPCREST_UPDATE_CHECK: "0", CLIPCREST_FETCH_MODEL: "0", CLIPCREST_AUTO_RELOAD: "0", CLIPCREST_OPEN_BROWSER: "0",
      DATABASE_URL: "", CLIPCREST_SMTP_HOST: "", CLIPCREST_BREVO_API_KEY: "", CLIPCREST_BREVO_API_KEY_FILE: "",
      GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", GOOGLE_CLIENT_FILE: "",
      CLIPCREST_AI_KEY: "", CLIPCREST_AI_KEY_FILE: "", CLIPCREST_AI_MODELS: "",
      CLIPCREST_EARN_URL: "", CLIPCREST_EARN_ONLY: "0", CLIPCREST_LOCAL_EARN: "",
      // small pieces, so the test video goes up in pieces; and a size limit, so the "too big" message can be seen
      CLIPCREST_UPLOAD_PART_MB: "5", CLIPCREST_MAX_UPLOAD_MB: "64",
      // Offline on purpose: anything the server tries to fetch from the internet (the speech model, a YouTube
      // link, an AI service) fails at once, as it would with no connection, instead of downloading for real.
      HTTP_PROXY: "http://127.0.0.1:9", HTTPS_PROXY: "http://127.0.0.1:9", ALL_PROXY: "http://127.0.0.1:9",
      http_proxy: "http://127.0.0.1:9", https_proxy: "http://127.0.0.1:9", NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost",
      PYTHONIOENCODING: "utf-8", PYTHONUNBUFFERED: "1",
      ...extra,
    },
  };
}

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: env.CI ? 1 : 0,
  forbidOnly: !!env.CI,
  reporter: env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    channel: env.CI ? undefined : "msedge",
    locale: "en-US",
    permissions: ["clipboard-read", "clipboard-write"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    server(env.E2E_PORT_LOCAL, env.E2E_DATA_LOCAL, { CLIPCREST_ACCOUNTS: "0" }),
    // Sign-in on. Emails need no confirming. The servers sit behind no proxy, but each test says it comes from its
    // own address (X-Forwarded-For, see e2e/fixtures.ts), so the limits per address (8 sign-ups an hour) are not
    // shared by every test.
    server(env.E2E_PORT_ACCOUNTS, env.E2E_DATA_ACCOUNTS, { CLIPCREST_ACCOUNTS: "1", CLIPCREST_VERIFY_EMAIL: "0", CLIPCREST_TRUST_PROXY: "1" }),
  ],
  projects: [
    {
      name: "local",            // sign-in off, the default: one built-in owner, shared by every test, so one at a time
      workers: 1,
      use: { baseURL: `http://127.0.0.1:${env.E2E_PORT_LOCAL}`, mode: "local", dataDir: env.E2E_DATA_LOCAL },
    },
    {
      name: "accounts",         // sign-in on: every test signs up its own new account, so tests can run side by side
      fullyParallel: true,
      use: { baseURL: `http://127.0.0.1:${env.E2E_PORT_ACCOUNTS}`, mode: "accounts", dataDir: env.E2E_DATA_ACCOUNTS },
    },
  ],
});
