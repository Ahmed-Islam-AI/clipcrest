/* The public pages: the landing page (at /clip-maker always, and at / with sign-in on) and the three legal pages. */
import { expect, test } from "./fixtures";

const DOWNLOAD = "https://github.com/Ahmed-Islam-AI/clipcrest/releases/latest";

test.describe("landing page", () => {
  test("[LAND-01, LAND-03, LAND-14] the page as served: placeholders filled, the download address, search tags", async ({ request, baseURL }) => {
    const html = await (await request.get("/clip-maker")).text();
    expect(html).not.toContain("{{");
    expect(html).toContain(DOWNLOAD);                                       // where the download buttons go on an Earn-only site
    expect(html).toContain(`<link rel="canonical" href="${baseURL}/">`);
    expect(html).toContain(`content="${baseURL}/"`);                       // og:url
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1])["@type"]);
    expect(blocks).toEqual(["SoftwareApplication", "Organization", "FAQPage"]);
  });

  test("[LAND-01, LAND-02, LAND-04, LAND-05, LAND-06, LAND-07, LAND-08, LAND-09, LAND-10, LAND-11, LAND-13, LAND-16, LAND-17, LAND-18, LAND-19] what the page shows", async ({ page }) => {
    await page.goto("/clip-maker");
    await expect(page).toHaveTitle("ClipCrest: AI Clip Maker for Twitch, Kick & YouTube Live Streams");
    await expect(page.getByText("{{")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Clip live streams while they are still live");
    const sections = page.getByRole("navigation", { name: "Sections" });
    for (const [name, href] of [["How it works", "#how"], ["Features", "#features"], ["Open source", "#open"], ["Who it's for", "#for"], ["FAQ", "#faq"]])
      await expect(sections.getByRole("link", { name })).toHaveAttribute("href", href);
    await expect(page.getByRole("textbox", { name: "Video link" }).first()).toHaveAttribute("placeholder", "Paste a YouTube, Twitch or Kick link");
    await expect(page.getByRole("button", { name: /Get clips/ })).toHaveCount(2);           // in the hero and at the end
    for (const t of ["Free and open source", "Uses your own AI key", "Runs on your own PC"]) await expect(page.getByText(t).first()).toBeVisible();
    for (const f of ["Kai Cenat GTA 6 reaction", "IShowSpeed on GTA 6", "GTA 6 trailer stream reaction"]) await expect(page.getByRole("figure", { name: f })).toBeVisible();
    await expect(page.getByText("Example clips made with ClipCrest from public streams, credited to the creators. Not affiliated with or endorsed by them.")).toBeVisible();
    for (const t of ["Clips from", "Posts straight to", "Your own video files", "YouTube Shorts", "Instagram Reels"]) await expect(page.getByText(t, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Read the code" })).toHaveAttribute("href", "https://github.com/Ahmed-Islam-AI/clipcrest");
    // every section becomes visible when scrolled to
    for (const h of ["Your last stream is a week of clips."]) {
      await page.getByRole("heading", { name: h }).scrollIntoViewIfNeeded();
      await expect(page.getByRole("heading", { name: h })).toBeVisible();
    }
    // the FAQ: the first answer is open
    await expect(page.getByText("Yes. ClipCrest is free and open source.", { exact: false })).toBeVisible();
    await expect(page.getByText(/^Your own\. Add an API key/)).toBeHidden();
    await page.getByText("Which AI does it use?").click();
    await expect(page.getByText(/^Your own\. Add an API key/)).toBeVisible();
    await expect(page.getByText(`© ${new Date().getFullYear()} ClipCrest`)).toBeVisible();
  });

  test("[LAND-15] Who it's for: five tabs", async ({ page }) => {
    await page.goto("/clip-maker");
    const tabs = page.getByRole("tablist", { name: "Who ClipCrest is for" }).getByRole("tab");
    await expect(tabs).toHaveText(["Clippers", "Streamers", "Podcasters", "Agencies", "Marketing teams"]);
    for (const name of ["Streamers", "Podcasters", "Agencies", "Marketing teams", "Clippers"]) {
      await page.getByRole("tab", { name }).click();
      await expect(page.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
    }
  });

  test("[LAND-03, LAND-12] Earn pieces and the signed-in buttons follow the server", async ({ page, mode }) => {
    await page.goto("/clip-maker");
    const earn = page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: /Earn/ });
    if (mode === "local") {
      // a downloaded copy has no Earn, and its owner is always "signed in"
      await expect(earn).toBeHidden();
      await expect(page.getByText("Earn money clipping: paid campaigns are live")).toBeHidden();
      await expect(page.getByText(/^Earn with ClipCrest\./)).toBeHidden();
      await expect(page.getByRole("link", { name: "Earn: paid campaigns" })).toBeHidden();
      await expect(page.getByRole("link", { name: "Open ClipCrest" })).toHaveAttribute("href", "/app");
      await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Upload a video" })).toHaveAttribute("href", "/app");
    } else {
      await expect(earn).toHaveAttribute("href", "/earn");
      await expect(page.getByText("Earn money clipping: paid campaigns are live")).toBeVisible();
      await expect(page.getByText("Earn with ClipCrest.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Earn: paid campaigns" })).toHaveAttribute("href", "/earn");
      await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
      await expect(page.getByRole("banner").getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
      await expect(page.getByRole("link", { name: "Upload a video" })).toHaveAttribute("href", "/signup");
    }
  });

  test("[LAND-02, LAND-08] at phone width: no header links, no Sign in, only the middle demo clip", async ({ page, mode }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/clip-maker");
    await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "FAQ" })).toBeHidden();
    if (mode === "accounts") await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeHidden();
    await expect(page.getByRole("figure", { name: "IShowSpeed on GTA 6" })).toBeVisible();
    await expect(page.getByRole("figure", { name: "Kai Cenat GTA 6 reaction" })).toBeHidden();
  });

  test.fixme("[LAND-12] signed in, the footer's Sign up becomes Open ClipCrest too (Q-24)", async ({ page, mode }) => {
    // Old-UI quirk Q-24: the footer keeps "Sign up" for people who are signed in.
    test.skip(mode === "accounts", "the built-in owner is always signed in");
    await page.goto("/clip-maker");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Sign up" })).toHaveCount(0);
  });

  test("[LAND-05, APP-ROUTE-11] signed in, a pasted link goes straight into the app", async ({ page, mode, user }) => {
    test.skip(mode === "accounts", "covered by the sign-up version in auth.spec.ts");
    void user;
    await page.route(u => u.pathname === "/api/preview", r => r.fulfill({ status: 422, json: { detail: "Couldn't open that video. Check the link is public and complete." } }));
    await page.goto("/clip-maker");
    await page.getByRole("textbox", { name: "Video link" }).first().fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("button", { name: /Get clips/ }).first().click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByText("Your link is ready. Press Make clips.")).toBeVisible();
    await expect(page.getByText("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBeVisible();
  });

  test("[LAND-01] with sign-in off, / opens the app", async ({ page, mode }) => {
    await page.goto("/");
    if (mode === "local") await expect(page).toHaveURL(/\/app$/);
    else await expect(page.getByRole("heading", { level: 1 })).toHaveText("Clip live streams while they are still live");
  });
});

test.describe("legal pages", () => {
  const PAGES = [["/terms", "Terms of Service"], ["/privacy", "Privacy Policy"], ["/acceptable-use", "Acceptable Use Policy"]];

  test("[LEGAL-01, LEGAL-02, LEGAL-05] each address shows its policy, with every placeholder filled", async ({ page, request, baseURL }) => {
    for (const [address, name] of PAGES) {
      const html = await (await request.get(address)).text();
      expect(html, address).not.toContain("{{");
      expect(html).toContain(`<link rel="canonical" href="${baseURL}${address}">`);
      await page.goto(address);
      await expect(page).toHaveTitle(`${name} | ClipCrest`);
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(page.getByText("Last updated 18 November 2026").filter({ visible: true })).toHaveCount(1);
    }
    await page.goto("/terms");
    await expect(page.getByText(/agreement between you and ClipCrest \("ClipCrest"/)).toBeVisible();
    await expect(page.getByText(/governed by the laws of the country where ClipCrest's operator is established/)).toBeVisible();
    await expect(page.getByText("the contact details on our website").first()).toBeVisible();
  });

  test("[LEGAL-03, LEGAL-04, LEGAL-06] switching between the policies without reloading, and back", async ({ page }) => {
    await page.goto("/terms");
    await page.evaluate(() => { (window as any).__samePage = true; });
    const tabs = page.getByRole("navigation", { name: "Legal pages" });
    await expect(tabs.getByRole("link")).toHaveText(["Terms", "Privacy", "Acceptable use"]);
    await tabs.getByRole("link", { name: "Privacy" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page).toHaveTitle("Privacy Policy | ClipCrest");
    await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeHidden();
    expect(await page.evaluate(() => (window as any).__samePage)).toBe(true);    // no reload
    await page.goBack();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeVisible();
    const footer = page.getByRole("contentinfo");
    for (const [name, href] of [["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"], ["Acceptable Use", "/acceptable-use"], ["Sign in", "/login"]])
      await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    await expect(footer).toContainText(`© ${new Date().getFullYear()} ClipCrest`);
    await expect(footer.getByRole("link", { name: /Earn/ })).toHaveCount(0);
  });
});
