/* The rest of the app: the guided tour, banners, AI usage, the notification bell, feedback, toasts, errors and
   polling. Notifications are real (feedback sent through the API makes one for every admin); banners for a broken
   or outdated server come from a patched /api/status. */
import { bell, copied, dialog, expect, fixture, linkBox, meButton, menu, menuItem, navItem, newUser, openApp, patchStatus, signUp, sidebar, test, title, uid } from "./fixtures";

const TOUR = ["Welcome to ClipCrest", "Start with any video", "Your day at a glance", "Every video in one place",
  "Add the creators you clip", "The AI picks the moments", "Your account and alerts", "You're ready to clip"];

test.describe("the guided tour", () => {
  test("[APP-TOUR-01, APP-TOUR-04, APP-TOUR-05, APP-TOUR-06, APP-TOUR-07, APP-KEY-04, APP-SHELL-02] it starts once by itself and runs to the end", async ({ page, mode }) => {
    test.skip(mode === "local", "the built-in owner is shared by every test, so its first visit is long gone");
    await signUp(page.request, newUser());                       // a new account, tour not seen
    await page.goto("/app");
    const card = page.getByRole("dialog", { name: TOUR[0] });
    await expect(card).toBeVisible();
    await expect(card.getByText("1 of 8")).toBeVisible();
    await expect(card.getByRole("button", { name: "Back" })).toBeDisabled();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("dialog", { name: TOUR[1] })).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("dialog", { name: TOUR[0] })).toBeVisible();
    for (const k of ["Tab", "Tab", "Tab", "Tab"]) {               // the keyboard stays inside the card
      await page.keyboard.press(k);
      await expect(page.getByRole("dialog", { name: TOUR[0] }).locator(":focus")).toHaveCount(1);
    }
    for (let i = 1; i < 8; i++) {
      await page.getByRole("dialog").getByRole("button", { name: /^Next/ }).click();
      const step = page.getByRole("dialog", { name: TOUR[i] });
      await expect(step).toBeVisible();
      await expect(step.getByText(`${i + 1} of 8`)).toBeVisible();
    }
    const saved = page.waitForRequest(r => r.method() === "PUT" && r.url().endsWith("/api/settings"));
    await page.getByRole("dialog", { name: TOUR[7] }).getByRole("button", { name: "Start clipping" }).click();
    expect((await saved).postDataJSON()).toEqual({ tour_done: true });
    expect((await (await saved).response())!.ok()).toBeTruthy();                 // saved before reloading
    await expect(page.getByRole("dialog", { name: TOUR[7] })).toBeHidden();
    await expect(linkBox(page)).toBeFocused();
    await page.reload();
    await expect(title(page)).toHaveText("Home");
    await page.waitForTimeout(1_000);                            // it would start half a second after loading
    await expect(page.getByRole("dialog", { name: TOUR[0] })).toHaveCount(0);
  });

  test("[APP-TOUR-02, APP-TOUR-03, APP-TOUR-06, APP-TOUR-07, APP-ACCT-03] Take the tour from the menu: it moves to Home, and Esc or the close button ends it", async ({ app: page }) => {
    await navItem(page, "All videos").click();
    await meButton(page).click();
    await menuItem(page, "Take the tour").click();
    await expect(page.getByRole("dialog", { name: TOUR[0] })).toBeVisible();
    await expect(title(page)).toHaveText("Home");
    await expect(menu(page)).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: TOUR[0] })).toBeHidden();
    await expect(menu(page)).toBeHidden();
    await meButton(page).click();
    await menuItem(page, "Take the tour").click();
    await page.getByRole("button", { name: "Close the tour" }).click();
    await expect(page.getByRole("dialog", { name: TOUR[0] })).toBeHidden();
  });
});

test.describe("banners", () => {
  test("[APP-ERR-06] the AI-not-set-up banner, and where it shows", async ({ page, admin }) => {
    void admin;
    await openApp(page, "/app", "Home");
    const banner = page.getByText("Add your AI key to let the AI pick clips and write titles. Until then, clips are picked by loudness.");
    await expect(banner).toBeVisible();
    await page.getByRole("status").getByRole("button", { name: "Add AI key" }).click();
    await expect(page).toHaveURL(/\/app\/settings\/ai$/);
    await expect(banner).toBeVisible();
    await expect(page.getByRole("status").getByRole("button", { name: "Add AI key" })).toHaveCount(0);   // not on Settings
    await openApp(page, "/app/usage", "AI usage");
    await expect(banner).toHaveCount(0);
  });

  test("[APP-ERR-01, APP-ERR-02, APP-ERR-03, APP-ERR-04, APP-UPD-01, APP-UPD-02, APP-UPD-03, APP-KEY-05] banners for a broken or outdated server, one at a time, by priority", async ({ page, admin }) => {
    void admin;
    const patch: Record<string, any> = {};
    await patchStatus(page, s => {
      Object.assign(s, patch);
      if (patch.problem) s.ai = { ...s.ai, problem: patch.problem };
    });
    await page.route(u => u.pathname === "/api/sync", async r => {          // its answer carries the AI state too
      const res = await r.fetch();
      const body = await res.json();
      if (patch.problem && body.ai) body.ai.problem = patch.problem;
      await r.fulfill({ response: res, json: body });
    });
    // a new version
    patch.update = { latest: "v9.1", current: "v9.0", behind: 3, notes: [{ title: "Faster clips", date: "2026-11-20" }], url: "https://github.com/Ahmed-Islam-AI/clipcrest/commits", restart: false };
    await openApp(page, "/app", "Home");
    await expect(page.getByText("A new version of ClipCrest is out: 3 updates since yours.")).toBeVisible();
    await page.getByRole("button", { name: "How to update" }).click();
    const how = dialog(page, "A new version of ClipCrest is out");
    await expect(how).toContainText("You're on v9.0. 3 updates have been added since. Your settings, keys and clips stay as they are.");
    await expect(how).toContainText("Faster clips");
    await expect(how.getByRole("link", { name: "See every change on GitHub" })).toHaveAttribute("target", "_blank");
    await how.getByRole("button", { name: "Copy" }).nth(1).click();
    await expect(page.getByText("Copied", { exact: true })).toBeVisible();
    expect(await copied(page)).toBe("git pull && pip install -r requirements.txt");
    await page.keyboard.press("Escape");
    await expect(how).toBeHidden();
    await page.getByRole("button", { name: "Hide until the next version" }).click();
    const banner = page.getByText("A new version of ClipCrest is out: 3 updates since yours.");
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(title(page)).toHaveText("Home");
    await page.waitForTimeout(500);
    await expect(banner).toHaveCount(0);                                         // remembered
    patch.update = { ...patch.update, latest: "v9.2", restart: true };
    await page.reload();
    await expect(page.getByText("The new version is downloaded. Close ClipCrest and start it again to use it.")).toBeVisible();
    await page.getByRole("button", { name: "What's new" }).click();
    await expect(dialog(page, "The new version is ready")).toBeVisible();
    await dialog(page, "The new version is ready").getByRole("button", { name: "Got it" }).click();
    // the AI not answering beats the update
    patch.problem = "The key was refused.";
    await page.reload();
    await expect(page.getByText("The AI isn't answering. The key was refused. Until then, clips are picked by loudness.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open AI settings" })).toBeVisible();
    // a full drive beats that
    patch.disk_full = true;
    await page.reload();
    await expect(page.getByText(/^The drive ClipCrest saves to is almost full, so it can't take new videos\./)).toBeVisible();
    await expect(page.getByText(/The AI isn't answering/)).toHaveCount(0);
    await page.getByRole("button", { name: "Open Storage" }).click();
    await expect(page).toHaveURL(/\/app\/settings\/storage$/);
    // and ffmpeg missing beats everything, on every view
    patch.no_ffmpeg = true;
    await page.reload();
    await expect(page.getByRole("alert")).toContainText("ClipCrest can't make clips yet: ffmpeg isn't installed on this computer.");
    await expect(page.getByRole("alert")).toContainText("winget install Gyan.FFmpeg");
    await expect(page.getByText(/almost full/)).toHaveCount(0);
  });

  test("[APP-ERR-05, APP-KEY-06] the confirm-your-email banner", async ({ page, user, mode }) => {
    test.skip(mode === "local", "the owner never has to confirm an email");
    await patchStatus(page, s => { s.user.verified = false; });
    const verify = (u: URL) => u.pathname === "/api/auth/verify-code";
    await page.route(verify, r => r.fulfill({ status: 400, json: { detail: "That code isn't right. Check the newest email." } }));
    await page.route(u => u.pathname === "/api/auth/resend-verification", r => r.fulfill({ json: { sent: true, mail_ready: false } }));
    await openApp(page, "/app", "Home");
    await expect(page.getByText(`Confirm your email to start clipping. We sent a 6-digit code to ${user!.email}.`)).toBeVisible();
    const code = page.getByRole("textbox", { name: "6-digit code" });
    await expect(code).toHaveAttribute("placeholder", "123456");
    await code.fill("123456");
    await code.press("Enter");
    await expect(page.getByText("That code isn't right. Check the newest email.")).toBeVisible();
    await page.getByRole("button", { name: "Send a new code" }).click();
    await expect(page.getByText("Email isn't set up on this server yet, so the code was written to the server log.")).toBeVisible();
    await page.unroute(verify);
    await page.getByRole("button", { name: "Confirm" }).click();          // the real server: this account needs no code
    await expect(page.getByText("Email confirmed. You're ready to clip.")).toBeVisible();
  });
});

test.describe("AI usage", () => {
  test("[APP-USE-01, APP-USE-02, APP-USE-03, APP-USE-04, APP-USE-05, APP-USE-06] with nothing used yet", async ({ page, admin, mode }) => {
    void admin;
    await openApp(page, "/app/usage", "AI usage");
    await expect(page.getByText("No AI key is set, so clips are picked by loudness only. Add your key under Settings, AI.")).toBeVisible();
    for (const t of ["AI service", "AI calls today", "Tokens today", "AI calls in total", "Tokens in total"]) await expect(page.getByText(t, { exact: true }).last()).toBeVisible();
    await expect(page.getByText("Last 30 days. Your AI provider bills you for these directly.")).toBeVisible();
    await expect(page.getByRole("img", { name: "AI tokens used per day, last 30 days" })).toContainText("No AI used in the last 30 days");
    for (const h of ["What it was used for", "By creator", "Recent AI activity"]) await expect(page.getByRole("heading", { name: h })).toBeVisible();
    await expect(page.getByText("Nothing yet.")).toHaveCount(2);
    await expect(page.getByText("No AI calls yet.")).toBeVisible();
    void mode;
  });

  test("[APP-USE-02] a normal user is told the server has no AI", async ({ page, user, mode }) => {
    test.skip(mode === "local", "the owner is always an admin");
    void user;
    await openApp(page, "/app/usage", "AI usage");
    await expect(page.getByText("The AI isn't set up on this server yet, so clips are picked by loudness.").first()).toBeVisible();
  });

  test("[APP-USE-01, APP-USE-03, APP-USE-04, APP-USE-05, APP-USE-06, APP-NAV-10] with AI calls made", async ({ page, user }) => {
    void user;
    const data = fixture("usage");
    const today = new Date();
    data.daily = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today.getTime() - (29 - i) * 86_400_000);
      return { day: d.toLocaleDateString("en-CA"), tokens: i === 29 ? 34567 : i * 1000, calls: i === 29 ? 12 : i };
    });
    await page.route(u => u.pathname === "/api/usage", r => r.fulfill({ json: data }));
    await openApp(page, "/app/usage", "AI usage");
    await expect(page.getByText("Gemini", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("gemini-2.5-flash")).toBeVisible();
    for (const t of ["12", "34.6K", "340", "1.2M"]) await expect(page.getByText(t, { exact: true }).last()).toBeVisible();
    await expect(page.getByRole("img", { name: "AI tokens used per day, last 30 days" })).toContainText("Today");
    for (const t of ["Finding clips", "Live judging", "Titles and hooks", "Live Star"]) await expect(page.getByText(t, { exact: true }).first()).toBeVisible();
    await expect(page.getByText("900K tokens · 200 calls")).toBeVisible();
    await expect(page.getByText("The latest 2 AI calls")).toBeVisible();
    await expect(page.getByRole("cell", { name: "None" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "4,200" })).toBeVisible();
    await expect(sidebar(page).getByRole("button", { name: /^AI\b/ })).toContainText("12 today");   // the sidebar card follows
  });
});

test.describe("notifications", () => {
  test("[APP-BELL-01, APP-BELL-02, APP-BELL-03, APP-BELL-06, APP-BELL-07, APP-BELL-08, APP-NAV-12, APP-KEY-01, APP-TOAST-03] a real notification: the pop-up card, the badge and the list", async ({ page, admin }) => {
    void admin;
    await openApp(page, "/app", "Home");                         // the first visit only notes what is already there
    const message = "Please add dark mode " + uid();
    expect((await page.request.post("/api/feedback", { data: { kind: "idea", message } })).ok()).toBeTruthy();
    // the page checks every 15 seconds; the new one pops up in the corner
    const card = page.getByRole("status").filter({ hasText: message }).last();     // the card, inside the toasts area
    await expect(card).toBeVisible({ timeout: 25_000 });
    await expect(card).toContainText(/New feature idea from/);
    await card.getByRole("button", { name: "Dismiss" }).click();
    await expect(card).toBeHidden();
    await expect(bell(page)).toHaveAccessibleName(/^Notifications, \d+ new$/);
    // the list, which marks them read after a moment
    const read = page.waitForRequest(r => r.url().endsWith("/api/notifications/read"));
    await bell(page).click();
    const panel = page.getByRole("dialog", { name: "Notifications" });
    await expect(panel.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Mark all as read" })).toBeVisible();
    const item = panel.getByRole("button", { name: new RegExp(message) });
    await expect(item).toContainText("just now");
    await read;
    await expect(bell(page)).toHaveAccessibleName("Notifications");
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await bell(page).click();
    await expect(panel).toBeVisible();
    await page.getByRole("heading", { level: 1 }).click();        // a click elsewhere
    await expect(panel).toBeHidden();
    await bell(page).click();
    await expect(panel).toBeVisible();
    await bell(page).click();                                      // the bell again
    await expect(panel).toBeHidden();
    // following it: the feedback inbox is another page, so a normal page load
    await bell(page).click();
    await panel.getByRole("button", { name: new RegExp(message) }).click();
    await expect(page).toHaveURL(/\/admin\/feedback$/);
  });

  test("[APP-BELL-02, APP-BELL-05, APP-ROUTE-13] an empty list, an error, and a link inside the app", async ({ page, user, mode }) => {
    void user;
    await openApp(page, "/app", "Home");
    if (mode === "accounts") {                                      // a brand-new account has none
      await bell(page).click();
      await expect(page.getByText("Nothing yet. Recordings, finished clips and posts that need a look show up here.")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Notifications" })).toBeHidden();
    }
    const list = (u: URL) => u.pathname === "/api/notifications";
    await page.route(list, r => r.fulfill({ status: 500, json: { detail: "The bell is broken." } }));
    await bell(page).click();
    await expect(page.getByText("The bell is broken.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Notifications" })).toBeHidden();
    await page.unroute(list);
    await page.route(list, r => r.fulfill({ json: { unread: 0, items: [
      { id: 1, t: Date.now() / 1000 - 300, kind: "clips", title: "3 clips ready", body: "Finished stream", link: "/app/videos", read: true }] } }));
    await bell(page).click();
    await expect(page.getByText("5 min ago")).toBeVisible();
    await page.getByRole("button", { name: /3 clips ready/ }).click();
    await expect(title(page)).toHaveText("All videos");
    await expect(page).toHaveURL(/\/app\/videos$/);
  });

  test("[APP-NAV-12] more than nine unread shows 9+", async ({ page, user }) => {
    void user;
    await patchStatus(page, s => { s.unread = 12; });
    await page.route(u => u.pathname === "/api/sync", async r => {                // the sync answer carries the count too
      const res = await r.fetch();
      const body = await res.json();
      if (body.unread != null) body.unread = 12;
      await r.fulfill({ response: res, json: body });
    });
    await openApp(page, "/app", "Home");
    await expect(bell(page)).toHaveAccessibleName("Notifications, 12 new");
    await expect(bell(page)).toContainText("9+");
  });

  test("[APP-BELL-04] Mark all as read refreshes the list and keeps it open (Q-06)", async ({ page, admin }) => {
    // Old-UI bug Q-06: Mark all as read closes the panel instead of refreshing it. Passes only on the React app.
    void admin;
    await openApp(page, "/app", "Home");
    expect((await page.request.post("/api/feedback", { data: { kind: "bug", message: "Mark me " + uid() } })).ok()).toBeTruthy();
    await page.reload();
    await bell(page).click();
    await page.getByRole("dialog", { name: "Notifications" }).getByRole("button", { name: "Mark all as read" }).click();
    await expect(page.getByRole("dialog", { name: "Notifications" })).toBeVisible();
    await expect(bell(page)).toHaveAccessibleName("Notifications");
  });
});

test.describe("feedback, toasts and errors", () => {
  test("[APP-FB-01, APP-FB-02, APP-TOAST-01, APP-TOAST-02, APP-ERR-10] Send feedback, and Report on a red toast", async ({ app: page, context }) => {
    await meButton(page).click();
    let popup = context.waitForEvent("page");
    await menuItem(page, "Send feedback").click();
    expect((await popup).url()).toBe("https://github.com/Ahmed-Islam-AI/clipcrest/issues/new");
    await page.route(u => u.pathname === "/api/settings", r => r.fulfill({ status: 500, json: { detail: "The server said no." } }));
    const pause = page.getByRole("button", { name: "Pause all posting" });
    await pause.click();
    const toast = page.getByText("The server said no.");
    await expect(toast).toBeVisible();
    await expect(pause).toBeEnabled();                                         // the button works again
    popup = context.waitForEvent("page");
    await page.getByRole("button", { name: "Report" }).click();
    expect((await popup).url()).toContain("github.com/Ahmed-Islam-AI/clipcrest/issues/new");
    await expect(page.getByText("The problem is copied. Paste it in your message.")).toBeVisible();
    expect(await copied(page)).toBe("The server said no.");
    await expect(toast).toBeHidden();
    // a plain toast goes after about 3 seconds, a red one after about 7
    await pause.click();
    await expect(page.getByText("The server said no.")).toBeVisible();
    await page.waitForTimeout(4_000);
    await expect(page.getByText("The server said no.")).toBeVisible();
    await expect(page.getByText("The server said no.")).toBeHidden({ timeout: 5_000 });
  });

  test("[APP-FB-01, APP-FB-02, APP-TOP-06, APP-EARN-03] a server with no project or follow link", async ({ page, user, mode }) => {
    void user;
    await patchStatus(page, s => { s.links = { repo: "", follow: "", earn: s.links.earn }; });
    await openApp(page, "/app", "Home");
    await expect(page.getByRole("link", { name: "Follow me" })).toHaveCount(0);
    if (mode === "accounts") await expect(page.getByRole("link", { name: /Earn money/ })).toHaveAttribute("href", "/earn");
    else await expect(page.getByRole("link", { name: /Star|Earn money/ })).toHaveCount(0);
    await meButton(page).click();
    await expect(menuItem(page, "Take the tour")).toBeVisible();
    await expect(menuItem(page, "Send feedback")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Make clips/ }).click();
    await page.getByRole("button", { name: "Report" }).click();
    await expect(page.getByText("Copy this message and send it to the person who runs this ClipCrest.")).toBeVisible();
  });

  test("[APP-ERR-07, APP-SHELL-07] being signed out while using the app goes to the sign-in page", async ({ app: page, mode }) => {
    test.skip(mode === "local", "nobody signs in with sign-in off");
    const toLogin = page.waitForRequest(r => new URL(r.url()).pathname === "/login");
    await page.route(u => u.pathname === "/api/sync", r => r.fulfill({ status: 401, json: { detail: "Please sign in." } }));
    await toLogin;
  });

  test("[APP-ERR-08, APP-SYNC-09] offline: actions say the server can't be reached, polling stays quiet, and it recovers", async ({ app: page, context }) => {
    await context.setOffline(true);
    await page.getByRole("button", { name: "Pause all posting" }).click();
    // Q-12: the old page showed the browser's own "Failed to fetch"; the React app says this instead
    await expect(page.getByText("Can't reach ClipCrest. Check that it is running.")).toBeVisible();
    await context.setOffline(false);
    await page.getByRole("button", { name: "Pause all posting" }).click();
    await expect(page.getByRole("button", { name: "Resume posting" })).toBeVisible();
    await page.getByRole("button", { name: "Resume posting" }).click();
    await expect(page.getByRole("button", { name: "Pause all posting" })).toBeVisible();
  });

  test("[APP-SYNC-01, APP-SYNC-02] the page asks for changes every few seconds with its last token", async ({ app: page }) => {
    const asked: string[] = [];
    page.on("request", r => { if (new URL(r.url()).pathname === "/api/sync") asked.push(new URL(r.url()).searchParams.get("v") || ""); });
    await page.waitForTimeout(9_500);
    expect(asked.length).toBeGreaterThanOrEqual(2);                              // about every 4 seconds when idle
    expect(asked.length).toBeLessThanOrEqual(4);
    expect(asked.every(v => v === asked[0] && v.length > 0)).toBeTruthy();       // nothing changed: the same token
  });

  test("[GA-02, GA-01] the shared scripts are served", async ({ request }) => {
    for (const p of ["/assets/gradient-ascii.js", "/assets/ascii.js"]) expect((await request.get(p)).status(), p).toBe(200);
  });
});
