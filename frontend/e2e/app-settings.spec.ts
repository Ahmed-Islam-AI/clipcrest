/* Settings: AI, Profile, Security, Connected apps and Storage. The real server answers everything it can offline;
   AI keys, app keys and the storage folder are server-wide, so writes that would change them for every other test
   are answered here instead (and checked). */
import { createCreator, dialog, expect, fakeWrite, fixture, meButton, menuItem, mockSync, openApp, patchStatus, test, title, uid } from "./fixtures";

test.describe("AI", () => {
  test("[APP-SET-01, APP-SET-02, APP-SET-04, APP-SET-05, APP-SET-06, APP-SET-07, APP-SET-08, APP-SET-09] choosing a service, finding models and testing without a key", async ({ page, admin, mode }) => {
    void admin;
    await openApp(page, "/app/settings/ai", "Settings");
    const sections = page.getByRole("navigation", { name: "Settings sections" });
    await expect(sections.getByRole("link")).toHaveText(mode === "local"
      ? [/AI\s*Your AI service, model and key/, /Connected apps\s*Where your clips get posted/, /Storage\s*Where videos and clips are kept/]
      : [/AI/, /Profile\s*Your name, email and how you sign in/, /Security\s*Password and signing out/, /Connected apps/, /Storage/]);
    await expect(page.getByText(mode === "local" ? "Your AI key and connected apps." : "Your profile, security and connected apps.")).toBeVisible();
    await expect(page.getByText("Not set up", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("Choose a service, paste your key and pick a model.")).toBeVisible();
    const service = page.getByLabel("AI service");
    await expect(service).toHaveValue("gemini");
    await expect(page.getByLabel("Key")).toHaveAttribute("placeholder", "Paste your key");
    await expect(page.getByRole("link", { name: "aistudio.google.com/apikey" })).toHaveAttribute("target", "_blank");
    await expect(page.getByText("The key stays on this server and is never shown again.")).toBeVisible();
    await expect(page.getByLabel("Address")).toBeHidden();                       // only for a custom service
    await expect(page.getByLabel("Model")).toHaveAttribute("placeholder", "For example gemini-2.5-flash");
    // Find models: offline, the service can't be reached, and the page says so
    await page.getByRole("button", { name: "Find models" }).click();
    await expect(page.getByText(/^The service did not give its list of models\./)).toBeVisible({ timeout: 30_000 });
    // a mocked list fills the suggestions
    await page.route(u => u.pathname === "/api/ai/models", r => r.fulfill({ json: { models: ["gemini-2.5-flash", "gemini-2.5-pro"] } }));
    await page.getByRole("button", { name: "Find models" }).click();
    await expect(page.getByText("2 models found. Click the model box to pick one.")).toBeVisible();
    await expect(page.getByLabel("Model")).toBeFocused();
    // another service changes the hints; custom shows the address
    await service.selectOption({ label: "Ollama (on this machine)" });
    await expect(page.getByLabel("Key")).toHaveAttribute("placeholder", "Not needed");
    await expect(page.getByText(/^Set it up at/)).toBeVisible();
    await service.selectOption({ label: "Custom (OpenAI-compatible)" });
    await expect(page.getByLabel("Address")).toBeVisible();
    await expect(page.getByLabel("Address")).toHaveAttribute("placeholder", "http://127.0.0.1:1234/v1");
    await expect(page.getByText("Where the service answers. Only needed for a custom service.")).toBeVisible();
    await service.selectOption("gemini");
    // Save and test with no model, then no key: the server says what is missing, and nothing is saved
    const saved = page.waitForRequest(r => r.method() === "PUT" && r.url().endsWith("/api/ai"));
    await page.getByLabel("Model").fill("");
    await page.getByRole("button", { name: "Save and test" }).click();
    expect((await saved).postDataJSON()).toMatchObject({ provider: "gemini", key: "", models: "" });
    await expect(page.getByText("Enter the model to use.")).toBeVisible();
    await page.getByLabel("Model").fill("gemini-2.5-flash");
    await page.getByRole("button", { name: "Save and test" }).click();
    await expect(page.getByText("Paste the key for this service.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save and test" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Test again" })).toHaveCount(0);
  });

  test("[APP-SET-04, APP-SET-09] a test that answers: the AI is ready", async ({ page, admin }) => {
    void admin;
    await page.route(u => u.pathname === "/api/ai", async (r, req) => {
      if (req.method() === "PUT") return r.fulfill({ json: { ok: true } });
      const real = await (await r.fetch()).json();
      await r.fulfill({ json: { ...real, ready: true, label: "Gemini", models: ["gemini-2.5-flash"], has_key: true, key_hint: "WXYZ" } });
    });
    await page.route(u => u.pathname === "/api/ai/test", r => r.fulfill({ json: { ok: true, model: "gemini-2.5-flash", tokens: 9, answer: "[\"ok\"]" } }));
    await openApp(page, "/app/settings/ai", "Settings");
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    await expect(page.getByText("Gemini · gemini-2.5-flash")).toBeVisible();
    await expect(page.getByLabel("Key")).toHaveAttribute("placeholder", "Saved, ends in WXYZ. Paste a new key to replace it");
    await page.getByRole("button", { name: "Save and test" }).click();
    await expect(page.getByText("Saved. gemini-2.5-flash answered, so the AI is ready.")).toBeVisible();
    await page.getByRole("button", { name: "Test again" }).click();
    await expect(page.getByText("Saved. gemini-2.5-flash answered, so the AI is ready.").nth(1)).toBeVisible();
  });
});

test.describe("profile and security", () => {
  test.skip(({ mode }) => mode === "local", "there is no profile or password with sign-in off");

  test("[APP-SET-10] the profile shows who you are", async ({ page, user }) => {
    await openApp(page, "/app/settings/profile", "Settings");
    await expect(page.getByRole("heading", { level: 2, name: "Profile" })).toBeVisible();
    await expect(page.getByText("This is how you appear in ClipCrest.")).toBeVisible();
    await expect(page.getByText(user!.name, { exact: true }).last()).toBeVisible();
    for (const t of ["Confirmed", "Email and password", "Standard"]) await expect(page.getByText(t, { exact: true })).toBeVisible();
    const today = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
    await expect(page.getByText(today)).toBeVisible();
  });

  test("[APP-SET-10, APP-SET-11] a Google account: no password yet", async ({ page, user }) => {
    void user;
    await patchStatus(page, s => { s.user.google = true; s.user.has_password = false; });
    await openApp(page, "/app/settings/profile", "Settings");
    await expect(page.getByText("Google", { exact: true })).toBeVisible();
    await expect(page.getByText("Your name and picture come from your Google account.")).toBeVisible();
    await page.getByRole("link", { name: /Security/ }).click();
    await expect(page.getByText("You sign in with Google. You can also set a password, to sign in with your email.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Set password" })).toBeVisible();
    await expect(page.getByLabel("Current password")).toHaveCount(0);
  });

  test("[APP-SET-11, APP-SET-12, APP-ACCT-04] changing the password, and signing out from Security", async ({ page, user }) => {
    await openApp(page, "/app/settings/security", "Settings");
    await expect(page.getByRole("link", { name: "Forgot it?" })).toHaveAttribute("href", "/reset");
    await expect(page.getByLabel("New password")).toHaveAttribute("placeholder", "At least 8 characters");
    await page.getByLabel("Current password").fill("not-my-password");
    await page.getByLabel("New password").fill("another-pass-456");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Your current password is not right.")).toBeVisible();
    await page.getByLabel("Current password").fill(user!.password);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Password changed. Other devices were signed out.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Sessions" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    const r = await page.request.post("/api/auth/login", { data: { email: user!.email, password: "another-pass-456" } });
    expect(r.ok()).toBeTruthy();
  });

  test("[APP-SET-13, APP-SHELL-06] deleting the account needs the email typed", async ({ page, user }) => {
    await createCreator(page.request, "Gone " + uid());
    await openApp(page, "/app/settings/security", "Settings");
    await page.getByRole("button", { name: "Delete my account" }).click();
    const d = dialog(page, "Delete your account?");
    await expect(d).toContainText("This removes your account and everything in it for good: creators, recordings, videos, clips, connected accounts and history.");
    await expect(d).toContainText(`Type ${user!.email} to confirm`);
    const ok = d.getByRole("button", { name: "Delete my account" });
    await expect(ok).toBeDisabled();
    await d.getByRole("textbox").fill(user!.email.toUpperCase());
    await ok.click();
    await expect(page).toHaveURL(/\/$/);
    const r = await page.request.post("/api/auth/login", { data: { email: user!.email, password: user!.password } });
    expect(r.ok()).toBeFalsy();
  });
});

test.describe("connected apps", () => {
  test("[APP-SET-14, APP-SET-16, APP-SET-17] the owner sets up a platform", async ({ page, admin }) => {
    void admin;
    await openApp(page, "/app/settings/apps", "Settings");
    await expect(page.getByText(/^Connect the accounts ClipCrest posts clips to:/)).toBeVisible();
    for (const t of ["Post clips to your channel as Shorts.", "Post clips as Reels. Needs a Creator or Business account.", "Post clips straight to your TikTok."])
      await expect(page.getByText(t)).toBeVisible();
    await expect(page.getByRole("button", { name: "Set up", exact: true })).toHaveCount(3);
    await page.getByRole("button", { name: "Set up", exact: true }).first().click();
    await expect(page.getByRole("link", { name: "Google Cloud" })).toHaveAttribute("href", "https://console.cloud.google.com/apis/credentials");
    const redirect = page.getByText(/\/oauth\/youtube\/callback$/);
    await expect(redirect).toBeVisible();
    await page.getByRole("button", { name: "Copy", exact: true }).click();
    await expect(page.getByText("Copied", { exact: true })).toBeVisible();
    const saved = await fakeWrite(page, "PUT", /^\/api\/apps$/);
    await page.getByLabel("Client ID").fill("my-client-id");
    await page.getByLabel("Client secret").fill("my-client-secret");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved. People can connect now.")).toBeVisible();
    expect(saved[0].body).toEqual({ platform: "youtube", client_id: "my-client-id", client_secret: "my-client-secret" });
    // Instagram and TikTok need https: this test server is plain http
    await page.getByRole("button", { name: "Set up", exact: true }).nth(1).click();
    await expect(page.getByText("Instagram only accepts https addresses. Put ClipCrest on a domain with https (or a tunnel) and set CLIPCREST_PUBLIC_URL to it first.")).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByText(/^Instagram only accepts https/)).toBeHidden();
  });

  test("[APP-SET-15, APP-SET-16] connected accounts, Connect links and Disconnect", async ({ page, admin }) => {
    void admin;
    await patchStatus(page, s => { s.connect = { youtube: true, instagram: true, tiktok: true }; });
    await mockSync(page, { v: "fx", unread: 0, jobs: [], creators: [], accounts: fixture("accounts") });
    const removed = await fakeWrite(page, "DELETE", /^\/api\/accounts\/[^/]+$/);
    await openApp(page, "/app/settings/apps", "Settings");
    await expect(page.getByRole("link", { name: "Add another" }).first()).toHaveAttribute("href", "/oauth/youtube/start");
    await expect(page.getByRole("link", { name: "Connect", exact: true })).toHaveAttribute("href", "/oauth/tiktok/start");
    await expect(page.getByRole("button", { name: "Change this server's YouTube app" })).toBeVisible();
    await expect(page.getByText("My Channel", { exact: true })).toBeVisible();
    await expect(page.getByText("Connected", { exact: true })).toHaveCount(2);
    await page.getByRole("button", { name: "Disconnect" }).first().click();
    const d = dialog(page, "Disconnect this account?");
    await expect(d).toContainText("Posts still waiting for it will fail.");
    await d.getByRole("button", { name: "Disconnect" }).click();
    await expect.poll(() => removed.length).toBe(1);
    expect(removed[0].url).toMatch(/\/api\/accounts\/acc_yt$/);
  });
});

test.describe("storage", () => {
  test("[APP-SET-18, APP-SET-19, APP-SET-22] the real folder: fixed by CLIPCREST_DATA, with the drive's numbers", async ({ page, admin, mode }) => {
    void admin;
    await openApp(page, "/app/settings/storage", "Settings");
    await expect(page.getByRole("heading", { level: 2, name: "Storage" })).toBeVisible();
    await expect(page.getByText(/clipcrest-e2e-/)).toBeVisible();
    await expect(page.getByRole("img", { name: /^\d+% of the drive is used$/ })).toBeVisible();
    await expect(page.getByText(/^ClipCrest uses [\d.,]+ GB$/)).toBeVisible();
    await expect(page.getByText(/ GB free of [\d.,]+ GB on /)).toBeVisible();
    await expect(page.getByText("This folder is set with CLIPCREST_DATA in the .env file. Change it there, or remove that line to choose it here.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Change folder" })).toHaveCount(0);
    // a folder window can only open on the computer ClipCrest runs on (sign-in on here sits "behind a proxy")
    await expect(page.getByRole("button", { name: "Open folder" })).toHaveCount(mode === "local" ? 1 : 0);
    if (mode === "local") {
      const opened = await fakeWrite(page, "POST", /^\/api\/storage\/open$/);
      await page.getByRole("button", { name: "Open folder" }).click();
      await expect.poll(() => opened.length).toBe(1);
    }
  });

  test("[APP-SET-19, APP-SET-20, APP-SET-21, APP-SET-23] a full drive, a change waiting for a restart, and choosing a new folder", async ({ page, admin }) => {
    void admin;
    await page.route(u => u.pathname === "/api/storage", (r, req) => req.method() === "GET" ? r.fulfill({ json: fixture("storage") }) : r.fallback());
    const put = await fakeWrite(page, "PUT", /^\/api\/storage$/);
    await page.route(u => u.pathname === "/api/storage/pick", r => r.fulfill({ json: { path: "F:\\Picked" } }));
    await openApp(page, "/app/settings/storage", "Settings");
    await expect(page.getByText("This drive is almost full, so ClipCrest can't take new videos.")).toBeVisible();
    await expect(page.getByText(/1\.5 GB free on D:\\; it needs at least 3 GB\./)).toBeVisible();
    await expect(page.getByText("The folder changes to E:\\Clips the next time ClipCrest starts.")).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Kept the current folder")).toBeVisible();
    expect(put[0].body).toEqual({ cancel: true });
    await page.getByRole("button", { name: "Change folder" }).click();
    const folder = page.getByLabel("New folder");
    await expect(folder).toHaveAttribute("placeholder", "For example D:\\ClipCrest");
    await expect(page.getByRole("checkbox", { name: "Move everything that is in the current folder there too" })).toBeChecked();
    await expect(page.getByText("The change happens the next time ClipCrest starts, so nothing is moved while a video is being made.")).toBeVisible();
    await page.getByRole("button", { name: "Browse" }).click();
    await expect(folder).toHaveValue("F:\\Picked");
    await page.getByRole("button", { name: "Use this folder" }).click();
    await expect(page.getByText("Saved. Close ClipCrest and start it again to switch to the new folder.")).toBeVisible();
    expect(put[1].body).toEqual({ path: "F:\\Picked", move: true });
  });

  test("[APP-SET-03, APP-ERR-14] a section that fails to load shows why", async ({ page, admin }) => {
    void admin;
    await page.route(u => u.pathname === "/api/storage", r => r.fulfill({ status: 500, json: { detail: "The disk did not answer." } }));
    await openApp(page, "/app/settings/storage", "Settings");
    await expect(page.getByText("The disk did not answer.")).toBeVisible();
  });
});

test("[APP-SET-01, APP-ROUTE-03] Settings sections are links that move between sections", async ({ page, user }) => {
  void user;
  await openApp(page, "/app/settings/apps", "Settings");
  await meButton(page).click();
  await expect(menuItem(page, "Settings")).toBeVisible();
  await page.keyboard.press("Escape");
  const sections = page.getByRole("navigation", { name: "Settings sections" });
  const first = sections.getByRole("link").first();
  await expect(first).toHaveAttribute("href", /^\/app\/settings\/(ai|profile)$/);
  await first.click();
  await expect(page).toHaveURL(/\/app\/settings\/(ai|profile)$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/settings\/apps$/);
  await expect(title(page)).toHaveText("Settings");
});
