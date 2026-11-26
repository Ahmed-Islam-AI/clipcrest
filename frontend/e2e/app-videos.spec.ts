/* Home, the composer (links, options, uploads) and the list of videos. Everything here is real: real uploads, real
   jobs. Only the link preview is answered with a fixed answer, because it needs YouTube. With no speech model and
   no internet, a started video fails at its first step, which is itself the "failed video" state. */
import fs from "node:fs";
import { copied, createCreator, dialog, expect, fixture, linkBox, mockPreview, navItem, openApp, pickFiles, test, title, uid, VIDEOS } from "./fixtures";

const YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const makeClips = (page: import("@playwright/test").Page) => page.getByRole("button", { name: /^Make clips/ });

test.describe("Home", () => {
  test("[APP-HOME-01, APP-HOME-02, APP-HOME-03, APP-HOME-04, APP-HOME-05, APP-HOME-07, APP-HOME-08, APP-ERR-11] Home with nothing made yet", async ({ app: page, mode }) => {
    await expect(page.getByRole("heading", { name: "What do you want to clip today?" })).toBeVisible();
    await expect(page.getByText("Paste a link or drop in videos. You get captioned shorts back.")).toBeVisible();
    for (const tile of ["Recording now", "Clips today", "Posted today", "Waiting to post"]) await expect(page.getByText(tile, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    await expect(page.getByText("Last 14 days", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Clips made and posted per day, last 14 days" })).toContainText("Today");
    for (const kpi of ["Clips made", "Posted", "Views", "Est. earnings"]) await expect(page.getByText(kpi, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/^\$\d+\.\d\d$/)).toBeVisible();
    await expect(page.getByText("Clips are picked by loudness until an AI key is added.")).toBeVisible();
    for (const t of ["AI calls today", "Tokens today"]) await expect(page.getByText(t, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Creators" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Post queue" })).toBeVisible();
    await expect(page.getByText("Queued clips go out at their scheduled time.")).toBeVisible();
    await expect(page.getByText("Nothing queued or posted yet.")).toBeVisible();
    if (mode === "accounts") {         // a brand-new account: the empty texts
      await expect(page.getByText("No clips in the last 14 days yet")).toBeVisible();
      await expect(page.getByText("No creators yet", { exact: true })).toBeVisible();
      await expect(page.getByText("Add one to give each streamer their own workspace.")).toBeVisible();
    }
    await page.getByRole("button", { name: "View usage" }).click();
    await expect(title(page)).toHaveText("AI usage");
  });

  test("[APP-HOME-08] Pause all posting and Resume posting", async ({ app: page }) => {
    await page.getByRole("button", { name: "Pause all posting" }).click();
    await expect(page.getByText("Paused. Recording and clipping carry on; nothing is posted.")).toBeVisible();
    await page.reload();                                                 // saved on the server
    await expect(page.getByText("Paused. Recording and clipping carry on; nothing is posted.")).toBeVisible();
    await page.getByRole("button", { name: "Resume posting" }).click();
    await expect(page.getByText("Queued clips go out at their scheduled time.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pause all posting" })).toBeVisible();
  });

  test("[APP-HOME-06, APP-CRE-01] Next steps open what they name", async ({ app: page, mode }) => {
    test.skip(mode === "local", "needs a brand-new account with nothing in it");
    await expect(page.getByRole("heading", { name: "Next steps" })).toBeVisible();
    await expect(page.getByText("Finish setting up ClipCrest")).toBeVisible();
    const step = (name: string) => page.getByRole("button", { name: new RegExp(name) });
    await expect(step("Turn on auto-record")).toHaveCount(0);            // no creator yet
    await step("Add your first creator").click();
    await expect(dialog(page, "New creator")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog(page, "New creator")).toBeHidden();
    await step("Make your first clips").click();
    await expect(linkBox(page)).toBeFocused();
    await step("Connect a posting account").click();
    await expect(title(page)).toHaveText("Settings");
    const name = "Steps " + uid();
    await createCreator(page.request, name);
    await openApp(page, "/app", "Home");
    await expect(step("Add your first creator")).toHaveCount(0);
    await step("Turn on auto-record").click();
    await expect(title(page)).toHaveText(name);
    await expect(page.getByRole("tab", { name: /Setup/ })).toHaveAttribute("aria-selected", "true");
  });

  test("[APP-HOME-06] Connect a posting account opens Connected apps (Q-08)", async ({ app: page, mode }) => {
    // Old-UI bug Q-08: the step opens Settings with no section, so an admin lands on AI instead of Connected apps.
    // Passes only on the React app, which fixes it.
    test.skip(mode === "accounts", "the owner is the admin who sees the wrong section");
    await page.getByRole("button", { name: /Connect a posting account/ }).click();
    await expect(page).toHaveURL(/\/app\/settings\/apps$/);
  });
});

test.describe("the composer", () => {
  test("[APP-COMP-01, APP-COMP-02, APP-COMP-03, APP-COMP-04, APP-COMP-06, APP-COMP-07, APP-COMP-08, APP-COMP-09, APP-COMP-10, APP-KEY-03] recognising and taking links", async ({ app: page }) => {
    await mockPreview(page, "dQw4w9WgXcQ");
    const box = linkBox(page);
    await expect(box).toHaveAttribute("placeholder", "Paste a YouTube, Twitch or Kick video link");
    await box.fill("https://www.twitch.tv/somebody");
    await expect(page.getByText("That's a channel, not a video. To clip their live streams, add them as a creator and press Start recording.")).toBeVisible();
    await box.fill("hello there friend");
    await expect(page.getByText("Paste a full YouTube, Twitch or Kick video link.")).toBeVisible();
    await box.fill("hello");
    await expect(page.getByText("Paste a full YouTube, Twitch or Kick video link.")).toBeHidden();
    await box.fill(YT);                                                   // a complete video link is taken at once
    await expect(box).toHaveValue("");
    await expect(page.getByText("Never Gonna Give You Up")).toBeVisible();
    await expect(page.getByText("Rick Astley")).toBeVisible();
    await expect(page.getByText("3:32")).toBeVisible();
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    await expect(box).toHaveAttribute("placeholder", "Paste another link");
    await box.fill(YT);                                                   // the same link again is ignored
    await expect(page.getByText("Never Gonna Give You Up")).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Add another video/ })).toContainText("1 of 5");
    await page.getByRole("button", { name: /Add another video/ }).click();
    await expect(page.getByText("Paste another link, or drop a file anywhere on the box.")).toBeVisible();
    await expect(box).toBeFocused();
    await expect(makeClips(page)).toHaveText("Make clips");
    // a link of another shape is taken with Enter straight away; offline its lookup fails, shown on the row
    const kick = `https://kick.com/someone/videos/k${uid().slice(0, 3)}`;   // too short an id to count as complete: waits for Enter
    await box.fill(kick);
    await box.press("Enter");
    await expect(box).toHaveValue("");
    await expect(page.getByText(kick)).toBeVisible({ timeout: 30_000 });   // a real lookup: it fails offline after a few seconds
    await expect(page.getByText("Couldn't open that video. Check the link is public and complete.")).toBeVisible();
    await expect(makeClips(page)).toHaveText("Make clips");               // failed links don't count
    await page.getByRole("button", { name: "Remove link" }).click();
    await expect(page.getByText(kick)).toBeHidden();
    await page.getByRole("button", { name: "Remove Never Gonna Give You Up" }).click();
    await expect(page.getByText("Never Gonna Give You Up")).toBeHidden();
    await expect(box).toHaveAttribute("placeholder", "Paste a YouTube, Twitch or Kick video link");
  });

  test("[APP-COMP-04, APP-COMP-06, APP-COMP-11, APP-COMP-22] a live link, the batch limit, and a list per page", async ({ app: page }) => {
    await mockPreview(page, "/live/", fixture("preview-live"));
    await mockPreview(page, "youtu.be/");
    const box = linkBox(page);
    await box.fill("https://www.youtube.com/live/aaaaaaaaaaa");
    await expect(page.getByText("Live now: launch stream")).toBeVisible();
    await expect(page.getByText("Live now", { exact: true })).toBeVisible();
    for (const id of ["bbbbbbbbbbb", "ccccccccccc", "ddddddddddd", "eeeeeeeeeee"]) {
      await box.fill("https://youtu.be/" + id);
      await expect(box).toHaveValue("");
    }
    await expect(makeClips(page)).toHaveText("Make clips (5)");
    await expect(page.getByRole("button", { name: /Add another video/ })).toHaveCount(0);   // full
    await box.fill("https://youtu.be/fffffffffff");
    await expect(page.getByText("You can send up to 5 videos at a time. Remove one first.")).toBeVisible();
    // each page keeps its own list: All videos starts empty, Home keeps its rows
    await navItem(page, "All videos").click();
    await expect(title(page)).toHaveText("All videos");
    await expect(page.getByText("Live now: launch stream")).toHaveCount(0);
    await navItem(page, "Home").click();
    await expect(page.getByText("Live now: launch stream")).toBeVisible();
    await expect(makeClips(page)).toHaveText("Make clips (5)");
  });

  test("[APP-COMP-23] Make clips with nothing attached says what to do", async ({ app: page }) => {
    await makeClips(page).click();
    await expect(page.getByText("Paste a YouTube, Twitch or Kick video link, or add a video file first.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Report" })).toBeVisible();     // red toasts can be reported
    await expect(linkBox(page)).toBeFocused();
  });

  test("[APP-COMP-15, APP-COMP-16, APP-COMP-17, APP-COMP-18, APP-COMP-19, APP-COMP-20, APP-COMP-21, APP-COMP-24, APP-HOME-09] the options are sent with the video", async ({ app: page }) => {
    await mockPreview(page, "dQw4w9WgXcQ");
    const opts = page.getByRole("button", { name: "Options" });
    await expect(opts).toHaveAttribute("aria-expanded", "false");
    await opts.click();
    await expect(opts).toHaveAttribute("aria-expanded", "true");
    const many = page.getByRole("spinbutton", { name: "How many" });
    await expect(many).toHaveValue("6");
    await expect(page.getByRole("spinbutton", { name: "Shortest" })).toHaveValue("15");
    await expect(page.getByRole("spinbutton", { name: "Longest" })).toHaveValue("60");
    const less = page.getByRole("button", { name: "Less" }), more = page.getByRole("button", { name: "More" });
    for (let i = 0; i < 7; i++) await less.nth(0).click();                 // How many stops at 1
    await expect(many).toHaveValue("1");
    for (let i = 0; i < 26; i++) await more.nth(2).click();                // Longest stops at 180
    await expect(page.getByRole("spinbutton", { name: "Longest" })).toHaveValue("180");
    const captions = page.getByRole("checkbox", { name: "Generate captions" });
    await expect(captions).toBeChecked();
    const bounce = page.getByRole("button", { name: /Bounce/ }), hype = page.getByRole("button", { name: /Hype/ });
    await expect(bounce).toHaveAttribute("aria-pressed", "true");
    await captions.uncheck();
    await expect(hype).toBeDisabled();
    await captions.check();
    await hype.click();
    await expect(hype).toHaveAttribute("aria-pressed", "true");
    await expect(bounce).toHaveAttribute("aria-pressed", "false");
    for (const layout of ["Blurred fill", "Zoomed in", "Gameplay + facecam"]) await expect(page.getByRole("button", { name: layout })).toBeVisible();
    await page.getByRole("button", { name: "Fill screen" }).click();
    await expect(page.getByRole("button", { name: "Fill screen" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /720p/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /1080p/ }).click();
    await expect(page.getByRole("button", { name: /1080p/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("spinbutton", { name: "From minute" }).fill("2");
    await page.getByRole("spinbutton", { name: "Up to minute" }).fill("5");
    await opts.click();
    await expect(opts).toHaveAttribute("aria-expanded", "false");

    await linkBox(page).fill(YT);
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    const sent = page.waitForRequest(r => r.url().endsWith("/api/jobs") && r.method() === "POST");
    await makeClips(page).click();
    const body = (await sent).postDataJSON();
    expect(body).toMatchObject({ url: YT, creator: "", options: { max_clips: 1, min_len: 15, max_len: 180, captions: true, style: "hype",
      layout: "crop", quality: 1080, range_start: 120, range_end: 300 } });
    await expect(page.getByText("Your video is being clipped now.")).toBeVisible();
    await expect(title(page)).toHaveText("All videos");                    // started from Home: off to the list
  });
});

test.describe("the creator picker", () => {
  test("[APP-COMP-12, APP-COMP-13, APP-COMP-14, APP-KEY-02, APP-HOME-09] filing a video under a creator, by keyboard and mouse", async ({ app: page }) => {
    const name = "Pick " + uid();
    const id = await createCreator(page.request, name);
    expect((await page.request.put("/api/creators/" + id, { data: { captions: false } })).ok()).toBeTruthy();
    await openApp(page, "/app", "Home");
    await mockPreview(page, "dQw4w9WgXcQ");
    const chip = page.getByRole("button", { name: "File under creator" });
    await expect(chip).toHaveText(/No creator/);
    await chip.focus();
    await page.keyboard.press("ArrowDown");                               // opens
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    await expect(chip).toHaveAttribute("aria-expanded", "true");
    await expect(list.getByRole("option", { name: "No creator" })).toHaveAttribute("aria-selected", "true");
    await expect(list.getByRole("option", { name: "No creator" })).toBeVisible();
    await page.keyboard.press("ArrowDown");                               // moves through the options
    await expect(list.getByRole("option").first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(list.getByRole("option").nth(1)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(list.getByRole("option").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(list).toBeHidden();
    await expect(chip).toBeFocused();
    await chip.click();
    await expect(list.getByRole("button", { name: "New creator" })).toBeVisible();
    await list.getByRole("option", { name: new RegExp(name) }).click();
    await expect(list).toBeHidden();
    await expect(chip).toHaveText(new RegExp(name));
    await page.getByRole("button", { name: "Options" }).click();
    await expect(page.getByRole("checkbox", { name: "Generate captions" })).not.toBeChecked();   // the creator's setting
    await linkBox(page).fill(YT);
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    const sent = page.waitForRequest(r => r.url().endsWith("/api/jobs") && r.method() === "POST");
    await makeClips(page).click();
    expect((await sent).postDataJSON()).toMatchObject({ creator: id, options: { captions: false } });
    await expect(title(page)).toHaveText(name);                          // started from Home: off to that creator
  });

  test.fixme("[APP-COMP-13, APP-KEY-02] opening the picker puts the focus on the chosen option (new: not in section 18)", async ({ app: page }) => {
    // Old-UI bug (not yet in section 18): focus() runs while the menu is still hidden by its fade-in, so it does not land.
    await page.getByRole("button", { name: "File under creator" }).click();
    await expect(page.getByRole("listbox").getByRole("option", { name: "No creator" })).toBeFocused();
  });

  test("[APP-COMP-12] the picker offers New creator and says when there are no creators", async ({ app: page, mode }) => {
    await page.getByRole("button", { name: "File under creator" }).click();
    if (mode === "accounts") await expect(page.getByText("No creators yet. Add one to keep each streamer's clips, settings and accounts together.")).toBeVisible();
    await page.getByRole("listbox").getByRole("button", { name: "New creator" }).click();
    await expect(dialog(page, "New creator")).toBeVisible();
  });
});

test.describe("uploads and videos", () => {
  test("[APP-UPL-01, APP-UPL-03, APP-UPL-04, APP-UPL-05, APP-UPL-07, APP-UPL-09, APP-VID-01, APP-VID-04, APP-VID-09, APP-ERR-12] uploading a small video makes a job, which fails without the speech model", async ({ app: page, mode }) => {
    const name = `tiny-${uid()}.mp4`;
    await pickFiles(page, [{ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a video") }]);
    await expect(page.getByText("notes.txt is not a video file.")).toBeVisible();
    await pickFiles(page, [{ name, mimeType: "video/mp4", buffer: fs.readFileSync(VIDEOS.tiny) }]);
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText("1 MB · uploaded file")).toBeVisible();
    await expect(page.getByText("0:06")).toBeVisible();
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    const sent = page.waitForRequest(r => r.url().endsWith("/api/upload") && r.method() === "POST");
    await makeClips(page).click();
    expect((await sent).postData()).toContain('name="options"');
    await expect(page.getByText("Your video is being clipped now.")).toBeVisible();
    await expect(title(page)).toHaveText("All videos");
    await expect(page.getByRole("heading", { name })).toBeVisible();
    // no speech model and no internet: the video stops at its first step and says why
    await expect(page.getByText(/couldn't download its speech model/).first()).toBeVisible({ timeout: 30_000 });
    if (mode === "accounts") await expect(page.getByRole("button", { name: "Report this" })).toBeVisible();
  });

  test("[APP-UPL-06, APP-UPL-07] a video bigger than one piece goes up in pieces", async ({ app: page }) => {
    const started = page.waitForResponse(r => r.url().endsWith("/api/upload/start"));
    const pieces: string[] = [];
    page.on("request", r => { if (r.method() === "PUT" && /\/api\/upload\/[^/]+\/\d+$/.test(r.url())) pieces.push(r.url()); });
    const finished = page.waitForResponse(r => /\/api\/upload\/[^/]+\/finish$/.test(r.url()));
    await pickFiles(page, VIDEOS.big);
    await expect(page.getByText("big.mp4")).toBeVisible();
    await expect(page.getByText(/^8 MB · uploaded file$/)).toBeVisible();
    await makeClips(page).click();
    const start = await (await started).json();
    expect(start.parts).toBe(2);
    expect((await finished).ok()).toBeTruthy();
    expect(pieces.length).toBe(2);
    await expect(page.getByText("Your video is being clipped now.")).toBeVisible();
  });

  test("[APP-UPL-08, APP-UPL-06] a piece the server refuses stops the upload, cleans up and shows why", async ({ app: page }) => {
    await page.route(/\/api\/upload\/[^/]+\/1$/, r => r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ detail: "That piece is the wrong size." }) }));
    const cleaned = page.waitForRequest(r => r.method() === "DELETE" && /\/api\/upload\/[^/]+$/.test(r.url()));
    await pickFiles(page, VIDEOS.big);
    await makeClips(page).click();
    await cleaned;
    await expect(page.getByText("That piece is the wrong size.")).toBeVisible();
    await expect(page.getByText("Nothing was started. The reason is shown on the video.")).toBeVisible();
    await expect(page.getByText("big.mp4")).toBeVisible();                // stays in the list
  });

  test("[APP-UPL-03] files over the size limit are refused before sending", async ({ app: page }) => {
    await pickFiles(page, VIDEOS.huge);
    await expect(page.getByText("huge.mp4 is over the 64 MB limit.")).toBeVisible();
    await expect(page.getByText("huge.mp4", { exact: true })).toHaveCount(0);
  });

  test("[APP-UPL-02] dropping a file on the page attaches it", async ({ app: page }) => {
    const data = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(2048)], "dropped.mp4", { type: "video/mp4" }));
      return dt;
    });
    await linkBox(page).dispatchEvent("dragover", { dataTransfer: data });
    await linkBox(page).dispatchEvent("drop", { dataTransfer: data });
    await expect(page.getByText("dropped.mp4")).toBeVisible();
  });

  test("[APP-COMP-25, APP-COMP-23] a refused video stays in the list with the reason", async ({ app: page }) => {
    await mockPreview(page, "dQw4w9WgXcQ");
    await page.route(u => u.pathname === "/api/jobs", r => r.fulfill({ status: 429, contentType: "application/json",
      body: JSON.stringify({ detail: "You already have 5 videos in progress. Wait for one to finish." }) }));
    await linkBox(page).fill(YT);
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    await makeClips(page).click();
    await expect(page.getByText("You already have 5 videos in progress. Wait for one to finish.")).toBeVisible();
    await expect(page.getByText("Nothing was started. The reason is shown on the video.")).toBeVisible();
    await expect(title(page)).toHaveText("Home");
  });

  test("[APP-COMP-23, APP-COMP-22] Make clips while a link is still being found starts by itself when it is found", async ({ app: page }) => {
    let release!: () => void;
    const held = new Promise<void>(r => { release = r; });
    await page.route(u => u.pathname === "/api/preview", async r => { await held; await r.fulfill({ json: fixture("preview") }); });
    await page.route(u => u.pathname === "/api/jobs", r => r.fulfill({ json: { id: "held" } }));
    await linkBox(page).fill(YT);
    await makeClips(page).click();
    await expect(page.getByText("Finding the video first. Clipping starts as soon as it's found.")).toBeVisible();
    await expect(makeClips(page).or(page.getByRole("button", { name: /Finding video/ }))).toHaveText(/Finding video/);
    const sent = page.waitForRequest(r => r.url().endsWith("/api/jobs"));
    release();
    await sent;
    await expect(page.getByText("Your video is being clipped now.")).toBeVisible();
  });
});

test.describe("the list of videos", () => {
  test.skip(({ mode }) => mode === "local", "the owner's list is shared by every test; these run with a fresh account");

  test("[APP-VID-02, APP-VID-05, APP-VID-18, APP-VID-19, APP-SHELL-05, APP-KEY-05] select, delete with confirmation, and the selection bar", async ({ app: page }) => {
    await navItem(page, "All videos").click();
    await expect(page.getByText("No videos yet")).toBeVisible();
    await expect(page.getByText("Paste a link above and the studio will find the best moments and turn them into clips.")).toBeVisible();
    for (const n of [1, 2]) {
      await pickFiles(page, [{ name: `clip-${n}.mp4`, mimeType: "video/mp4", buffer: fs.readFileSync(VIDEOS.tiny) }]);
      await makeClips(page).click();
      await expect(page.getByRole("heading", { name: `clip-${n}.mp4` })).toBeVisible();
    }
    await expect(page.getByText(/couldn't download its speech model/)).toHaveCount(2, { timeout: 30_000 });

    // deleting one video: Cancel and Esc keep it, Delete removes it
    const del = page.getByRole("button", { name: "Delete this video and its clips" });
    await del.first().click();
    const confirm = dialog(page, "Delete this video?");
    await expect(confirm).toContainText("The video and all of its clips are permanently deleted. This cannot be undone.");
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await expect(confirm).toBeHidden();
    await del.first().click();
    await page.keyboard.press("Escape");
    await expect(confirm).toBeHidden();
    await expect(del).toHaveCount(2);
    await del.first().click();
    await confirm.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Deleted", { exact: true })).toBeVisible();
    await expect(del).toHaveCount(1);

    // the selection bar
    await page.getByRole("checkbox", { name: "Select this video" }).check();
    const bar = page.getByRole("toolbar", { name: "Selected items" });
    await expect(bar).toContainText("1 selected");
    await expect(bar.getByRole("button", { name: /Download/ })).toBeDisabled();       // nothing finished to download
    await bar.getByRole("button", { name: "Cancel" }).click();
    await expect(bar).toBeHidden();
    await expect(page.getByRole("checkbox", { name: "Select this video" })).not.toBeChecked();
    await page.getByRole("checkbox", { name: "Select this video" }).check();
    await bar.getByRole("button", { name: "Select all" }).click();
    await bar.getByRole("button", { name: "Delete" }).click();
    const confirmAll = dialog(page, "Delete what you selected?");
    await expect(confirmAll).toContainText("This removes 1 video with all its clips for good. It cannot be undone.");
    await confirmAll.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Deleted 1 video and 0 clips")).toBeVisible();
    await expect(page.getByText("No videos yet")).toBeVisible();
  });

  test("[APP-VID-09, APP-FB-02] Report this copies the problem and opens the issues page", async ({ app: page, context }) => {
    await pickFiles(page, [{ name: "report-me.mp4", mimeType: "video/mp4", buffer: fs.readFileSync(VIDEOS.tiny) }]);
    await makeClips(page).click();
    await expect(page.getByText(/couldn't download its speech model/)).toBeVisible({ timeout: 30_000 });
    const popup = context.waitForEvent("page");
    await page.getByRole("button", { name: "Report this" }).click();
    expect((await popup).url()).toContain("github.com/Ahmed-Islam-AI/clipcrest/issues/new");
    await expect(page.getByText("The problem is copied. Paste it in your message.")).toBeVisible();
    expect(await copied(page)).toMatch(/^Video failed: report-me\.mp4 \| .*speech model/);
  });

  test("[APP-NAV-04] All videos shows how many videos there are", async ({ app: page }) => {
    await expect(page.getByRole("button", { name: "All videos", exact: true })).toBeVisible();   // no count yet
    await pickFiles(page, [{ name: "count.mp4", mimeType: "video/mp4", buffer: fs.readFileSync(VIDEOS.tiny) }]);
    await makeClips(page).click();
    await expect(page.getByText(/couldn't download its speech model/)).toBeVisible({ timeout: 30_000 });
    await expect(navItem(page, /^All videos\s*1$/)).toBeVisible();
  });
});
