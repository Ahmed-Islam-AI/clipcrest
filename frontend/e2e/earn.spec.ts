/* Earn (/earn) for clippers, and its admin (/admin/earn). Runs on its own server ("site" project), one test at a time.
   Campaigns are seeded through the admin API, the way an admin makes them; everything else goes through the pages.
   The first test needs the site with no campaigns yet, so it stays first in this file. */
import type { APIRequestContext, Page, PlaywrightWorkerArgs } from "@playwright/test";
import { expect, grantAdmin, newUser, signIn, signUp, test, uid } from "./fixtures";

type Seed = { id: string; slug: string; title: string };
let adminCtx: APIRequestContext | null = null;

/** An admin's request context, made once per worker: sign up, grant, sign in. */
async function adminRequest(playwright: PlaywrightWorkerArgs["playwright"], baseURL: string, dataDir: string) {
  if (adminCtx) return adminCtx;
  const u = newUser("Earn admin");
  const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL, "X-Forwarded-For": "10.66.0." + Math.floor(Math.random() * 200 + 1) } });
  await signUp(ctx, u);
  grantAdmin(u.email, dataDir);
  await signIn(ctx, u);
  return (adminCtx = ctx);
}
/** A live campaign open for the next three days (like Recipe M's "GTA 6 Launch"), with a unique title. */
async function seedCampaign(admin: APIRequestContext, extra: Record<string, unknown> = {}): Promise<Seed> {
  const t = Math.floor(Date.now() / 1000), title = "GTA 6 Launch " + uid();
  const r = await admin.post("/api/admin/earn/campaigns", { data: {
    title, creator_name: "Mizo", creator_url: "https://example.com/mizo", category: "Gaming", tagline: "Clip the launch",
    brief: "Clip GTA 6 streams.\nPost fast.", rules: "Hook in 2 seconds\nCredit the creator", sources: "https://youtube.com/@creator/live",
    platforms: ["youtube", "x", "tiktok", "instagram"], required_tag: "@mizo", rate_per_1k: 20, min_views: 1000, max_per_clip: 500,
    budget: 1000, hold_days: 7, status: "live", starts_at: t - 3600, ends_at: t + 3 * 86400 + 3600, ...extra } });
  expect(r.ok(), await r.text()).toBeTruthy();
  const c = await r.json();
  return { id: c.id, slug: c.slug, title };
}
const xLink = (handle: string) => `https://x.com/${handle}/status/${(BigInt(Date.now() - 60_000 - 1288834974657) << 22n).toString()}`;
const card = (page: Page, title: string) => page.getByRole("button", { name: new RegExp(title) }).filter({ hasText: "per 1,000 views" });

test.describe("Earn for clippers", () => {
  test("[EARN-META-01, EARN-HDR-01, EARN-HDR-02, EARN-HDR-03, EARN-LIST-12, EARN-LB-03, EARN-CALC-01, EARN-INFO-02, EARN-HOW-02] an empty site, signed out", async ({ page }) => {
    await page.goto("/earn");
    const nav = page.getByRole("navigation", { name: "Sections" }).first();
    for (const name of ["How it works", "Campaigns", "Leaderboard", "FAQ", "Free clip maker"]) await expect(nav.getByRole("link", { name })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toHaveAttribute("href", "/login?next=%2Fearn");
    await expect(page.getByRole("link", { name: /^Start earning/ }).first()).toHaveAttribute("href", "/signup?next=%2Fearn%23me");
    await expect(page.getByText("The next campaign is on its way")).toBeVisible();
    await expect(page.getByText("No one's on the board yet")).toBeVisible();
    await expect(page.getByRole("slider", { name: "Views on one clip" })).toBeVisible();
    await expect(page.getByRole("slider", { name: "Clips a week" })).toBeVisible();
    await expect(page.getByText(/^An estimate/)).toBeVisible();
    await expect(page.getByText("Do I need a big following?")).toBeVisible();
    await expect(page.getByText(`© ${new Date().getFullYear()}`).first()).toBeVisible();
  });

  test("[EARN-LIST-02, EARN-LIST-03, EARN-LIST-04, EARN-LIST-06, EARN-LIST-07, EARN-LIST-08, EARN-LIST-10, EARN-CAMP-01, EARN-CAMP-02, EARN-CAMP-03, EARN-CAMP-05, EARN-CAMP-06, EARN-CAMP-07, EARN-CAMP-08, EARN-CAMP-11, EARN-CAMP-12, EARN-CAMP-13, EARN-ROUTE-02, EARN-ROUTE-03, EARN-ERR-01] a campaign's card and its sheet, signed out", async ({ page, playwright, baseURL, dataDir }) => {
    const admin = await adminRequest(playwright, baseURL!, dataDir);
    const c = await seedCampaign(admin);
    const draft = "Secret draft " + uid();
    expect((await admin.post("/api/admin/earn/campaigns", { data: { title: draft, rate_per_1k: 10, budget: 100 } })).ok()).toBeTruthy();
    await page.goto("/earn");
    const k = card(page, c.title);
    await expect(k).toContainText("₹20");
    await expect(k).toContainText("per 1,000 views · up to ₹500 a clip");
    await expect(k).toContainText("₹1,000 left");
    await expect(k).toContainText("of ₹1,000");
    await expect(k).toContainText("0 clippers · 0 clips");
    await expect(k).toContainText(/\dd \d+h left/);
    await expect(card(page, draft)).toHaveCount(0);                         // drafts are not shown
    await k.click();
    const sheet = page.getByRole("dialog", { name: c.title });
    await expect(sheet).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#c=${c.slug}$`));
    await expect(sheet.getByRole("link", { name: "Mizo" })).toHaveAttribute("href", "https://example.com/mizo");
    for (const t of ["Clip rules", "Hook in 2 seconds", "Required in your caption", "@mizo", "No clips yet. Yours could be first.",
      "🔒 Join the campaign to see which streams and videos to clip.", "Minimum views", "1,000", "Most per clip", "₹500", "7 days after posting"])
      await expect(sheet.getByText(t, { exact: true }).first()).toBeVisible();
    await expect(sheet.getByText("A clip with 50,000 views earns ₹500.")).toBeVisible();
    const next = encodeURIComponent(`/earn#c=${c.slug}`);
    await expect(sheet.getByRole("link", { name: /Sign up to join/ })).toHaveAttribute("href", `/signup?next=${next}`);
    await expect(sheet.getByRole("link", { name: "I have an account" })).toHaveAttribute("href", `/login?next=${next}`);
    await sheet.getByText("Clip rules").click();                            // clicks inside keep it open
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toBeHidden();
    await expect(page).not.toHaveURL(/#c=/);
    await page.goto(`/earn#c=${c.slug}`);                                   // a deep link opens it
    await expect(page.getByRole("dialog", { name: c.title })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: c.title })).toBeHidden();
    await page.goto("/earn#c=nope-" + uid());
    await expect(page.getByText("That campaign doesn't exist.")).toBeVisible();
  });

  test("[EARN-DASH-01, EARN-DASH-02, EARN-PROF-01, EARN-PROF-02, EARN-PROF-03, EARN-SUB-01, EARN-SUB-02, EARN-JOIN-01, EARN-CAMP-09, EARN-SUB-07, EARN-SUB-08, EARN-CLIPS-01, EARN-CLIPS-07, EARN-HDR-04, EARN-HDR-10] a clipper: profile, joining, sending a clip, removing it, signing out", async ({ page, playwright, baseURL, dataDir }) => {
    const c = await seedCampaign(await adminRequest(playwright, baseURL!, dataDir));
    const u = newUser("Ravi"), handle = "rc" + uid().slice(0, 7);
    await signUp(page.request, u);
    await page.goto("/earn#me");
    await expect(page.getByRole("heading", { name: `Hey ${u.name}` })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Payout profile ⚠/ })).toBeVisible();
    await expect(page.getByText(/^Set up your payout profile first/)).toBeVisible();
    await page.getByRole("button", { name: "Set it up" }).click();
    // the payout profile: a bad handle is explained, a good profile is saved
    await page.getByPlaceholder("name@okaxis").fill("ravi@okaxis");
    await page.getByPlaceholder("+91 98765 43210").fill("98765 43210");
    await page.getByPlaceholder("@yourpage").fill("bad handle!");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Your Instagram handle doesn't look right. Write it like @yourname.")).toBeVisible();
    await page.getByPlaceholder("@yourpage").fill("");
    await page.getByPlaceholder("@yourhandle").fill("@" + handle);
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Payout profile ⚠/ })).toHaveCount(0);
    await expect(page.getByText("Join a campaign first. Open one below and press Join.")).toBeVisible();
    // join from the sheet
    await card(page, c.title).click();
    const sheet = page.getByRole("dialog", { name: c.title });
    await sheet.getByRole("button", { name: /Join campaign/ }).click();
    await expect(page.getByText(`You're in. Welcome to ${c.title}.`)).toBeVisible();
    await expect(sheet.getByRole("link", { name: "↗ https://youtube.com/@creator/live" })).toBeVisible();
    await sheet.getByRole("button", { name: /Send a clip/ }).click();
    await expect(sheet).toBeHidden();
    const link = page.getByPlaceholder("https://youtube.com/shorts/…  or an Instagram, X or TikTok link");
    await expect(link).toBeFocused();
    // send an X clip from the profile's own account
    const url = xLink(handle);
    await link.fill(url);
    await page.getByRole("button", { name: /Send clip for verification/ }).click();
    await expect(page.getByText(/^Clip sent\. Your account is confirmed\. Views are counted on/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^My clips/ })).toContainText("1");
    await expect(page.getByRole("link", { name: new RegExp(`^X · x\\.com/${handle}/status/`) })).toBeVisible();
    await expect(page.getByText("✓ Your account")).toBeVisible();
    // the same clip again is refused
    await page.getByRole("button", { name: /^Send a clip/ }).click();
    await link.fill(url);
    await page.getByRole("button", { name: /Send clip for verification/ }).click();
    await expect(page.getByText("That clip has already been sent in for this campaign.")).toBeVisible();
    // remove it: dismissing the browser's question keeps it
    await page.getByRole("button", { name: /^My clips/ }).click();
    page.once("dialog", d => void d.dismiss());
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("link", { name: new RegExp(`^X · x\\.com/${handle}`) })).toBeVisible();
    page.once("dialog", d => void d.accept());
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Clip removed.")).toBeVisible();
    await expect(page.getByText("No clips yet", { exact: true })).toBeVisible();
    // sign out from the nav
    const out = page.waitForRequest(r => r.url().endsWith("/api/auth/logout"));
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await out;
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
  });

  test("[EARN-SUB-10, EARN-ROUTE-05] a clip sent from the app (#submit=) asks a signed-out visitor to sign up first", async ({ page }) => {
    await page.goto("/earn#submit=" + encodeURIComponent("https://x.com/someone/status/1"));
    await expect(page).toHaveURL(/\/signup\?next=%2Fearn%23submit%3D/);
  });
});

test.describe("Earn admin", () => {
  test("[EADM-SRV-01, EADM-HDR-01, EADM-HDR-02, EADM-NAV-01, EADM-NAV-02, EADM-NAV-03, EADM-CAMP-10, EADM-CAMP-11, EADM-CAMP-12, EADM-CAMP-14] the shell, the tabs, and a campaign's Go live, Pause and End", async ({ page, admin, playwright, baseURL, dataDir }) => {
    void admin;
    const c = await seedCampaign(await adminRequest(playwright, baseURL!, dataDir), { status: "draft" });
    await page.goto("/admin/earn");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overview");
    await expect(page.getByText("Campaigns, clips waiting for review, and money owed")).toBeVisible();
    await expect(page.getByRole("button", { name: /New campaign/ })).toBeVisible();
    for (const [name, path, sub] of [["Review clips", "review", "Check each clip, set its views, then approve or reject it"],
      ["Clippers", "clippers", "Everyone who signed up: payout details, account handles and campaigns"],
      ["Payouts", "payouts", "What each clipper is owed, and the record of what was sent"],
      ["Settings", "settings", "The YouTube key that counts views automatically"],
      ["Campaigns", "campaigns", "Create campaigns, set budgets and rates, and go live"]]) {
      await page.getByRole("link", { name: new RegExp("^" + name) }).first().click();
      await expect(page).toHaveURL(new RegExp(`/admin/earn/${path}$`));
      await expect(page.getByText(sub)).toBeVisible();
    }
    const row = page.getByRole("row", { name: new RegExp(c.title) });
    await expect(row).toContainText("Draft");
    await expect(row.getByRole("link", { name: "View" })).toHaveAttribute("href", `/earn#c=${c.slug}`);
    await row.getByRole("button", { name: "Go live" }).click();
    await expect(page.getByText("Live and open. Clippers can join now.")).toBeVisible();
    await row.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByText(/^Campaign is now paused/i)).toBeVisible();
    await row.getByRole("button", { name: "End" }).click();
    await expect(page.getByText(/^Campaign is now ended/i)).toBeVisible();
    await expect(row.getByRole("button", { name: "End" })).toHaveCount(0);
    await page.goto("/admin/earn/nothing-here");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overview");
  });
});
