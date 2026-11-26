# Parity tests (Playwright)

These tests click through ClipCrest the way a person does. They were written against the old plain-HTML pages
(since retired) and now run against the React pages built into `web/dist`, so build first (`npm run build`). They
were kept as they were, except where a test leaned on the old page's inner workings or on one of its bugs; those
changes say why in the test. That is how we know no feature was lost.

```
npm run e2e        # everything (about 10 minutes)
npm run e2e:ui     # the Playwright window: watch, or run single tests
npx playwright test e2e/app-shell.spec.ts --project=local     # one file, one server
```

Locally the tests use the Microsoft Edge that is already installed. CI uses Playwright's Chromium and must run
`npx playwright install --with-deps chromium` first. Python (through `uv`) and `ffmpeg` must be on the PATH.

## How it runs

- `playwright.config.ts` starts three throwaway servers, each with a new, empty data folder and a free port:
  - **local**: sign-in off (the default). One built-in owner, shared by every test, so these run one at a time.
  - **accounts**: sign-in on. Every test signs up its own new account, so tests run two at a time.
  - **site**: sign-in on, for the admin dashboard and Earn, whose lists are shared by everyone on a site. One test
    at a time, in file order. The first test in `earn.spec.ts` needs a site with no campaigns, so it stays first.
- Nothing leaves the computer. The servers are given a proxy that does not exist, so the speech model, YouTube and
  the AI service all fail at once, as they would offline. The browser answers any address other than 127.0.0.1 and
  localhost with an empty page, so links to GitHub or LinkedIn still show where they go.
- Real data first. Uploads, jobs, creators, settings, notifications (made by sending feedback), sign-ups, password
  resets (the link the server prints), admins (`python -m studio.admin grant`) are all real. Only states that need
  the internet or the speech model come from fixed answers in `e2e/fixtures/*.json`, shaped like the real API:
  finished clips and every job state (`sync-clips.json`), a live creator and a recording (`sync-live.json`,
  `live-job.json`), link and channel previews, AI usage, storage and connected accounts. Writes those states would
  cause are answered in the test and their request bodies checked.
- Each test with sign-in on says it comes from its own address (`X-Forwarded-For`, with `CLIPCREST_TRUST_PROXY=1`),
  so the server's per-address limits (8 sign-ups an hour) are not shared by all tests.
- What a page copies is kept in the page (`navigator.clipboard.writeText` is recorded), because the system
  clipboard is shared by tests that run at the same time.

## Rules for writing tests

- Find things only by what a person sees: `getByRole(..., { name })`, `getByLabel`, `getByPlaceholder`,
  `getByText`, `getByTitle`, page titles and addresses. Never CSS classes, ids, `data-act` or page structure.
- Tag every test with the `docs/FEATURES.md` IDs it covers, in its title.
- A real bug: the test checks the correct behaviour and names the Q-number from FEATURES.md section 18. (Tests for
  the old pages' bugs were marked `test.fixme` until the React pages fixed them.)

## Labels the React port must keep

Roles in brackets. "Name" is the accessible name (the visible text, or the `aria-label`).

**App frame**
- [complementary] "Sidebar"; inside it the logo [img] "ClipCrest"; [navigation] "Main".
- Sidebar items (link or button) whose names start with: "Home", "All videos" (then the count or "N working"),
  "Earn" (with "New"; href `/earn`), each creator's name, "New creator", "Admin dashboard" (href `/admin`),
  "Earn campaigns" (href `/admin/earn`); the text "Creators" and "Owner".
- The AI card [button] whose name starts with "AI" (then "Not set up" or the provider, and "N today"); its title
  "The AI is not set up".
- The account button: its name contains "Settings" and "AI key, connected apps" (sign-in off) or the person's name
  and email. It has `aria-expanded`. The menu is [menu] with items (menuitem or button) "Settings", "AI usage",
  "Take the tour", "Send feedback", "Sign out".
- [button] "Notifications" or "Notifications, N new", showing "9+" above nine; its panel [dialog] "Notifications"
  with the heading "Notifications", "Mark all as read", and one button per notification.
- [button] "Collapse sidebar" (or "Expand sidebar"), hidden on phones; [button] "Open menu" on phones.
- The page title is the one [heading level 1]: "Home", "All videos", "Settings", "AI usage" or the creator's name.
- Top bar links "Star on GitHub" (name contains "Star"), "Follow me" (title "Follow the maker of ClipCrest on
  LinkedIn"), "Earn money".
- Creator tabs: [tablist] "Creator sections" with [tab] "Clips", "Setup", "Activity" (+ counts), `aria-selected`.
- Toasts and pop-up notification cards are [status]; a red toast has [button] "Report"; a card has "Dismiss".

**Composer and videos**
- [textbox] "Video link"; buttons "Upload video" (opens the file chooser), "File under creator" (a [listbox] of
  [option]s plus "New creator"), "Options" (`aria-expanded`), "Make clips" / "Make clips (N)" / "Finding video…",
  "Add another video" with "n of N", "Remove <title>", "Remove link".
- Options: [spinbutton] "How many", "Shortest", "Longest", "From minute", "Up to minute"; [button] "Less" and "More";
  [checkbox] "Generate captions"; pressed buttons (`aria-pressed`) "Bounce", "Hype", "Clean", "Blurred fill",
  "Zoomed in", "Fill screen", "Gameplay + facecam", "720p", "1080p"; [group] "Caption style".
- Videos: each title is a heading; [button] "Delete this video and its clips", "Download all clips of this video";
  [checkbox] "Select this video", "Select this clip"; [toolbar] "Selected items" with "Select all", "Download N
  clips", "Delete", "Cancel"; [button] "Report this".
- Clip cards: [button] "Open clip: <title>", [link] "Download", [button] "Copy post text", "Send to a paid
  campaign", "Delete this clip", "Post"; post pills as text "<account> · <status>" (a posted one is a link, a failed
  one has the error as its title).
- Clip dialog [dialog] with the heading "On the video": fields labelled "Big text", "Caption style", "Layout",
  "Start (seconds)", "End (seconds)", "Title", "Description"; [checkbox] "Generate captions"; account checkboxes
  "<label> · <name>"; buttons "Save and re-make clip", "Post now", "Add to queue", "Close", [link] "Download",
  "Copy post text", "Send to a campaign".
- Confirm dialogs: a dialog (or alert dialog) with the question as a heading and the buttons "Cancel" and the
  action ("Delete", "Delete clip", "Delete creator", "Delete my account", "Stop recording", "Turn on", "Post now",
  "Disconnect"). Typed confirmations have one [textbox].

**Creators**
- New creator dialog: heading "New creator"; fields "Channel link", "Name"; buttons "Create workspace", "Cancel".
- Setup: [textbox] "YouTube channel link", "Twitch channel link", "Kick channel link"; [button] "Connect",
  "Remove <Platform> channel"; checkboxes whose names contain "Record automatically when they go live", "Post new
  clips automatically", "Generate captions"; fields labelled "Check the live stream every", "Most live clips per
  hour", "Caption style"; [textbox] with placeholder "Read from the title" (Game); buttons "Discard", "Save
  changes", "Open Settings", "Delete creator"; headings "Their stream", "How the AI decides", "Clips", "Posting",
  "Delete this creator".
- Live: buttons "Start recording", "Record live stream", "Record this stream", "Stop recording", "Watch on Kick"
  (one per platform), "Clip last 30s", "Last 60s", "Stop", "How often the AI checks" (a [listbox] of [option]s
  "1 min" … "10 min"); [link] "Watch on Twitch"; the player's title "<Platform> live stream".

**Settings**
- [navigation] "Settings sections" with links to `/app/settings/<section>`.
- AI: fields labelled "AI service", "Key", "Address", "Model"; buttons "Find models", "Save and test", "Test again".
- Security: fields "Current password", "New password"; buttons "Change password", "Set password", "Sign out",
  "Delete my account"; [link] "Forgot it?".
- Connected apps: buttons "Set up", "Copy", "Save", "Close", "Disconnect", "Change this server's <Platform> app";
  links "Connect" / "Add another" (href `/oauth/<platform>/start`); fields "Client ID", "Client secret".
- Storage: [img] "N% of the drive is used"; buttons "Open folder", "Change folder", "Browse", "Use this folder",
  "Undo"; field "New folder"; [checkbox] "Move everything that is in the current folder there too".

**Banners, tour, usage**
- Banner buttons "Add AI key", "Open AI settings", "Open Storage", "How to update", "Hide until the next version"
  (the "Later" button), "What's new", "Confirm", "Send a new code"; [textbox] "6-digit code"; ffmpeg missing is an
  [alert]. The update dialog has headings "A new version of ClipCrest is out" / "The new version is ready", "Copy"
  buttons, "Got it", and [link] "See every change on GitHub".
- Tour: a [dialog] named by its step title, with "N of 8", buttons "Back", "Next", "Start clipping", "Close the
  tour".
- AI usage: [img] "AI tokens used per day, last 30 days"; Home's chart [img] "Clips made and posted per day, last
  14 days"; the recent-calls table is a real table.

**Other pages**
- Sign in / sign up: fields "Your name", "Email", and the password found by its placeholder ("Your password",
  "Choose a password"); buttons "Sign in", "Create account", "Show password" / "Hide password" (`aria-pressed`);
  the error box is an [alert]; links "Forgot password?", "Create an account", "Sign in", "Sign in with Google" /
  "Sign up with Google".
- Reset: fields "Email", "New password", "Type it again"; buttons "Send reset link", "Save new password"; [link]
  "Back to sign in"; errors in an [alert].
- Landing: [navigation] "Sections"; [textbox] "Video link"; [button] "Get clips"; [link] "Upload a video",
  "Open ClipCrest", "Read the code"; demo clips as [figure]s named by their captions; [tablist] "Who ClipCrest is
  for"; FAQ questions that open on click; the header is the [banner], the footer the [contentinfo]. The served HTML
  keeps the canonical link, `og:url` and the three JSON-LD blocks.
- Legal: [navigation] "Legal pages" with "Terms", "Privacy", "Acceptable use"; one visible [heading level 1].
- Admin: [navigation] "Admin" with links "Overview", "Users" (+ count), "Feedback", "Activity"; [button]
  "Refresh", "Sign out"; [link] "Back to the app", "Earn campaigns"; [searchbox] "Search accounts"; filter buttons
  "All", "Email not confirmed", "Disabled", "Admins"; sort buttons ("AI calls"); each account is a [row] (click
  opens a [dialog] with "Disable account", "Delete account", "Close"); feedback buttons "New · N", "Seen", "Done",
  "Mark seen", "Reopen", [link] "Reply by email".
- Earn: [navigation] "Sections"; links "Sign in", "Start earning"; each campaign is a [button] containing its title
  and "per 1,000 views"; the campaign sheet is a [dialog] named by the campaign title with "Close", "Sign up to
  join", "I have an account", "Join campaign", "Send a clip"; [slider] "Views on one clip", "Clips a week";
  dashboard tabs as buttons starting "Send a clip", "My clips", "Payouts", "Payout profile"; profile and clip fields
  found by placeholder ("name@okaxis", "+91 98765 43210", "@yourpage", "@yourhandle", "https://youtube.com/shorts/…
  or an Instagram, X or TikTok link"); buttons "Save profile", "Send clip for verification", "Remove", "Sign out".
- Earn admin: links "Campaigns", "Review clips", "Clippers", "Payouts", "Settings"; [button] "New campaign"; each
  campaign a [row] with "Go live", "Pause", "End" and [link] "View".
