/* The admin dashboard (/admin). With sign-in on it runs on its own server ("site" project), one test at a time, so
   its lists hold only what these tests made. With sign-in off ("local") the built-in owner is the admin. */
import { dialog, expect, newUser, signIn, signUp, test, uid, type User } from "./fixtures";
import type { Page } from "@playwright/test";

const adminNav = (page: Page) => page.getByRole("navigation", { name: "Admin" });
const h1 = (page: Page) => page.getByRole("heading", { level: 1 });

test.describe("who may open it", () => {
  test("[ADM-SRV-01, ADM-SRV-02, ADM-SRV-03, EADM-SRV-01, EADM-SRV-02] signed out and normal users get Not Found", async ({ playwright, baseURL, mode }) => {
    test.skip(mode === "local", "with sign-in off the owner is always the admin");
    const visitor = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "X-Forwarded-For": "10.9.9." + Math.floor(Math.random() * 200 + 1) } });
    for (const p of ["/admin", "/admin/users", "/admin/earn"]) {
      const r = await visitor.get(p);
      expect(r.status(), p).toBe(404);
      expect(await r.json()).toEqual({ detail: "Not Found" });
    }
    await signUp(visitor, newUser());
    for (const p of ["/admin", "/admin/users", "/admin/earn"]) expect((await visitor.get(p)).status(), p).toBe(404);
    await visitor.dispose();
  });
});

test.describe("the dashboard", () => {
  test("[ADM-SRV-01, ADM-HDR-01, ADM-HDR-02, ADM-HDR-03, ADM-HDR-05, ADM-HDR-06, ADM-HDR-07, ADM-NAV-01, ADM-NAV-02, ADM-NAV-03, ADM-NAV-05, ADM-OVR-01] the shell and moving between sections", async ({ page, admin, mode }) => {
    await page.goto("/admin");
    await expect(page).toHaveTitle("ClipCrest Admin");
    await expect(h1(page)).toHaveText("Overview");
    await expect(page.getByText("Sign-ups, videos and AI use across this ClipCrest server.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
    await expect(page.getByText(admin ? admin.email : "you@localhost")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to the app" })).toHaveAttribute("href", "/app");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    // Earn campaigns: always with sign-in on; not on a downloaded copy without Earn
    await expect(page.getByRole("link", { name: "Earn campaigns" })).toHaveCount(mode === "local" ? 0 : 1);
    for (const t of ["Accounts in total", "Videos processed", "AI calls in total"]) await expect(page.getByText(t).first()).toBeVisible();
    for (const [name, url, heading] of [["Users", /\/admin\/users$/, "Users"], ["Feedback", /\/admin\/feedback$/, "Feedback"], ["Activity", /\/admin\/activity$/, "Activity"]] as const) {
      await adminNav(page).getByRole("link", { name: new RegExp("^" + name) }).click();
      await expect(page).toHaveURL(url);
      await expect(h1(page)).toHaveText(heading);
    }
    await page.goBack();
    await expect(h1(page)).toHaveText("Feedback");
    await page.goForward();
    await expect(h1(page)).toHaveText("Activity");
    await page.goto("/admin/activity");
    await expect(h1(page)).toHaveText("Activity");
    await expect(page.getByText("Everything admins have done, newest first.")).toBeVisible();
    await page.goto("/admin/nothing-here");
    await expect(h1(page)).toHaveText("Overview");
    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(page.getByText("Up to date")).toBeVisible();
  });

  test("[ADM-USR-01, ADM-USR-02, ADM-USR-03, ADM-USR-04, ADM-USR-05, ADM-USR-06, ADM-UDLG-01, ADM-UDLG-02, ADM-UDLG-03, ADM-UDLG-09] the users list and an account's dialog", async ({ page, admin, mode, playwright, baseURL }) => {
    let other: User | null = null;
    if (mode === "accounts") {
      other = newUser("Plain");
      const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "X-Forwarded-For": "10.8.8." + Math.floor(Math.random() * 200 + 1) } });
      await signUp(ctx, other);
      await ctx.dispose();
    }
    await page.goto("/admin/users");
    await expect(h1(page)).toHaveText("Users");
    await expect(page.getByText("Every account. Open one to see how much it uses the AI.")).toBeVisible();
    const search = page.getByRole("searchbox", { name: "Search accounts" });
    await expect(search).toHaveAttribute("placeholder", "Search by name or email");
    const total = Number((await page.getByText(/^\d+ of \d+$/).textContent())!.split(" of ")[1]);
    await expect(adminNav(page).getByRole("link", { name: /^Users/ })).toContainText(String(total));     // the badge
    const me = admin ? admin.email : "you@localhost";
    await search.fill(me.slice(0, 12));
    await expect(page.getByText(`1 of ${total}`)).toBeVisible();
    await expect(search).toBeFocused();
    const myRow = page.getByRole("row", { name: new RegExp(me.replace(/[.@]/g, "\\$&")) });
    await expect(myRow).toContainText("Admin");
    await search.fill("zzz-nobody-" + uid());
    await expect(page.getByText("No accounts match")).toBeVisible();
    await expect(page.getByText("Try another search or filter.")).toBeVisible();
    await search.fill("");
    await page.getByRole("button", { name: "Admins" }).click();
    await expect(myRow).toBeVisible();
    if (other) await expect(page.getByRole("row", { name: new RegExp(other.email.replace(/[.@]/g, "\\$&")) })).toHaveCount(0);
    await page.getByRole("button", { name: "All", exact: true }).click();
    await page.getByRole("button", { name: "AI calls" }).click();                   // sort
    // an admin's dialog: facts and no Disable or Delete
    await myRow.click();
    const d = page.getByRole("dialog");
    await expect(d.getByText(me).first()).toBeVisible();
    await expect(d.getByText("Signed-in devices")).toBeVisible();
    await expect(d.getByText("No AI calls yet.")).toBeVisible();
    await expect(d.getByRole("button", { name: "Disable account" })).toHaveCount(0);
    await expect(d.getByRole("button", { name: "Delete account" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(d).toBeHidden();
    await myRow.click();
    await d.getByRole("button", { name: "Close" }).click();
    await expect(d).toBeHidden();
  });

  test.fixme("[ADM-ACC-01, ADM-ACC-02, ADM-ACC-03, ADM-ACC-04, ADM-LOG-02] disabling and enabling an account (Q-59)", async ({ page, admin, mode, playwright, baseURL }) => {
    // Old-UI bug Q-59, confirmed in Edge: closing the account dialog fires its close event late, which answers the new
    // "Disable this account?" question with No by itself, so the request is never sent.
    test.skip(mode === "local", "with sign-in off there is only the owner");
    void admin;
    const other = newUser("Target");
    const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "X-Forwarded-For": "10.7.7." + Math.floor(Math.random() * 200 + 1) } });
    await signUp(ctx, other);
    await page.goto("/admin/users");
    const row = page.getByRole("row", { name: new RegExp(other.email.replace(/[.@]/g, "\\$&")) });
    await row.click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Disable account" }).click();
    const ask = dialog(page, "Disable this account?");
    await expect(ask).toBeVisible();
    await ask.getByRole("button", { name: "Cancel" }).click();
    await row.click();
    await page.getByRole("dialog").getByRole("button", { name: "Disable account" }).click();
    await dialog(page, "Disable this account?").getByRole("button", { name: "Disable account" }).click();
    await expect(page.getByText("Account disabled")).toBeVisible();
    await expect(row).toContainText("Disabled");
    expect((await ctx.get("/api/status")).status()).toBe(401);                       // signed out everywhere
    await row.click();
    await page.getByRole("dialog").getByRole("button", { name: "Enable account" }).click();
    await dialog(page, "Enable this account?").getByRole("button", { name: "Enable account" }).click();
    await expect(page.getByText("Account enabled")).toBeVisible();
    await page.goto("/admin/activity");
    for (const t of ["Disabled an account", "Enabled an account"]) await expect(page.getByText(t).first()).toBeVisible();
    await ctx.dispose();
  });

  test("[ADM-ACC-05, ADM-ACC-06, ADM-ACC-07, ADM-LOG-01, ADM-LOG-02] deleting an account needs its email typed", async ({ page, admin, mode, playwright, baseURL }) => {
    test.skip(mode === "local", "with sign-in off there is only the owner");
    void admin;
    const other = newUser("Doomed");
    const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "X-Forwarded-For": "10.6.6." + Math.floor(Math.random() * 200 + 1) } });
    await signUp(ctx, other);
    await page.goto("/admin/users");
    const row = page.getByRole("row", { name: new RegExp(other.email.replace(/[.@]/g, "\\$&")) });
    // the browser asks for the email
    await row.click();
    page.once("dialog", p => void p.dismiss());
    await page.getByRole("dialog").getByRole("button", { name: "Delete account" }).click();
    await expect(row).toBeVisible();
    await row.click();
    page.once("dialog", p => void p.accept("wrong@example.com"));
    await page.getByRole("dialog").getByRole("button", { name: "Delete account" }).click();
    await expect(page.getByText("Type the account's email address exactly to confirm.")).toBeVisible();
    await row.click();                                                         // each answer closes the account dialog
    page.once("dialog", p => { expect(p.message()).toContain(`Delete ${other.email} and everything in the account for good?`); void p.accept(other.email.toUpperCase()); });
    await page.getByRole("dialog").getByRole("button", { name: "Delete account" }).click();
    await expect(page.getByText("Account deleted")).toBeVisible();
    await expect(row).toHaveCount(0);
    await page.goto("/admin/activity");
    for (const t of ["Deleted an account", "Made an admin"]) await expect(page.getByText(t).first()).toBeVisible();
    await expect(page.getByText("set from the server command line").first()).toBeVisible();
    await ctx.dispose();
  });

  test("[ADM-FB-01, ADM-FB-02, ADM-FB-03, ADM-FB-04, ADM-FB-05, ADM-FB-06, ADM-FB-07, ADM-FB-08, ADM-FB-09, ADM-HDR-04, ADM-NAV-04] the feedback inbox", async ({ page, admin, mode }) => {
    void admin;
    const msg = "The export button is hard to find " + uid();
    const r = await page.request.post("/api/feedback", { data: { kind: "bug", message: msg + "\nsecond line", page: "/app/videos", context: "Video failed: x" } });
    expect(r.ok()).toBeTruthy();
    await page.goto("/admin/feedback");
    await expect(h1(page)).toHaveText("Feedback");
    await expect(page.getByText("Bug reports, feature ideas and other messages from users.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^New · \d+$/ })).toBeVisible();
    await expect(page.getByText(msg)).toBeVisible();
    await expect(page.getByText("Video failed: x")).toBeVisible();
    await expect(page.getByText("Bug", { exact: true }).first()).toBeVisible();
    const me = admin ? admin.email : "you@localhost";
    await expect(page.getByRole("link", { name: "Reply by email" }).first()).toHaveAttribute("href", `mailto:${me}?subject=About%20your%20ClipCrest%20feedback`);
    await page.getByRole("button", { name: "Mark seen" }).first().click();
    await expect(page.getByText("Marked seen")).toBeVisible();
    await page.getByRole("button", { name: /^Seen/ }).click();
    await expect(page.getByText(msg)).toBeVisible();
    await page.getByRole("button", { name: "Done", exact: true }).nth(1).click();     // the item's (the first is the filter)
    await expect(page.getByText("Marked done")).toBeVisible();
    await page.getByRole("button", { name: /^Done/ }).first().click();
    await page.getByRole("button", { name: "Reopen" }).first().click();
    await expect(page.getByText("Reopened")).toBeVisible();
    void mode;
  });

  test("[ADM-HDR-08] Sign out", async ({ page, admin, mode }) => {
    await page.goto("/admin");
    await expect(h1(page)).toHaveText("Overview");
    await page.getByRole("button", { name: "Sign out" }).click();
    if (mode === "local") await expect(page).toHaveURL(/\/app$/);       // nothing to sign out of: back to the app
    else {
      await expect(page).toHaveURL(/\/$/);
      expect((await page.request.get("/admin")).status()).toBe(404);
      await signIn(page.request, admin!);
    }
  });
});
