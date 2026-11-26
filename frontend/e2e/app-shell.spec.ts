/* The app's frame: sidebar, top bar, addresses, the account menu, and what changes with sign-in on or off. */
import { addCreator, createCreator, creatorItem, expect, FOLLOW, menu, menuItem, meButton, navItem, openApp, REPO, sidebar, test, title, uid } from "./fixtures";

test.describe("frame and navigation", () => {
  test("[APP-SHELL-01, APP-SHELL-03, APP-NAV-01, APP-NAV-03, APP-NAV-06, APP-NAV-08, APP-NAV-14, APP-TOP-01, APP-TOP-02] Home shows the sidebar, title and greeting", async ({ app: page }) => {
    await expect(page).toHaveTitle(/ClipCrest/);
    await expect(sidebar(page).getByRole("img", { name: "ClipCrest" }).first()).toBeVisible();
    for (const name of ["Home", "All videos", "New creator"]) await expect(navItem(page, name)).toBeVisible();
    await expect(sidebar(page).getByText("Creators", { exact: true })).toBeVisible();
    await expect(page.getByText(/^Good (morning|afternoon|evening)\. \d+ creators?(, \d+ recording now)?\.$/)).toBeVisible();
  });

  test("[APP-NAV-03, APP-NAV-04, APP-NAV-10, APP-TOP-01, APP-TOP-02, APP-ROUTE-02, APP-ROUTE-03, APP-ROUTE-04, APP-SHELL-03] the sidebar moves between views; back and forward retrace them", async ({ app: page }) => {
    await navItem(page, "All videos").click();
    await expect(page).toHaveURL(/\/app\/videos$/);
    await expect(title(page)).toHaveText("All videos");
    await expect(page.getByText("Every video and recording, across all creators.")).toBeVisible();

    await sidebar(page).getByRole("button", { name: /^AI\b/ }).click();          // the AI card
    await expect(page).toHaveURL(/\/app\/usage$/);
    await expect(title(page)).toHaveText("AI usage");
    await expect(page.getByText("What the AI has been used for.")).toBeVisible();
    await expect(page).toHaveTitle(/ClipCrest/);

    await page.goBack();
    await expect(title(page)).toHaveText("All videos");
    await expect(page).toHaveURL(/\/app\/videos$/);
    await page.goBack();
    await expect(title(page)).toHaveText("Home");
    await expect(page).toHaveURL(/\/app$/);
    await page.goForward();
    await expect(title(page)).toHaveText("All videos");
    await navItem(page, "Home").click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(title(page)).toHaveText("Home");
  });

  test("[APP-ROUTE-01, APP-ROUTE-05, APP-SHELL-02] every app address opens its view when loaded directly", async ({ page, user, mode }) => {
    void user;
    const views: [string, string, RegExp][] = [
      ["/app", "Home", /\/app$/],
      ["/app/videos", "All videos", /\/app\/videos$/],
      ["/app/videos/", "All videos", /\/app\/videos$/],
      ["/app/usage", "AI usage", /\/app\/usage$/],
      ["/app/settings/apps", "Settings", /\/app\/settings\/apps$/],
      ["/app/nothing-here", "Home", /\/app$/],
    ];
    if (mode === "local") views.push(["/app/settings/ai", "Settings", /\/app\/settings\/ai$/], ["/app/settings/storage", "Settings", /\/app\/settings\/storage$/]);
    else views.push(["/app/settings/profile", "Settings", /\/app\/settings\/profile$/], ["/app/settings/security", "Settings", /\/app\/settings\/security$/]);
    for (const [address, heading, url] of views) {
      await openApp(page, address, heading);
      await expect(page, address).toHaveURL(url);
    }
    // a section heading proves the right Settings section is showing, not just the Settings page
    await openApp(page, "/app/settings/apps", "Settings");
    await expect(page.getByRole("heading", { level: 2, name: "Connected apps" })).toBeVisible();
  });

  test("[APP-ROUTE-05, APP-ROUTE-01] /app/settings without a section tidies the address to the first section (Q-02)", async ({ page, user, mode }) => {
    // Old-UI bug: the address becomes /app/settings/clips (the creator tab name leaks into the settings address).
    // Passes only on the React app, which fixes it.
    void user;
    await openApp(page, "/app/settings", "Settings");
    await expect(page).toHaveURL(mode === "local" ? /\/app\/settings\/ai$/ : /\/app\/settings\/profile$/);
  });

  test("[APP-ROUTE-01, APP-ROUTE-05, APP-TOP-03, APP-TOP-04] creator addresses open the creator and the right tab", async ({ app: page }) => {
    const name = "Deep " + uid();
    await addCreator(page, name);
    await expect(page).toHaveURL(/\/app\/creators\/[^/]+\/setup$/);         // no channel yet: Setup first
    const base = page.url().replace(/\/setup$/, "");
    await openApp(page, base, name);
    await expect(page.getByRole("tab", { name: /Clips/ })).toHaveAttribute("aria-selected", "true");
    await openApp(page, base + "/activity", name);
    await expect(page.getByRole("tab", { name: /Activity/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Workspace created for " + name)).toBeVisible();
    await openApp(page, base + "/setup", name);
    await expect(page.getByRole("tab", { name: /Setup/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("No channel yet")).toBeVisible();
    await openApp(page, base + "/clips", name);
    await expect(page).toHaveURL(base);                                     // the Clips tab is left out of the address
  });

  test("[APP-ROUTE-03, APP-ROUTE-04, APP-ROUTE-02] back and forward through a creator, its tab, Settings and AI usage", async ({ page, user }) => {
    void user;
    const name = "Hist " + uid();
    const id = await createCreator(page.request, name);
    await openApp(page, "/app", "Home");
    await navItem(page, "All videos").click();
    await expect(title(page)).toHaveText("All videos");
    await creatorItem(page, name).click();
    await expect(title(page)).toHaveText(name);
    await expect(page).toHaveURL(new RegExp(`/app/creators/${id}$`));
    await page.getByRole("tab", { name: /Setup/ }).click();
    await expect(page).toHaveURL(new RegExp(`/app/creators/${id}/setup$`));
    await meButton(page).click();
    await menuItem(page, "Settings").click();
    await expect(page).toHaveURL(/\/app\/settings\/\w+$/);
    await expect(menu(page)).toBeHidden();        // it fades out; a click while it fades would close it instead
    await meButton(page).click();
    await menuItem(page, "AI usage").click();
    await expect(page).toHaveURL(/\/app\/usage$/);
    const back: [RegExp, string][] = [[/\/app\/settings\/\w+$/, "Settings"], [new RegExp(`/app/creators/${id}/setup$`), name],
      [/\/app\/videos$/, "All videos"], [/\/app$/, "Home"]];          // switching the creator's tab added no entry
    for (const [url, heading] of back) {
      await page.goBack();
      await expect(page).toHaveURL(url);
      await expect(title(page)).toHaveText(heading);
    }
    await page.goForward();
    await expect(title(page)).toHaveText("All videos");
    await page.goForward();
    await expect(title(page)).toHaveText(name);
    await expect(page.getByRole("tab", { name: /Setup/ })).toHaveAttribute("aria-selected", "true");
  });

  test("[APP-ROUTE-09] /app always opens Home, whatever view was open last", async ({ page, user }) => {
    void user;
    const id = await createCreator(page.request, "Last " + uid());
    await page.goto("/app/creators/" + id + "/activity");
    await expect(page.getByRole("tab", { name: /Activity/ })).toHaveAttribute("aria-selected", "true");
    await openApp(page, "/app/videos", "All videos");
    await openApp(page, "/app", "Home");
    await page.reload();
    await expect(title(page)).toHaveText("Home");
  });

  test("[APP-ROUTE-01, APP-TOP-04] a Settings section never leaks into a creator page (Q-04)", async ({ page, user }) => {
    // Old-UI bug Q-04: after /app/settings/apps, clicking a creator shows no tab and the address /app/creators/<id>/apps.
    // Passes only on the React app, which fixes it.
    void user;
    const name = "Leak " + uid();
    const id = await createCreator(page.request, name);
    await openApp(page, "/app/settings/apps", "Settings");
    await creatorItem(page, name).click();
    await expect(title(page)).toHaveText(name);
    await expect(page).toHaveURL(new RegExp(`/app/creators/${id}$`));
    await expect(page.getByRole("tab", { name: /Clips/ })).toHaveAttribute("aria-selected", "true");
  });

  test("[APP-ROUTE-06] a creator address that is not yours opens Home", async ({ app: page }) => {
    await openApp(page, "/app/creators/c_nobody_" + uid(), "Home");
    await expect(page).toHaveURL(/\/app$/);
  });

  test("[APP-ROUTE-07, APP-SET-02] a Settings section you may not see shows the first one you can", async ({ page, user, mode }) => {
    void user;
    if (mode === "local") {          // no profile with sign-in off: the AI section (the owner is an admin)
      await openApp(page, "/app/settings/profile", "Settings");
      await expect(page.getByRole("heading", { level: 2, name: "AI" })).toBeVisible();
    } else {                         // AI is for admins: a normal user gets the profile
      await openApp(page, "/app/settings/ai", "Settings");
      await expect(page.getByRole("heading", { level: 2, name: "Profile" })).toBeVisible();
    }
  });

  test("[APP-NAV-02, APP-NAV-14, APP-ROUTE-09] the view and the collapsed sidebar survive a reload", async ({ app: page }) => {
    await navItem(page, "All videos").click();
    await expect(title(page)).toHaveText("All videos");
    const width = async () => (await sidebar(page).boundingBox())!.width;
    expect(await width()).toBeGreaterThan(180);
    await page.getByRole("button", { name: /(Collapse|Expand) sidebar/ }).click();
    await expect.poll(width).toBeLessThan(120);
    await expect(navItem(page, "All videos")).toBeVisible();                 // still there, as an icon with its name
    await page.reload();
    await expect(title(page)).toHaveText("All videos");
    await expect.poll(width).toBeLessThan(120);
    await page.getByRole("button", { name: /(Collapse|Expand) sidebar/ }).click();
    await expect.poll(width).toBeGreaterThan(180);
    await page.reload();
    await expect(title(page)).toHaveText("All videos");
    await expect.poll(width).toBeGreaterThan(180);
  });

  test("[APP-ROUTE-10] one-time messages in the address show once and the address is tidied", async ({ page, user }) => {
    void user;
    await page.goto("/app/settings/apps?connected=youtube&name=Test%20Channel");
    await expect(page.getByText("Test Channel is connected. Pick it in a creator's Setup to post there.")).toBeVisible();
    await expect(page).toHaveURL(/\/app\/settings\/apps$/);
    await page.goto("/app/settings/apps?connect_error=The%20platform%20said%20no");
    await expect(page.getByText("The platform said no")).toBeVisible();
    await expect(page).toHaveURL(/\/app\/settings\/apps$/);
    await page.goto("/app?verified=1");
    await expect(page.getByText("Email confirmed. You're ready to clip.")).toBeVisible();
    await expect(page).toHaveURL(/\/app$/);
    await page.goto("/app?verify_error=That%20link%20has%20expired");
    await expect(page.getByText("That link has expired")).toBeVisible();
    await expect(page).toHaveURL(/\/app$/);
  });

  test("[APP-TOP-06, APP-TOP-07, APP-EARN-03] Star on GitHub and Follow me on Home and All videos, not elsewhere", async ({ app: page }) => {
    for (const view of ["Home", "All videos"]) {
      await navItem(page, view).click();
      await expect(title(page)).toHaveText(view);
      const star = page.getByRole("link", { name: /Star/ });
      await expect(star).toHaveAttribute("href", REPO);
      await expect(star).toHaveAttribute("target", "_blank");
      const follow = page.getByRole("link", { name: "Follow me" });
      await expect(follow).toHaveAttribute("href", FOLLOW);
      await expect(follow).toHaveAttribute("target", "_blank");
      await expect(follow).toHaveAttribute("title", "Follow the maker of ClipCrest on LinkedIn");
    }
    for (const [address, heading] of [["/app/usage", "AI usage"], ["/app/settings/apps", "Settings"]]) {
      await openApp(page, address, heading);
      await expect(page.getByRole("link", { name: "Follow me" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /Star/ })).toHaveCount(0);
    }
  });

  test("[APP-NAV-05, APP-EARN-01, APP-EARN-02] Earn shows only when the server has it", async ({ app: page, mode }) => {
    const earn = navItem(page, /^Earn( New)?$/);
    if (mode === "local") {          // a downloaded copy has no Earn: earn_url is null
      await expect(earn).toHaveCount(0);
      await expect(page.getByText("Earn", { exact: true })).toHaveCount(0);
    } else {                         // with sign-in on, Earn is this site's /earn
      await expect(earn).toHaveAttribute("href", "/earn");
      await expect(earn).toContainText("New");
      await expect(earn).not.toHaveAttribute("target", "_blank");
    }
  });

  test("[APP-NAV-10, APP-HOME-05] the AI card says the AI is not set up and opens AI usage", async ({ app: page }) => {
    const card = sidebar(page).getByRole("button", { name: /^AI\b/ });
    await expect(card).toContainText("Not set up");
    await expect(card).toHaveAttribute("title", "The AI is not set up");
    await card.click();
    await expect(title(page)).toHaveText("AI usage");
  });
});

test.describe("phone width", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("[APP-NAV-13, APP-SHELL-09] the menu drawer opens, closes, and navigates", async ({ app: page }) => {
    const side = sidebar(page);
    await expect(side).not.toBeInViewport();
    await expect(page.getByRole("button", { name: /(Collapse|Expand) sidebar/ })).toBeHidden();   // no rail on phones
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(side).toBeInViewport({ ratio: 0.9 });
    await page.mouse.click(370, 420);                    // the dimmed page beside the drawer
    await expect(side).not.toBeInViewport();
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(side).toBeInViewport({ ratio: 0.9 });
    await navItem(page, "All videos").click();
    await expect(title(page)).toHaveText("All videos");
    await expect(side).not.toBeInViewport();             // choosing a view closes the drawer
    await page.getByRole("button", { name: "Open menu" }).click();
    await meButton(page).click();
    await menuItem(page, "Settings").click();
    await expect(title(page)).toHaveText("Settings");
    await expect(side).not.toBeInViewport();
  });
});

test.describe("account menu", () => {
  test("[APP-ACCT-01, APP-ACCT-02, APP-ACCT-03, APP-NAV-11, APP-KEY-01] the menu lists what this person can do and closes with Esc", async ({ app: page, user, mode }) => {
    const me = meButton(page);
    if (mode === "local") { await expect(me).toContainText("Settings"); await expect(me).toContainText("AI key, connected apps"); }
    else { await expect(me).toContainText(user!.name); await expect(me).toContainText(user!.email); }
    await expect(me).toHaveAttribute("aria-expanded", "false");
    await me.click();
    await expect(menu(page)).toBeVisible();
    await expect(me).toHaveAttribute("aria-expanded", "true");
    for (const item of ["Settings", "AI usage", "Take the tour", "Send feedback"]) await expect(menuItem(page, item)).toBeVisible();
    if (mode === "local") {
      await expect(menuItem(page, "Sign out")).toHaveCount(0);
    } else {
      await expect(menu(page).getByText(user!.email)).toBeVisible();
      await expect(menuItem(page, "Sign out")).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(menu(page)).toBeHidden();
    await me.click();
    await expect(menu(page)).toBeVisible();
    await page.getByRole("heading", { level: 1 }).click();               // a click elsewhere closes it too
    await expect(menu(page)).toBeHidden();
    await me.click();
    await menuItem(page, "AI usage").click();
    await expect(title(page)).toHaveText("AI usage");
    await expect(menu(page)).toBeHidden();
    await me.click();
    await menuItem(page, "Settings").click();
    await expect(title(page)).toHaveText("Settings");
  });

  test("[APP-ACCT-04, APP-SET-12] Sign out ends the session and goes to the landing page", async ({ app: page, mode }) => {
    test.skip(mode === "local", "there is no signing out with sign-in off");
    await meButton(page).click();
    await menuItem(page, "Sign out").click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("[APP-ADML-01, APP-ADML-02, APP-ADML-03, APP-NAV-09] the Owner links show for admins with sign-in on only", async ({ page, admin, mode }) => {
    void admin;
    await openApp(page, "/app", "Home");
    if (mode === "local") {          // the owner is an admin, but the app hides the links (Q-14)
      await expect(navItem(page, "Admin dashboard")).toHaveCount(0);
      return;
    }
    await expect(sidebar(page).getByText("Owner", { exact: true })).toBeVisible();
    await expect(navItem(page, "Admin dashboard")).toHaveAttribute("href", "/admin");
    await expect(navItem(page, "Earn campaigns")).toHaveAttribute("href", "/admin/earn");
  });

  test("[APP-ADML-03, APP-SET-02, APP-HOME-05, APP-ERR-06] a normal user sees none of the admin-only parts", async ({ app: page, mode }) => {
    test.skip(mode === "local", "with sign-in off the owner is always an admin");
    await expect(navItem(page, "Admin dashboard")).toHaveCount(0);
    await expect(sidebar(page).getByText("Owner", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add AI key" })).toHaveCount(0);
    await expect(page.getByText("The AI isn't set up on this server yet, so clips are picked by loudness.")).toBeVisible();
    await openApp(page, "/app/settings", "Settings");
    const sections = page.getByRole("navigation", { name: "Settings sections" });
    await expect(sections.getByRole("link")).toHaveText([/Profile/, /Security/, /Connected apps/]);
    await openApp(page, "/app/settings/apps", "Settings");
    await expect(page.getByText("Not set up on this server")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Set up", exact: true })).toHaveCount(0);
  });
});
