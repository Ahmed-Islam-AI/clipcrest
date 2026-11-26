/* What every test starts from, and small helpers that find things the way a person does: by role, name and
   visible text, never by CSS class, id or page structure. The React pages must keep the labels listed in
   e2e/README.md. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";

export { expect };
export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const VIDEOS = { tiny: path.join(import.meta.dirname, ".tmp", "tiny.mp4"), big: path.join(import.meta.dirname, ".tmp", "big.mp4"),
  huge: path.join(import.meta.dirname, ".tmp", "huge.mp4"), cover: path.join(import.meta.dirname, ".tmp", "cover.jpg") };
export const PASSWORD = "e2e-password-123";
export const REPO = "https://github.com/Ahmed-Islam-AI/clipcrest";
export const FOLLOW = "https://www.linkedin.com/in/ahmed-islam-ai/";

export type Mode = "local" | "accounts";
export type Options = { mode: Mode; dataDir: string };
export type User = { email: string; name: string; password: string };

/** Short and unique, for names and emails, so tests never trip over each other's data. */
export const uid = () => Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
export const newUser = (label = "Tester"): User => {
  const id = uid();
  return { email: `e2e-${id}@example.com`, name: `${label} ${id}`, password: PASSWORD };
};

export async function signUp(request: APIRequestContext, u: User) {
  const r = await request.post("/api/auth/signup", { data: { email: u.email, password: u.password, name: u.name } });
  expect(r.ok(), await r.text()).toBeTruthy();
}
export async function signIn(request: APIRequestContext, u: User) {
  const r = await request.post("/api/auth/login", { data: { email: u.email, password: u.password } });
  expect(r.ok(), await r.text()).toBeTruthy();
}
/** The guided tour starts by itself for a new account; most tests are not about it. */
export async function skipTour(request: APIRequestContext) {
  expect((await request.put("/api/settings", { data: { tour_done: true } })).ok()).toBeTruthy();
}
/** A creator with no channel, made through the API (no network needed). Returns its id. */
export async function createCreator(request: APIRequestContext, name: string): Promise<string> {
  const r = await request.post("/api/creators", { data: { name, channel: "" } });
  expect(r.ok(), await r.text()).toBeTruthy();
  return (await r.json()).id;
}
/** Make an account an admin the only way there is: the command on the server. */
export function grantAdmin(email: string, dataDir: string) {
  execFileSync("uv", ["run", "--frozen", "python", "-m", "studio.admin", "grant", email],
    { cwd: ROOT, env: { ...process.env, CLIPCREST_DATA: dataDir, DATABASE_URL: "", PYTHONIOENCODING: "utf-8" }, stdio: "pipe" });
}

/** A password-reset link for this account, made on the server the way "Forgot password" makes it. With no mail set
    up the server prints the email instead of sending it, so the link is read from that print-out. */
export function resetLink(email: string, dataDir: string): string {
  const out = execFileSync("uv", ["run", "--frozen", "python", "-c", `from studio import auth, db; db.init(); auth.forgot(${JSON.stringify(email)})`],
    { cwd: ROOT, env: { ...process.env, CLIPCREST_DATA: dataDir, DATABASE_URL: "", CLIPCREST_SMTP_HOST: "", CLIPCREST_BREVO_API_KEY: "", PYTHONIOENCODING: "utf-8" }, stdio: "pipe" }).toString();
  const link = out.match(/\/reset\?t=\S+/);
  if (!link) throw new Error("no reset link printed: " + out);
  return link[0];
}

const randomIp =() => `10.${1 + Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 250)}`;

type Fixtures = {
  /** The signed-in person: a brand-new account with sign-in on, null with sign-in off (the built-in owner). */
  user: User | null;
  /** Like `user`, but an admin: a new admin account with sign-in on, the owner (always an admin) with it off. */
  admin: User | null;
  /** The app, open on Home, for `user`. */
  app: Page;
};

export const test = base.extend<Fixtures & Options>({
  mode: ["local", { option: true }],
  dataDir: ["", { option: true }],
  // with sign-in on, every test comes from its own address (see playwright.config.ts)
  extraHTTPHeaders: async ({ extraHTTPHeaders, mode }, use) =>
    use(mode === "accounts" ? { ...extraHTTPHeaders, "X-Forwarded-For": randomIp() } : extraHTTPHeaders),
  // Nothing leaves this computer: any other address gets an empty page instead (GitHub, LinkedIn, fonts, players).
  // Pages opened in a new tab still keep their address, so tests can check where a link goes.
  context: async ({ context }, use) => {
    // The system clipboard is shared by every test running at once, so what pages copy is kept in the page instead.
    await context.addInitScript(() => {
      const w = window as any;
      w.__copied = [];
      if (navigator.clipboard) navigator.clipboard.writeText = (t: string) => { w.__copied.push(String(t)); return Promise.resolve(); };
    });
    await context.route(u => !["127.0.0.1", "localhost"].includes(u.hostname),
      r => r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Offline test stub</title>" }));
    await use(context);
  },
  user: async ({ page, mode }, use) => {
    let u: User | null = null;
    if (mode === "accounts") { u = newUser(); await signUp(page.request, u); }
    await skipTour(page.request);
    await use(u);
  },
  admin: async ({ page, mode, dataDir, playwright, baseURL, extraHTTPHeaders }, use) => {
    let u: User | null = null;
    if (mode === "accounts") {
      u = newUser("Admin");
      const other = await playwright.request.newContext({ baseURL, extraHTTPHeaders });   // its own cookies
      await signUp(other, u);
      await other.dispose();
      grantAdmin(u.email, dataDir);
      await signIn(page.request, u);          // a new session, so the server reads the new role
    }
    await skipTour(page.request);
    await use(u);
  },
  app: async ({ page, user }, use) => {
    void user;
    await page.goto("/app");
    await expect(title(page)).toHaveText("Home");
    await use(page);
  },
});

/* ---------------------------------------------------------------- fixed answers for what can't be made offline */
/** A JSON file from e2e/fixtures/, shaped like the real API answer. */
export function fixture<T = any>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "fixtures", name + ".json"), "utf8"));
}
/** Answer the link preview (which needs YouTube) for links containing `match`; other links go to the real server. */
export async function mockPreview(page: Page, match: string, body: object = fixture("preview"), status = 200) {
  await page.route(u => u.pathname === "/api/preview" && (u.searchParams.get("url") || "").includes(match),
    r => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }));
}
/** Answer every /api/sync with this data (creators, jobs, accounts), for states that need a live stream or finished
    clips. Each answer carries everything, as a real "something changed" answer does. */
export async function mockSync(page: Page, data: object) {
  await page.route(u => u.pathname === "/api/sync", r => r.fulfill({ json: data }));
}
/** Clip videos, covers and thumbnails from the fixtures: answered with the test video and a still from it. */
export async function mockMedia(page: Page) {
  await page.route(u => u.pathname.startsWith("/media/"), r => r.fulfill({ path: /\.mp4$/.test(new URL(r.request().url()).pathname) ? VIDEOS.tiny : VIDEOS.cover }));
}
/** Let a write through to nowhere: answer it with `json` and keep the request for checking. */
export async function fakeWrite(page: Page, method: string, pathRe: RegExp, json: object = { ok: true }) {
  const seen: { url: string; body: any }[] = [];
  await page.route(u => pathRe.test(u.pathname), (r, req) => {
    if (req.method() !== method) return r.fallback();
    let body = null;
    try { body = req.postDataJSON(); } catch { /* not JSON */ }
    seen.push({ url: req.url(), body });
    return r.fulfill({ json });
  });
  return seen;
}
/** The real /api/status with some fields changed, for states that need a broken or special server. */
export async function patchStatus(page: Page, patch: (s: any) => void) {
  await page.route(u => u.pathname === "/api/status", async r => {
    const res = await r.fetch();
    const s = await res.json();
    patch(s);
    await r.fulfill({ response: res, json: s });
  });
}

/** The text the page last put on the clipboard (see the context fixture). */
export const copied = (page: Page) => page.evaluate(() => (window as any).__copied.at(-1) as string | undefined);

/* ---------------------------------------------------------------- finding things */
export const sidebar = (page: Page) => page.getByRole("complementary", { name: "Sidebar" });
/** The page's main heading: "Home", "All videos", "Settings", "AI usage" or a creator's name. It is still found
    while a modal dialog such as the tour is open: a person still sees it, but the React page marks everything
    behind a modal dialog aria-hidden (the old page did not), which hides it from role queries. */
export const title = (page: Page) => page.getByRole("heading", { level: 1, includeHidden: true });
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A link or button in the sidebar. A name given as text must start its label: "All videos" also finds "All videos 3". */
export const navItem = (page: Page, label: string | RegExp) => {
  const name = typeof label === "string" ? new RegExp("^" + escapeRe(label) + "(\\s|$)") : label;
  return sidebar(page).getByRole("link", { name }).or(sidebar(page).getByRole("button", { name }));
};
/** A creator in the sidebar (its name comes after its picture or first letter). */
export const creatorItem = (page: Page, name: string) => navItem(page, new RegExp(escapeRe(name)));
/** The button with the signed-in person (or "Settings" with sign-in off) that opens the account menu. */
export const meButton = (page: Page) => sidebar(page).getByRole("button", { name: /Settings AI key, connected apps|@/ });
export const bell = (page: Page) => sidebar(page).getByRole("button", { name: /^Notifications/ });
export const menu = (page: Page) => page.getByRole("menu");
export const menuItem = (page: Page, name: string | RegExp) =>
  menu(page).getByRole("menuitem", { name }).or(menu(page).getByRole("button", { name }));
/** A dialog with this heading (a plain dialog or an alert dialog). */
export const dialog = (page: Page, heading: string | RegExp) =>
  page.getByRole("dialog").or(page.getByRole("alertdialog")).filter({ has: page.getByRole("heading", { name: heading }) });
export const linkBox = (page: Page) => page.getByRole("textbox", { name: "Video link" });

/** Go somewhere in the app by its address and wait until that view is drawn. */
export async function openApp(page: Page, address: string, heading: string | RegExp) {
  await page.goto(address);
  await expect(title(page)).toHaveText(heading);
}

/** Create a creator through the New creator dialog; leaves the page on that creator. */
export async function addCreator(page: Page, name: string, channel = "") {
  await navItem(page, "New creator").click();
  const d = dialog(page, "New creator");
  if (channel) await d.getByLabel("Channel link").fill(channel);
  await d.getByLabel("Name").fill(name);
  await d.getByRole("button", { name: "Create workspace" }).click();
  await expect(title(page)).toHaveText(name);
}

/** Attach a file through the "Upload video" button, as a person picks it in the file dialog. */
export async function pickFiles(page: Page, files: string | string[] | { name: string; mimeType: string; buffer: Buffer }[]) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload video" }).click();
  await (await chooser).setFiles(files);
}

