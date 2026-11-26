/* Signing in, signing up and resetting a password (sign-in on), and where those addresses go with sign-in off. */
import { expect, mockPreview, newUser, resetLink, signUp, test, title } from "./fixtures";

test.describe("with sign-in off", () => {
  test("[AUTH-01, RST-01, APP-ROUTE-01] the sign-in, sign-up and reset pages all lead into the app", async ({ page, mode }) => {
    test.skip(mode === "accounts", "this is about sign-in off");
    for (const p of ["/", "/login", "/signup", "/reset"]) {
      await page.goto(p);
      await expect(page, p).toHaveURL(/\/app$/);
    }
  });
});

test.describe("sign in and sign up", () => {
  test.skip(({ mode }) => mode === "local", "needs sign-in on");

  test("[AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-09] the sign-in page", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle("Sign in to ClipCrest");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByText("Sign in to get back to your clips.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("placeholder", "you@example.com");
    await expect(page.getByPlaceholder("Your password")).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/reset");
    await expect(page.getByLabel("Your name")).toBeHidden();
    await expect(page.getByText("At least 8 characters.")).toBeHidden();
    await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/signup");
    await expect(page.getByText("New to ClipCrest?")).toBeVisible();
    await expect(page.getByText("By continuing you agree to our Terms and Privacy Policy.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    await expect(page.getByRole("link", { name: /with Google/ })).toBeHidden();              // no Google keys on this server
    await expect(page.getByText("Make clips free. Get paid for views.")).toBeVisible();
    await expect(page.getByText(`© ${new Date().getFullYear()} ClipCrest`)).toBeVisible();
  });

  test("[AUTH-01, AUTH-04, AUTH-06, AUTH-09] the sign-up page creates an account and opens the app", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveTitle("Create your ClipCrest account");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.getByText("Start clipping in a couple of minutes.")).toBeVisible();
    await expect(page.getByLabel("Your name")).toHaveAttribute("placeholder", "What should we call you?");
    await expect(page.getByText("At least 8 characters.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot password?" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/login");
    const u = newUser("Signup");
    await page.getByLabel("Your name").fill(u.name);
    await page.getByLabel("Email").fill(u.email);
    await page.getByPlaceholder("Choose a password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert")).toHaveText("Use a password of at least 8 characters.");
    await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();
    await page.getByPlaceholder("Choose a password").fill(u.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(title(page)).toHaveText("Home");
    // the same email again
    await page.context().clearCookies();
    await page.goto("/signup");
    await page.getByLabel("Email").fill(u.email);
    await page.getByPlaceholder("Choose a password").fill(u.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert")).toHaveText("There is already an account with that email. Sign in instead.");
  });

  test("[AUTH-05, AUTH-06, AUTH-07] signing in: show the password, empty fields, a wrong password, and where it goes after", async ({ page }) => {
    const u = newUser();
    await signUp(page.request, u);
    await page.context().clearCookies();
    await page.goto("/login?next=/app/videos");
    const pw = page.getByPlaceholder("Your password");
    await pw.fill("secret-words");
    await expect(pw).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(pw).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    await expect(pw).toBeFocused();
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(pw).toHaveAttribute("type", "password");
    // empty: said without asking the server
    let asked = false;
    page.on("request", r => { if (r.url().includes("/api/auth/login")) asked = true; });
    await pw.fill("");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("Enter your email and password.");
    expect(asked).toBe(false);
    await page.getByLabel("Email").fill(u.email);
    await pw.fill("wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("That email and password don't match.");
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
    await pw.fill(u.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/videos$/);                       // ?next= is honoured
    await expect(title(page)).toHaveText("All videos");
    await page.goto("/login");                                              // already signed in
    await expect(page).toHaveURL(/\/app$/);
  });

  test("[AUTH-07] a next address on another site is ignored", async ({ page }) => {
    const u = newUser();
    await signUp(page.request, u);
    await page.context().clearCookies();
    await page.goto("/login?next=//evil.example/steal");
    await page.getByLabel("Email").fill(u.email);
    await page.getByPlaceholder("Your password").fill(u.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/app$/);
  });

  test("[AUTH-03, AUTH-08] the Google button when the server has Google, and a Google sign-in that failed", async ({ page }) => {
    await page.route(u => u.pathname === "/api/public", async r => r.fulfill({ json: { ...(await (await r.fetch()).json()), google: true } }));
    await page.goto("/signup?next=/app/usage");
    await expect(page.getByRole("link", { name: "Sign up with Google" })).toHaveAttribute("href", "/auth/google/start?next=%2Fapp%2Fusage");
    await expect(page.getByText("or use your email")).toBeVisible();
    await page.goto("/login?error=google");
    await expect(page.getByRole("link", { name: "Sign in with Google" })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveText("Google sign-in didn't finish. Try again, or use your email.");
  });

  test("[AUTH-02] on narrow screens the side panel gives way to a small logo", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto("/login");
    await expect(page.getByText("Make clips free. Get paid for views.")).toBeHidden();
    await expect(page.getByRole("main").getByRole("img", { name: "ClipCrest" })).toBeVisible();
  });

  test("[APP-ERR-07] the app sends signed-out visitors to sign in", async ({ page }) => {
    await page.goto("/app/videos");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("[LAND-05, AUTH-06, AUTH-07, APP-ROUTE-11] a link pasted on the landing page waits in the app after signing up", async ({ page }) => {
    await mockPreview(page, "dQw4w9WgXcQ");
    await page.goto("/");
    await page.getByPlaceholder("Paste a YouTube, Twitch or Kick link").first().fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("button", { name: /Get clips/ }).first().click();
    await expect(page).toHaveURL(/\/signup$/);
    const u = newUser();
    await page.getByLabel("Email").fill(u.email);
    await page.getByPlaceholder("Choose a password").fill(u.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(title(page)).toHaveText("Home");
    await expect(page.getByText("Your link is ready. Press Make clips.")).toBeVisible();
    await expect(page.getByText("Never Gonna Give You Up")).toBeVisible();
  });
});

test.describe("password reset", () => {
  test.skip(({ mode }) => mode === "local", "needs sign-in on");

  test("[RST-01, RST-03, RST-04] asking for a reset link", async ({ page }) => {
    await page.goto("/reset");
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await expect(page.getByText("Enter the email you signed up with and we'll send you a link to choose a new password.")).toBeVisible();
    await expect(page.getByText("Clips from every stream, without watching all of it.")).toBeVisible();
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("alert").first()).toHaveText("Enter your email.");
    await page.getByLabel("Email").fill("nobody-" + Date.now() + "@example.com");   // the same answer for an unknown address
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("If there's an account for that email, a reset link is on its way. It works for one hour. Check your spam folder if you don't see it.")).toBeVisible();
    await page.getByRole("link", { name: "Back to sign in" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("[RST-02] choosing a new password from the emailed link signs in", async ({ page, dataDir }) => {
    const u = newUser();
    await signUp(page.request, u);
    await page.context().clearCookies();
    await page.goto("/reset?t=not-a-real-token");
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
    await expect(page.getByText("You'll be signed in, and signed out everywhere else.")).toBeVisible();
    const save = page.getByRole("button", { name: "Save new password" });
    await page.getByLabel("New password").fill("short");
    await page.getByLabel("Type it again").fill("short");
    await save.click();
    await expect(page.getByRole("alert").last()).toHaveText("Use at least 8 characters.");
    await page.getByLabel("New password").fill("new-password-1");
    await page.getByLabel("Type it again").fill("new-password-2");
    await save.click();
    await expect(page.getByRole("alert").last()).toHaveText("The two passwords don't match.");
    await page.getByLabel("Type it again").fill("new-password-1");
    await save.click();
    await expect(page.getByRole("alert").last()).not.toBeEmpty();                     // the server's reason for a bad link
    await expect(page).toHaveURL(/\/reset\?t=/);
    await page.goto(resetLink(u.email, dataDir));
    await page.getByLabel("New password").fill("new-password-1");
    await page.getByLabel("Type it again").fill("new-password-1");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(title(page)).toHaveText("Home");
  });
});
