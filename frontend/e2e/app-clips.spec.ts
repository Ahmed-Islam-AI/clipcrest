/* Videos and clips in every state, and what can be done with finished clips. Finished clips need the speech model,
   so the list comes from a fixed /api/sync answer (e2e/fixtures/sync-clips.json); clip files and covers are answered
   with the test video and a still. Writes are answered here and checked, instead of reaching the server. */
import { copied, dialog, expect, fakeWrite, fixture, mockMedia, mockSync, navItem, openApp, test, title } from "./fixtures";

const JOB = "20261124-100000-done000001";

test.beforeEach(async ({ page, user }) => {
  void user;
  await mockSync(page, fixture("sync-clips"));
  await mockMedia(page);
  await openApp(page, "/app/videos", "All videos");
});

test("[APP-VID-03, APP-VID-04, APP-VID-06, APP-VID-07, APP-VID-08, APP-VID-10, APP-VID-11, APP-VID-12, APP-VID-13, APP-VID-14, APP-VID-15, APP-VID-16, APP-NAV-04, APP-SYNC-10] every video and clip state", async ({ page }) => {
  await expect(navItem(page, "All videos")).toContainText("3 working");
  // a finished video: its details line, the AI note, and its controls
  await expect(page.getByRole("heading", { name: "Finished stream" })).toBeVisible();
  await expect(page.getByText("Streamer · 1:02:05 long · 6 clips · made in 1:35")).toBeVisible();
  await expect(page.getByText("The AI was unavailable, so clips were picked by loudness only.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Download all clips of this video" })).toBeVisible();
  // a video making its clips: progress, done steps with their times, the step under way with its clock
  await expect(page.getByText("92%")).toBeVisible();
  await expect(page.getByText("Got the audio", { exact: true })).toHaveCount(2);         // done in both running videos
  for (const t of ["Transcript ready", "Picked 3 moments", "Making the clips", "Downloading the video: 12 of 80 MB",
    "1 of 3 clips made · 1 being made now · 1 could not be made"]) await expect(page.getByText(t, { exact: true })).toBeVisible();
  await expect(page.getByText("0:12", { exact: true })).toBeVisible();
  // a video at step 2, named after its file, with the clock counting on between answers
  await expect(page.getByRole("heading", { name: "my-upload.mp4" })).toBeVisible();
  await expect(page.getByText("Writing the transcript", { exact: true })).toBeVisible();
  for (const t of ["Pick the best moments", "Make the clips"]) await expect(page.getByText(t, { exact: true })).toBeVisible();   // still to come
  const clock = page.getByText(/^1:(1[5-9]|2\d)$/);
  await expect(clock).toBeVisible();
  const was = await clock.textContent();
  await expect(clock).not.toHaveText(was!, { timeout: 4_000 });
  // queued, and finished without clips
  await expect(page.getByText("Waiting in line: 2 videos ahead of yours")).toBeVisible();
  await expect(page.getByText("Done, but nothing clip-worthy was found")).toBeVisible();
  // only finished videos can be deleted or selected
  await expect(page.getByRole("button", { name: "Delete this video and its clips" })).toHaveCount(2);
  // clip cards
  await expect(page.getByRole("button", { name: "Open clip: Insane play" })).toContainText("85");
  await expect(page.getByRole("button", { name: "Open clip: Insane play" })).toContainText("0:33");
  await expect(page.getByRole("button", { name: "Open clip: Clipped by me" })).toContainText("Hand");
  await expect(page.getByText("He did WHAT", { exact: true })).toBeVisible();
  await expect(page.getByText("Untitled clip", { exact: true })).toBeVisible();
  await expect(page.getByText("Making this clip…").first()).toBeVisible();
  await expect(page.getByText("Waiting its turn…")).toBeVisible();
  await expect(page.getByText("Could not make this clip. Open it to try again.").first()).toBeVisible();
  // posts: posted links to the post, failed explains itself, scheduled shows when, cancelled is not shown
  await expect(page.getByRole("link", { name: "My Channel · posted" })).toHaveAttribute("href", "https://youtube.com/shorts/abcdefghijk");
  await expect(page.getByText("@me.clips · failed")).toHaveAttribute("title", "TikTok said the token expired");
  await expect(page.getByText(/^My Channel · \w{3} \d\d:\d\d/)).toBeVisible();
  await expect(page.getByText("@me.clips · cancelled")).toHaveCount(0);
});

test("[APP-VID-17, APP-SHELL-05] clip buttons: copy, download, delete", async ({ page }) => {
  const deleted = await fakeWrite(page, "DELETE", /\/api\/jobs\/[^/]+\/clips\/[^/]+$/);
  await page.getByRole("button", { name: "Copy post text" }).first().click();
  await expect(page.getByText("Post text copied")).toBeVisible();
  expect(await copied(page)).toBe("Insane play\n\nWatch till the end\n\n#gta6 #clips");
  await expect(page.getByRole("link", { name: "Download", exact: true }).first()).toHaveAttribute("href", `/media/${JOB}/c1.mp4?download=1`);
  await expect(page.getByRole("button", { name: "Post", exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Delete this clip" }).first().click();
  const ask = dialog(page, "Delete this clip?");
  await expect(ask).toContainText("The clip is removed for good. The video and its other clips stay.");
  await ask.getByRole("button", { name: "Cancel" }).click();
  expect(deleted).toHaveLength(0);
  await page.getByRole("button", { name: "Delete this clip" }).first().click();
  await dialog(page, "Delete this clip?").getByRole("button", { name: "Delete clip" }).click();
  await expect(page.getByText("Clip deleted")).toBeVisible();
  expect(deleted[0].url).toContain(`/api/jobs/${JOB}/clips/c1`);
});

test("[APP-VID-18, APP-VID-19, APP-VID-20] selecting clips and videos, downloading and deleting them together", async ({ page }) => {
  const bulk = await fakeWrite(page, "POST", /\/api\/bulk\/delete$/, { videos: 1, clips: 2, skipped: 2 });
  const clips = page.getByRole("checkbox", { name: "Select this clip" });
  await clips.nth(0).check();
  await clips.nth(1).check();
  const bar = page.getByRole("toolbar", { name: "Selected items" });
  await expect(bar).toContainText("2 selected");
  await expect(bar.getByRole("button", { name: "Download 2 clips" })).toBeEnabled();
  const zip = page.waitForEvent("download");
  await page.route(u => u.pathname === "/api/clips.zip", r => r.fulfill({ body: "zip", headers: { "Content-Disposition": "attachment; filename=x.zip" } }));
  await bar.getByRole("button", { name: "Download 2 clips" }).click();
  expect(decodeURIComponent((await zip).url())).toContain(`ids=${JOB}.c1,${JOB}.c2`);
  await expect(page.getByText("Preparing 2 clips as one download…")).toBeVisible();
  // ticking the video covers its clips
  await page.getByRole("checkbox", { name: "Select this video" }).first().check();
  await expect(bar).toContainText("1 selected");
  await expect(clips.nth(0)).not.toBeChecked();
  await bar.getByRole("button", { name: "Delete" }).click();
  const ask = dialog(page, "Delete what you selected?");
  await expect(ask).toContainText("This removes 1 video with all its clips for good. It cannot be undone.");
  await ask.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted 1 video and 2 clips. 2 still being made were left alone.")).toBeVisible();
  expect(bulk[0].body).toEqual({ videos: [JOB], clips: [] });
  // a single clip and Select all
  await clips.nth(2).check();
  await bar.getByRole("button", { name: "Select all" }).click();
  await expect(bar).toContainText("2 selected");                   // the two finished videos
  await bar.getByRole("button", { name: "Cancel" }).click();
  await expect(clips.nth(2)).not.toBeChecked();
});

test("[APP-CLIP-01, APP-CLIP-02, APP-CLIP-03, APP-CLIP-04, APP-CLIP-05, APP-CLIP-06, APP-CLIP-07, APP-CLIP-08, APP-CLIP-09] the clip dialog: edit, re-make, post", async ({ page, mode }) => {
  const render = await fakeWrite(page, "POST", /\/render$/);
  const posts = await fakeWrite(page, "POST", /^\/api\/posts$/);
  await page.getByRole("button", { name: "Open clip: Insane play" }).click();
  const d = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "On the video" }) });
  await expect(d).toBeVisible();
  await expect(d.getByText("Words 85 · Reaction 70")).toBeVisible();
  await expect(d.getByText("Big reaction and clear words")).toBeVisible();
  await expect(d.getByLabel("Big text")).toHaveValue("He did WHAT");
  await expect(d.getByLabel("Start (seconds)")).toHaveValue("10");
  await expect(d.getByLabel("End (seconds)")).toHaveValue("42.5");
  await expect(d.getByLabel("Title")).toHaveValue("Insane play");
  await expect(d.getByLabel("Description")).toHaveValue("Watch till the end");
  await expect(d.getByLabel("Caption style")).toHaveValue("bounce");
  await expect(d.getByLabel("Layout")).toHaveValue("blur");
  await d.getByRole("checkbox", { name: "Generate captions" }).uncheck();
  await expect(d.getByLabel("Caption style")).toBeDisabled();
  await d.getByRole("checkbox", { name: "Generate captions" }).check();
  await d.getByLabel("Big text").fill("New hook");
  await d.getByRole("button", { name: "Save and re-make clip" }).click();
  await expect(page.getByText("Re-making the clip…")).toBeVisible();
  expect(render[0].body).toEqual({ hook: "New hook", captions: true, style: "bounce", layout: "blur", start: 10, end: 42.5, title: "Insane play", description: "Watch till the end" });
  await expect(d.getByLabel("Big text")).toHaveValue("New hook");     // a refresh keeps what was typed

  await expect(d.getByRole("link", { name: "My Channel · posted" })).toBeVisible();
  await d.getByRole("button", { name: "Post now" }).click();
  await expect(page.getByText("Tick at least one account first.")).toBeVisible();
  await d.getByRole("checkbox", { name: "YouTube · My Channel" }).check();
  await d.getByRole("button", { name: "Post now" }).click();
  const ask = dialog(page, "Post now?");
  await expect(ask).toContainText("This clip goes to 1 account straight away.");
  await ask.getByRole("button", { name: "Post now" }).click();
  await expect(page.getByText("Posting now", { exact: true })).toBeVisible();
  expect(posts[0].body).toEqual({ job: JOB, clip: "c1", accounts: ["acc_yt"], now: true });
  await d.getByRole("button", { name: "Add to queue" }).click();
  await expect(page.getByText("Added to the queue")).toBeVisible();
  expect(posts[1].body.now).toBe(false);
  await expect(d.getByRole("link", { name: "Download" })).toHaveAttribute("href", `/media/${JOB}/c1.mp4?download=1`);
  await expect(d.getByRole("button", { name: "Copy post text" })).toBeVisible();
  await expect(d.getByRole("button", { name: "Send to a campaign" })).toHaveCount(mode === "accounts" ? 1 : 0);
  // three ways to close
  await d.getByRole("button", { name: "Close" }).click();
  await expect(d).toBeHidden();
  await page.getByRole("button", { name: "Open clip: Insane play" }).click();
  await page.keyboard.press("Escape");
  await expect(d).toBeHidden();
  await page.getByRole("button", { name: "Open clip: Insane play" }).click();
  await expect(d).toBeVisible();
  await page.mouse.click(5, 5);                                     // the dark backdrop
  await expect(d).toBeHidden();
});

test("[APP-CLIP-02, APP-CLIP-07, APP-VID-13] a clip that failed, and posting with no accounts", async ({ page }) => {
  const data = fixture("sync-clips");
  data.accounts = [];
  await mockSync(page, data);
  await page.reload();
  await expect(title(page)).toHaveText("All videos");
  await page.getByRole("button", { name: "Open clip: Failed clip" }).click();
  await expect(page.getByText("ffmpeg stopped early")).toBeVisible();
  await expect(page.getByText("No accounts connected yet. Connect one in Settings.")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Download" })).toHaveCount(0);
});

test("[APP-EARN-02] Send to a paid campaign opens Earn with the clip's posted link", async ({ page, mode, context }) => {
  if (mode === "local") {                                           // no Earn on a downloaded copy
    await expect(page.getByRole("button", { name: "Send to a paid campaign" })).toHaveCount(0);
    return;
  }
  const popup = context.waitForEvent("page");
  await page.getByRole("button", { name: "Send to a paid campaign" }).first().click();
  expect((await popup).url()).toMatch(/\/earn#submit=https%3A%2F%2Fyoutube\.com%2Fshorts%2Fabcdefghijk$/);
  await expect(page.getByText("Opening Earn to send this clip")).toBeVisible();
  // a clip with no posted link asks for it; an empty answer does nothing
  const pages = context.pages().length;
  let asked = "";
  page.once("dialog", dlg => { asked = dlg.message(); void dlg.accept(""); });
  await page.getByRole("button", { name: "Send to a paid campaign" }).nth(2).click();
  await expect.poll(() => asked).toContain("Paste the link to this clip after you posted it");
  await page.waitForTimeout(500);
  expect(context.pages().length).toBe(pages);                       // nothing opened
});
