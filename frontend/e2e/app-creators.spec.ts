/* Creators: the New creator dialog, the creator page and its tabs, Setup, Activity, deleting, and recording live.
   Creators, channels and settings are real. A creator who is live needs the internet, so that state comes from a
   fixed /api/sync answer (e2e/fixtures/sync-live.json), and the writes it would cause are answered here. */
import { addCreator, createCreator, creatorItem, dialog, expect, fakeWrite, fixture, mockSync, navItem, openApp, test, title, uid } from "./fixtures";

test.describe("New creator", () => {
  test("[APP-CRE-01, APP-NAV-08, APP-NAV-07, APP-TOP-03, APP-TOP-04, APP-CRE-12] the dialog previews the channel and makes a workspace", async ({ app: page }) => {
    await page.route(u => u.pathname === "/api/channel-preview" && (u.searchParams.get("url") || "").includes("somebody"),
      r => r.fulfill({ json: fixture("channel-preview") }));
    await navItem(page, "New creator").click();
    const d = dialog(page, "New creator");
    await expect(d).toContainText("Each creator gets their own workspace, folder, settings and accounts.");
    const chan = d.getByLabel("Channel link");
    await expect(chan).toHaveAttribute("placeholder", "https://www.youtube.com/@name, twitch.tv/name or kick.com/name");
    await expect(chan).toBeFocused();
    await chan.fill("https://www.twitch.tv/somebody");
    await expect(d.getByText("Somebody Streams")).toBeVisible();
    await expect(d.getByText("Twitch · 12.3K followers")).toBeVisible();
    await expect(d.getByLabel("Name")).toHaveValue("Somebody Streams");        // filled in from the channel
    await d.getByLabel("Name").fill("My own name");
    await chan.fill("https://kick.com/nobody-" + uid());                        // a real lookup: fails offline
    await expect(d.getByText("Couldn't open that channel. Check the link.")).toBeVisible({ timeout: 30_000 });
    await expect(d.getByLabel("Name")).toHaveValue("My own name");             // what the person typed stays
    await chan.fill("");
    await d.getByLabel("Name").fill("");
    await d.getByRole("button", { name: "Create workspace" }).click();          // the name is required
    await expect(d).toBeVisible();
    await d.getByRole("button", { name: "Cancel" }).click();                    // Cancel needs no name
    await expect(d).toBeHidden();

    const name = "Creator " + uid();
    await addCreator(page, name);
    await expect(page.getByText("Workspace created")).toBeVisible();
    await expect(page).toHaveURL(/\/setup$/);                                   // no channel: Setup first
    await expect(creatorItem(page, name)).toBeVisible();
    await expect(page.getByText("No channel yet")).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Creator sections" }).getByRole("tab")).toHaveText([/Clips/, /Setup/, /Activity\s*1/]);
    await page.getByRole("tab", { name: /Activity/ }).click();
    await expect(page.getByText("Workspace created for " + name)).toBeVisible();
    await expect(page.getByRole("tab", { name: /Activity/ })).toHaveAttribute("aria-selected", "true");
  });

  test("[APP-CRE-01, APP-KEY-05] Enter in the New creator dialog creates the workspace (Q-10)", async ({ app: page }) => {
    // Old-UI bug Q-10: the dialog's first button is Cancel, so Enter in a field closes the dialog as Cancel.
    // Passes only on the React app, which fixes it.
    const name = "Enter " + uid();
    await navItem(page, "New creator").click();
    await dialog(page, "New creator").getByLabel("Name").fill(name);
    await page.keyboard.press("Enter");
    await expect(title(page)).toHaveText(name);
  });
});

test.describe("a creator's pages", () => {
  test("[APP-CRE-02, APP-CRE-03, APP-VID-02, APP-TOP-05, APP-LIVE-07, APP-ERR-11] the Clips tab, and Start recording with no channel", async ({ page, user }) => {
    void user;
    const name = "Clips " + uid();
    const id = await createCreator(page.request, name);
    await openApp(page, "/app/creators/" + id, name);
    await expect(page.getByText("No clips for this creator yet")).toBeVisible();
    await expect(page.getByText("Start recording their stream, or paste a link to one of their videos above.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Video link" })).toBeVisible();
    await expect(page.getByRole("button", { name: "File under creator" })).toHaveCount(0);   // already this creator's
    await page.getByRole("button", { name: "Options" }).click();
    await expect(page.getByRole("spinbutton", { name: "How many" })).toHaveValue("6");      // the creator's own defaults
    await page.getByRole("button", { name: "Start recording" }).click();
    await expect(page.getByText("Connect one of their channels first, then press Start recording.")).toBeVisible();
    await expect(page.getByRole("tab", { name: /Setup/ })).toHaveAttribute("aria-selected", "true");
  });

  test("[APP-CRE-04, APP-CRE-05, APP-CRE-13, APP-TOP-03] connecting and removing a channel", async ({ page, user }) => {
    void user;
    const name = "Chan " + uid();
    const id = await createCreator(page.request, name);
    await openApp(page, `/app/creators/${id}/setup`, name);
    await expect(page.getByRole("heading", { name: "Their stream" })).toBeVisible();
    for (const [p, hint] of [["YouTube", "https://www.youtube.com/@name"], ["Twitch", "https://www.twitch.tv/name"], ["Kick", "https://kick.com/name"]])
      await expect(page.getByRole("textbox", { name: `${p} channel link` })).toHaveAttribute("placeholder", hint);
    await page.getByRole("button", { name: "Connect", exact: true }).first().click();       // nothing typed
    await expect(page.getByText("Paste their YouTube channel link.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "YouTube channel link" })).toBeFocused();
    const saved = page.waitForRequest(r => r.method() === "PUT" && r.url().endsWith("/api/creators/" + id));
    await page.getByRole("textbox", { name: "Twitch channel link" }).fill("twitch.tv/somebody" + uid().slice(0, 4));
    await page.getByRole("button", { name: "Connect", exact: true }).nth(1).click();
    expect((await saved).postDataJSON().channels.twitch).toMatch(/^https:\/\/twitch\.tv\/somebody/);   // https:// added
    await expect(page.getByText("Twitch · Looking it up…")).toBeVisible();         // offline: the profile never arrives
    await expect(page.getByRole("textbox", { name: "Twitch channel link" })).toHaveCount(0);
    await expect(page.getByText(/^Offline/)).toBeVisible();                       // the badge under the name
    await page.getByRole("button", { name: "Remove Twitch channel" }).click();
    await expect(page.getByRole("textbox", { name: "Twitch channel link" })).toBeVisible();
    await expect(page.getByText("No channel yet")).toBeVisible();
  });

  test("[APP-CRE-06, APP-CRE-07, APP-CRE-08, APP-CRE-09, APP-CRE-10, APP-CRE-13] Setup: the save bar, Discard, Save, switches and the cost hint", async ({ page, user }) => {
    void user;
    const name = "Setup " + uid();
    const id = await createCreator(page.request, name);
    await openApp(page, `/app/creators/${id}/setup`, name);
    for (const h of ["How the AI decides", "Clips", "Posting", "Delete this creator"]) await expect(page.getByRole("heading", { level: 2, name: h, exact: true })).toBeVisible();
    await expect(page.getByText("No accounts are connected yet. Connect one in Settings, then come back.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Settings" })).toBeVisible();
    // the cost hint follows how often the AI checks
    await expect(page.getByText(/^About 40 AI calls per live hour at most\./)).toBeVisible();
    await page.getByLabel("Check the live stream every").selectOption("10");
    await expect(page.getByText(/^About 12 AI calls per live hour at most\./)).toBeVisible();
    // a typed change shows the save bar; Discard puts it back
    const perHour = page.getByLabel("Most live clips per hour");
    await expect(perHour).toHaveValue("4");
    await perHour.fill("9");
    await expect(page.getByText("You have unsaved changes")).toBeVisible();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.getByText("Changes discarded")).toBeVisible();
    await expect(perHour).toHaveValue("4");
    // (the old page only fades the bar out, which a test cannot tell from shown, so its going away is not checked)
    // Save sends every field
    await perHour.fill("12");
    await page.getByPlaceholder("Read from the title").fill("GTA 6");
    const saved = page.waitForRequest(r => r.method() === "PUT" && r.url().endsWith("/api/creators/" + id));
    await page.getByRole("button", { name: "Save changes" }).click();
    expect((await saved).postDataJSON()).toMatchObject({ live_per_hour: "12", game: "GTA 6", trigger_words: "clip that, clip it", accounts: [] });
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Most live clips per hour")).toHaveValue("12");
    // switches save at once
    const auto = page.getByRole("checkbox", { name: /Record automatically when they go live/ });
    const quiet = page.waitForRequest(r => r.method() === "PUT" && r.url().endsWith("/api/creators/" + id));
    await auto.check();
    expect((await quiet).postDataJSON()).toMatchObject({ auto_watch: true });
    await expect(page.getByText("Offline · records when live").or(page.getByText("No channel yet"))).toBeVisible();
    // captions off disables the caption style
    await page.getByRole("checkbox", { name: "Generate captions" }).uncheck();
    await expect(page.getByLabel("Caption style")).toBeDisabled();
    // auto-posting asks first; Cancel unticks it
    const autopost = page.getByRole("checkbox", { name: /Post new clips automatically/ });
    await autopost.check();
    const ask = dialog(page, "Turn on auto-posting?");
    await expect(ask).toContainText("Clips that score high enough will be posted to the ticked accounts without you seeing them first.");
    await ask.getByRole("button", { name: "Cancel" }).click();
    await expect(autopost).not.toBeChecked();
    await autopost.check();
    const autoSaved = page.waitForResponse(r => r.request().method() === "PUT" && r.url().endsWith("/api/creators/" + id));
    await dialog(page, "Turn on auto-posting?").getByRole("button", { name: "Turn on" }).click();
    expect((await autoSaved).ok()).toBeTruthy();                                // saved before reloading
    await expect(autopost).toBeChecked();
    await page.reload();
    await expect(page.getByRole("checkbox", { name: /Post new clips automatically/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Generate captions" })).not.toBeChecked();
    await page.getByRole("button", { name: "Open Settings" }).click();
    await expect(title(page)).toHaveText("Settings");
  });

  test("[APP-CRE-11, APP-SHELL-06] deleting a creator needs its name typed", async ({ page, user }) => {
    void user;
    const name = "Doomed " + uid();
    const id = await createCreator(page.request, name);
    await openApp(page, `/app/creators/${id}/setup`, name);
    await expect(page.getByText(`Removes ${name}, their settings and every video and clip filed under them. This cannot be undone.`)).toBeVisible();
    await page.getByRole("button", { name: "Delete creator" }).click();
    const d = dialog(page, `Delete ${name}?`);
    await expect(d).toContainText("This removes the creator, their settings for good. It cannot be undone.");
    const ok = d.getByRole("button", { name: "Delete creator" });
    await expect(ok).toBeDisabled();
    const typed = d.getByRole("textbox");
    await expect(typed).toBeFocused();
    await typed.fill("wrong name");
    await expect(ok).toBeDisabled();
    await typed.fill("  " + name.toUpperCase() + " ");                     // case and outer spaces don't matter
    await expect(ok).toBeEnabled();
    await ok.click();
    await expect(page.getByText("Creator deleted")).toBeVisible();
    await expect(title(page)).toHaveText("Home");
    await expect(creatorItem(page, name)).toHaveCount(0);
  });
});

test.describe("live", () => {
  test("[APP-LIVE-01, APP-LIVE-02, APP-LIVE-03, APP-NAV-07, APP-TOP-03, APP-TOP-05, APP-CRE-02] a creator live on Twitch and Kick", async ({ page, user }) => {
    void user;
    await mockSync(page, fixture("sync-live"));
    await page.goto("/app/creators/c_livestar");
    await expect(title(page)).toHaveText("Live Star");
    await expect(creatorItem(page, "Live Star")).toContainText("Live");
    await expect(page.getByText("Live on Twitch · 1.2K watching")).toBeVisible();
    await expect(page.getByRole("button", { name: "Record live stream" })).toBeVisible();
    // opened at 127.0.0.1: Twitch will not play here, and says so
    await expect(page.getByText("Twitch only plays inside sites with a web address")).toBeVisible();
    await expect(page.getByText("It will play here once ClipCrest is on its domain, or open ClipCrest at localhost instead of 127.0.0.1.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Watch on Twitch" })).toHaveAttribute("href", "https://www.twitch.tv/livestar");
    await expect(page.getByRole("heading", { name: "GTA 6 launch night" })).toBeVisible();
    for (const t of ["1.2K", "watching", "live for", "48.2K", "followers"]) await expect(page.getByText(t, { exact: true })).toBeVisible();
    await expect(page.getByText("ClipCrest watches it and clips the best moments as they happen.")).toBeVisible();
    // the other platform plays in an embedded player
    await page.getByRole("button", { name: "Watch on Kick" }).click();
    await expect(page.getByText("Live on Kick", { exact: true })).toBeVisible();
    await expect(page.getByTitle("Kick live stream")).toHaveAttribute("src", /^https:\/\/player\.kick\.com\/livestar\?/);
    // the player stays on Setup's other side: hidden on Setup, back on Clips
    await page.getByRole("tab", { name: /Setup/ }).click();
    await expect(page.getByRole("heading", { name: "Kick side stream" })).toBeHidden();
    await page.getByRole("tab", { name: /Clips/ }).click();
    await expect(page.getByRole("heading", { name: "Kick side stream" })).toBeVisible();
  });

  test("[APP-LIVE-04, APP-LIVE-03] at localhost the Twitch player is embedded for this site", async ({ page, user, baseURL }) => {
    if (user) await page.request.post(baseURL!.replace("127.0.0.1", "localhost") + "/api/auth/login", { data: { email: user.email, password: user.password } });   // cookies are per address
    const local = baseURL!.replace("127.0.0.1", "localhost");
    await mockSync(page, fixture("sync-live"));
    await page.goto(local + "/app/creators/c_livestar");
    await expect(page.getByTitle("Twitch live stream")).toHaveAttribute("src", /player\.twitch\.tv\/\?channel=livestar&parent=localhost/);
  });

  test("[APP-LIVE-06, APP-LIVE-08, APP-LIVE-09, APP-LIVE-10, APP-LIVE-11, APP-LIVE-12, APP-LIVE-13, APP-VID-21, APP-TOP-05] a recording in progress", async ({ page, user }) => {
    void user;
    const data = fixture("sync-live"), job = fixture("live-job");
    data.creators[0].live_job = job.id;
    data.jobs = [job];
    await mockSync(page, data);
    const clip = await fakeWrite(page, "POST", /\/api\/live\/[^/]+\/clip$/);
    const every = await fakeWrite(page, "PUT", /\/api\/creators\/c_livestar$/);
    const stop = await fakeWrite(page, "POST", /\/api\/live\/[^/]+\/stop$/);
    await page.goto("/app/creators/c_livestar");
    await expect(page.getByText("Recording", { exact: true })).toBeVisible();          // the badge
    await expect(creatorItem(page, "Live Star")).toContainText("Rec");
    await expect(page.getByText("Recording now. Clips appear below as they're made.")).toBeVisible();
    for (const t of ["Recorded", "Kept in buffer", "AI checks every", "Clips so far", "Hand clip being prepared",
      "Loudness, last minute", "Chat messages per second", "Latest AI decisions", "What was just said"]) await expect(page.getByText(t, { exact: true })).toBeVisible();
    await expect(page.getByText("12:34")).toBeVisible();
    await expect(page.getByText("20 min")).toBeVisible();
    await expect(page.getByText("AI calls · 1 skipped · 2 turned down")).toBeVisible();
    await expect(page.getByText("11:40 · words 72 · reaction 64 · clipped")).toBeVisible();
    await expect(page.getByText("clip that right now")).toBeVisible();

    await page.getByRole("button", { name: "Clip last 30s" }).click();
    await expect(page.getByText("Clipping the last 30 seconds…")).toBeVisible();
    expect(clip[0].body).toEqual({ seconds: 30 });
    await page.getByRole("button", { name: "Last 60s" }).click();
    await expect(page.getByText("Clipping the last 60 seconds…")).toBeVisible();

    await page.getByRole("button", { name: "How often the AI checks" }).click();
    await page.getByRole("option", { name: "5 min" }).click();
    await expect(page.getByText("AI checks every 5 min")).toBeVisible();
    expect(every[0].body).toEqual({ ai_every_min: 5 });

    await page.getByRole("button", { name: "Stop", exact: true }).click();
    const ask = dialog(page, "Stop recording?");
    await expect(ask).toContainText("Clips already made are kept. The rest of the buffer is cleared.");
    await ask.getByRole("button", { name: "Stop recording" }).click();
    await expect(page.getByText("Recording stopped. Clips already made are kept.")).toBeVisible();
    await expect.poll(() => stop.length).toBe(1);
  });

  test("[APP-LIVE-06, APP-LIVE-07] Record this stream starts recording the platform that is playing", async ({ page, user }) => {
    void user;
    await mockSync(page, fixture("sync-live"));
    const started = await fakeWrite(page, "POST", /\/api\/creators\/c_livestar\/live$/, fixture("live-job"));
    await page.goto("/app/creators/c_livestar");
    await page.getByRole("button", { name: "Watch on Kick" }).click();
    await page.getByRole("button", { name: "Record this stream" }).click();
    await expect(page.getByText("Recording started. Clips appear below as they're made.")).toBeVisible();
    expect(started[0].body).toEqual({ channel: "https://kick.com/livestar" });
  });

  test("[APP-LIVE-07, APP-LIVE-14] a real recording starts, then stops by itself with its reason when the stream can't be reached", async ({ page, user, mode }) => {
    test.skip(mode === "local", "uses a fresh account so the recording list is its own");
    void user;
    const name = "Rec " + uid();
    const id = await createCreator(page.request, name);
    expect((await page.request.put("/api/creators/" + id, { data: { channels: { twitch: "https://www.twitch.tv/nobody" + uid() } } })).ok()).toBeTruthy();
    await openApp(page, "/app/creators/" + id, name);
    await page.getByRole("button", { name: "Start recording" }).click();
    await expect(page.getByText("Recording started. Clips appear below as they're made.")).toBeVisible();
    await navItem(page, "All videos").click();
    await expect(page.getByText(/Could not start recording|Recording stopped/)).toBeVisible({ timeout: 40_000 });
  });
});
