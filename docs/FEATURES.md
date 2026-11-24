# ClipCrest web front end: feature inventory and parity checklist

This is a complete list of what the current web front end does, page by page. The pages in `web/` are plain HTML,
CSS and JavaScript with inline scripts. They are being rewritten in React (in `frontend/`), one page at a time.

**The rule for the rewrite: nothing is lost.** Before an old page is deleted, every item for that page here must be
ticked, and the parity scenarios at the end must pass against the React page.

The document is also the reference for anyone joining the project who wants to know what the UI does and which
server call sits behind each button.

## Contents

1. [How to read this document](#1-how-to-read-this-document)
2. [Pages at a glance](#2-pages-at-a-glance)
3. [Route table](#3-route-table)
4. [Server modes that change the UI](#4-server-modes-that-change-the-ui)
5. [API table](#5-api-table)
6. [Browser storage](#6-browser-storage)
7. [External embeds and assets](#7-external-embeds-and-assets)
8. [The app: `web/index.html`](#8-the-app-webindexhtml)
9. [Landing page: `web/landing.html`](#9-landing-page-weblandinghtml)
10. [Sign in and sign up: `web/auth.html`](#10-sign-in-and-sign-up-webauthhtml)
11. [Password reset: `web/reset.html`](#11-password-reset-webresethtml)
12. [Legal pages: `web/legal.html`](#12-legal-pages-weblegalhtml)
13. [Earn: `web/earn.html`](#13-earn-webearnhtml)
14. [Admin dashboard: `web/admin.html`](#14-admin-dashboard-webadminhtml)
15. [Earn admin: `web/earn-admin.html`](#15-earn-admin-webearn-adminhtml)
16. [Shared scripts: `gradient-ascii.js` and `ascii.js`](#16-shared-scripts-gradient-asciijs-and-asciijs)
17. [Parity test scenarios](#17-parity-test-scenarios)
18. [Known quirks and bugs in the old UI](#18-known-quirks-and-bugs-in-the-old-ui)
19. [Counts](#19-counts)

## 1. How to read this document

- **Line numbers** (`L1234`, `L1234-1250`) point into the file the section is about, as it is now. Server lines are
  in `studio/server.py` unless another file is named ("server L671").
- **`studio/server.py` changes while the port goes on.** Its line numbers here were taken on 24 November 2026,
  after the `/static` route for built React pages was added. If a number no longer points at the right code, search
  for the route's path; the path is the stable reference. The page files' line numbers refer to the old pages, which
  do not change until they are deleted.
- **Every item has a stable ID** and a checkbox. IDs never change meaning; if an item is split later, add new IDs
  instead of renumbering. The prefixes are:

  | Prefix | Page |
  |---|---|
  | `APP-<AREA>-NN` | `web/index.html`, the signed-in app at `/app` |
  | `LAND-NN` | `web/landing.html` |
  | `AUTH-NN` | `web/auth.html` |
  | `RST-NN` | `web/reset.html` |
  | `LEGAL-NN` | `web/legal.html` |
  | `EARN-<AREA>-NN` | `web/earn.html` |
  | `ADM-<AREA>-NN` | `web/admin.html` |
  | `EADM-<AREA>-NN` | `web/earn-admin.html` |
  | `GA-NN` | `web/gradient-ascii.js` and `web/ascii.js` |
  | `SCN-NN` | a parity test scenario (section 17) |
  | `Q-NN` | a known quirk or bug (section 18) |

- **Each item** has a one-line description in bold, then one line of detail:
  - **Trigger:** the element, `data-act` value, route or event that starts it.
  - **API:** method and path, and when the call happens. "none" means it is purely in the page.
  - **State:** the response fields it depends on (`/api/status`, `/api/sync`, ...) or page state.
  - **Notes:** validation, limits, confirmations, exact visible text, storage keys, timers.
- **Exact text** in quotes is what the user sees. Tests can assert on it. The React port may improve wording only if
  the owner agrees; the checklist item is then updated, not deleted.
- **"Port note"** marks something the React port should do differently on purpose (for example, fixing a bug from
  section 18). It is still part of parity: the behaviour exists, but in its corrected form.

## 2. Pages at a glance

| File | What it is | Size | Script |
|---|---|---|---|
| `web/index.html` | The whole signed-in app: Home, All videos, creators, live recording, settings, AI usage | 2,571 lines | inline, L851-2569 |
| `web/landing.html` | Public marketing page at `/` (and `/clip-maker`) | 492 lines | inline, L409-490 |
| `web/auth.html` | Sign in (`/login`) and sign up (`/signup`), one file | 149 lines | inline, L107-147 |
| `web/reset.html` | Forgot password and choose a new one (`/reset`, `/reset?t=`) | 137 lines | inline, L102-135 |
| `web/legal.html` | Terms, Privacy and Acceptable use, one file with server placeholders | 267 lines | inline, L246-265 |
| `web/earn.html` | Earn: paid clipping campaigns for clippers | 1,063 lines | inline |
| `web/admin.html` | Admin dashboard (`/admin`) | 431 lines | inline |
| `web/earn-admin.html` | Earn campaigns admin (`/admin/earn`) | 454 lines | inline |
| `web/gradient-ascii.js` | WebGL animated ASCII gradient used behind hero sections | 855 lines | served at `/assets/gradient-ascii.js` |
| `web/ascii.js` | An older canvas ASCII effect ("PeakAscii"). No page uses it | 98 lines | served at `/assets/ascii.js` |
| `web/brand/*` | Logos, favicon, demo clips and their posters | | served at `/brand/<name>` |

## 3. Route table

"Sign-in on" means `CLIPCREST_ACCOUNTS=1`. "Sign-in off" is the default: every request belongs to one built-in
owner (`u_local`, or the oldest existing account, made admin; `studio/auth.py` L279-296). With sign-in off the
request must come to the server's own address (a number, `localhost`, or the host in `CLIPCREST_PUBLIC_URL`), or
every path answers 403 "Open ClipCrest by its own address." (server L139-143).

| Path | Served | Signed out (sign-in on) | Signed in (normal user) | Admin | Sign-in off | Earn-only (`CLIPCREST_EARN_ONLY=1`) | Server lines |
|---|---|---|---|---|---|---|---|
| `/` | `landing.html` with `{{SITE}}`, `{{DOWNLOAD}}` replaced; ETag, 5 min cache | landing | landing (shows "Open ClipCrest") | landing | 303 to `/app` | `earn.html` instead | L347-364, Gate L144-145 |
| `/clip-maker` | `landing.html` (same as `/`) | landing | landing | landing | landing (not redirected) | landing (the clip maker's page lives here) | L355-364 |
| `/login`, `/signup` | `auth.html` (no placeholders) | page | 303 to `/app` | 303 to `/app` | 303 to `/app` | same as sign-in on | L387-390, Gate L161-162 |
| `/reset` | `reset.html` | page | page | page | 303 to `/app` | page | L393-395, Gate L144-145 |
| `/privacy`, `/terms`, `/acceptable-use` | `legal.html` with `{{CONTACT}}`, `{{PAGE}}`, `{{PAGE_PATH}}`, `{{SITE}}`, `{{NAME}}`, `{{LAW}}`, `{{TITLE}}`, `{{DESC}}` replaced | page | page | page | page | page | L398-426 |
| `/app`, `/app/<anything>` | `index.html` (one file for every app address) | 303 to `/login` | app | app | app | non-admins: 303 to `/earn#me`; admins: app | L429-437, Gate L157-159 |
| `/earn` | `earn.html` | page (public) | page | page | 303 to `CLIPCREST_EARN_URL/earn` when that is set; `earn.html` when `CLIPCREST_LOCAL_EARN=1`; 404 otherwise | page (also at `/`) | L447-465 |
| `/admin/earn`, `/admin/earn/<anything>` | `earn-admin.html` | 404 | 404 | page | page (the owner is admin) | page for admins | L440-444, Gate L149-152 |
| `/admin`, `/admin/<anything>` | `admin.html` | 404 | 404 | page | page (the owner is admin, although the app hides the link) | page for admins | L468-472, Gate L149-152 |
| `/auth/verify?t=` | redirect | 303 `/app?verified=1` or `/app?verify_error=<msg>` | same | same | 303 to `/app` | same | L577-583 |
| `/auth/google/start?next=`, `/auth/google/callback` | redirect to Google and back | sets cookie `g_state`; failure goes to `/login?error=google` | | | 303 to `/app` | | L647-667 |
| `/oauth/<youtube\|instagram\|tiktok>/start`, `.../callback` | redirect to the platform and back to `/app/settings/apps?connected=<p>&name=<n>` or `?connect_error=<msg>` | 401 | works | works | works | works | L1438-1469 |
| `/media/<job>/<file>.mp4\|.jpg[?download=1]` | clip video, cover, `thumb.jpg` | 401 | own jobs only | own jobs | works | | L1125-1132 |
| `/pub/<token>.mp4` | a clip, signed for one hour, for platforms to fetch while posting | public | | | | | L1472-1484 |
| `/earn/cover/<id>.jpg` | campaign cover image | public | | | | | L1679 |
| `/brand/<name>` | `web/brand/*` (svg, png, ico, webp, jpg, mp4), 7-day cache | public | | | | | L482-486 |
| `/assets/<name>.js` | any `web/*.js` | public | | | | | L489-493 |
| `/static/<name>` | scripts, styles, fonts and images of built React pages, from `web/dist/static` (cached a year; names change with content) | public | | | | | L496-511 |
| `/favicon.ico` | 308 to `/brand/favicon.svg` | | | | | | L514-516 |
| `/robots.txt`, `/sitemap.xml` | text; the sitemap leaves out `/earn` when there is no Earn | | | | | | L367-384 |
| `/healthz` | `{"ok": true}` after a database check | | | | | | L475-479 |

**Built React pages replace old ones by file name.** `_web(name)` serves `web/dist/<page>.html` when that file
exists, otherwise `web/<page>.html` (server L39-41, L332-334); the build's scripts and styles come from
`/static/<name>` (server L496-511, added for the React work). This applies to every page in the table, including
`landing.html` and `legal.html`, whose placeholders (`{{SITE}}`, `{{DOWNLOAD}}`, `{{TITLE}}`, ...) the server still
replaces in the built file. A React build of those two pages must keep the placeholders in its HTML.

Things every page gets from the server (Gate, server L183-211): `X-Frame-Options: DENY`, a Content Security Policy
(server L49-52), `nosniff`, `Referrer-Policy`, `Permissions-Policy` (no camera, microphone, location),
`Cache-Control: no-store` on `/api/*`, `X-Robots-Tag: noindex` on `/app`, `/admin`, `/api`, `/auth`, `/reset`,
`/media`. Pages served through `_page()` (server L337-341) use `no-cache` with a validator, so a reload costs a
"not modified". `GET` responses with an ETag that matches `If-None-Match` get a 304.

**Changes must come from the page itself.** Every non-GET request is refused with 403 "Cross-site requests are not
allowed." unless the browser marks it same-origin or its `Origin` matches (server L105-107, L284-296). In the
admin area the browser must say so explicitly (server L153-156). Request bodies are capped at 256 KB, except uploads
(server L108-119) and campaign covers and proof screenshots (9 MB, server L113-114).

## 4. Server modes that change the UI

### 4.1 Sign-in off (the default)

- Everyone is the built-in owner. The owner is an admin and always counts as email-confirmed (`studio/auth.py`
  L283-296).
- `/`, `/reset`, `/auth/*`, `/login`, `/signup` all redirect to `/app`. `/api/auth/*` answers 404, except
  `/api/auth/me` (server L144-147).
- `/api/status` has `"accounts": false`. In the app this means:
  - the account menu has no name and email header and no "Sign out" (APP-ACCT-02, APP-ACCT-03);
  - the sidebar button under the AI card reads "Settings" and "AI key, connected apps" instead of a name and email
    (APP-NAV-11);
  - Settings has no Profile or Security tab; the subtitle is "Your AI key and connected apps." (APP-SET-02,
    APP-TOP-02);
  - the Earn link in the sidebar opens in a new tab (APP-NAV-05);
  - the "Owner" section with "Admin dashboard" and "Earn campaigns" is hidden, although `/admin` and `/admin/earn`
    still open by address (APP-ADML-01, Q-14);
  - the "Confirm your email" banner never shows (APP-ERR-05).
- The landing page is still reachable at `/clip-maker`; `/api/auth/me` returns the owner, so it shows
  "Open ClipCrest" (LAND-12).

### 4.2 Sign-in on (`CLIPCREST_ACCOUNTS=1`)

- `/app` needs a session; signed-out visitors go to `/login` (server L157-160). Any API answer 401 sends the app to
  `/login` (APP-ERR-07).
- Each user sees only their own creators, videos, clips, accounts, notifications and AI usage.
- Admin-only parts of the app appear only for admins: the AI and Storage settings tabs, app set-up panels, the
  "Add AI key", "Open AI settings" and "Open Storage" buttons, the AI problem banner, the update banner (the server
  sends `update: null` to everyone else, server L676), and the "Owner" sidebar section.
- With `CLIPCREST_VERIFY_EMAIL=1`, a new account must confirm its email (six-digit code or link) before it can start
  a video, upload or record (server L326-328). The app shows the confirm banner (APP-ERR-05).
- The Earn link always exists: `earn_link()` returns `/earn` whenever sign-in is on (server L451-452).

### 4.3 Earn-only (`CLIPCREST_EARN_ONLY=1`)

The public Earn website. Usually combined with sign-in on.

- `/` serves `earn.html`; the clip maker's landing page moves to `/clip-maker` (server L347-352).
- `/app` sends everyone except admins to `/earn#me` (server L435-436).
- Non-admins may only change things through `/api/auth/`, `/api/earn/`, `/api/account/delete`,
  `/api/notifications/`, `/api/feedback`. Anything else answers 403 "Clip-making runs on your own computer here.
  Download the free ClipCrest clip studio from the Earn page, make your clips, then send the links back to earn."
  (server L44, L165-167).
- `/api/public` and `/api/status` report `earn_only: true`. The landing page turns its link bars and upload buttons
  into download buttons (LAND-14). The app itself does not read `earn_only`.

### 4.4 Local Earn (`CLIPCREST_LOCAL_EARN=1`)

For trying Earn on a copy with sign-in off. When `CLIPCREST_EARN_URL` is empty, `earn_link()` returns `/earn` and
`/earn` serves the local `earn.html` instead of redirecting (server L453-465). The Earn parts of the app listed in section 4.5
appear. If `CLIPCREST_EARN_URL` is also set, it wins: the link points there.

### 4.5 Earn hidden (`earn_url` is null)

`earn_link()` is null when sign-in is off, `CLIPCREST_EARN_URL` is empty and `CLIPCREST_LOCAL_EARN` is not 1
(the default for a downloaded copy). Then:

- the app hides the Earn sidebar item, the "Earn campaigns" admin link, and both "Send to a paid campaign" buttons
  (clip card and clip dialog) (APP-EARN-01..04);
- the landing page keeps every `[data-earn]` element hidden (LAND-03);
- `/earn` answers 404 and the sitemap leaves it out (server L379-380, L458-462).

### 4.6 Other settings that change what pages show

| Setting | Effect on the UI |
|---|---|
| `CLIPCREST_REPO_URL` (default: the GitHub repo) | "Star on GitHub" button on Home and All videos; "Send feedback" target (`<repo>/issues/new`). Empty: the button becomes "Earn money" when Earn exists (APP-TOP-06, APP-FB-01) |
| `CLIPCREST_FOLLOW_URL` (default: the maker's LinkedIn) | "Follow me" button; its icon follows the site (LinkedIn, Instagram, YouTube, GitHub, X). Feedback falls back to it when there is no repo link |
| `CLIPCREST_MAX_UPLOAD_MB` (default: no limit) | Client-side file size check and message (APP-UPL-03) |
| `CLIPCREST_UPLOAD_PART_MB` (default 40, minimum 5) | Files bigger than this go up in pieces (APP-UPL-06) |
| `CLIPCREST_MAX_JOBS_PER_USER` (default 5) | How many videos can be attached and sent at once (`max_batch`, APP-UPL-03) |
| `CLIPCREST_UPDATE_CHECK=0` | No update banner |
| `CLIPCREST_MIN_FREE_DISK_GB` (default 3) | Below this free space the "drive almost full" banner shows (APP-ERR-02) |
| Google keys (`GOOGLE_CLIENT_ID`, ...) | "Sign in with Google" button on `/login` and `/signup` (AUTH-03) |
| SMTP / mail settings | Whether "Send a new code" says the code was emailed or written to the server log (APP-ERR-05) |
| `CLIPCREST_CONTACT_EMAIL`, `CLIPCREST_LEGAL_NAME`, `CLIPCREST_LEGAL_COUNTRY` | Text in the legal pages (LEGAL-02) |
| `CLIPCREST_DOWNLOAD_URL` | Download buttons on the landing page in Earn-only mode, and on Earn |
| `CLIPCREST_DATA` | Storage settings show the folder as fixed (APP-SET-22) |

## 5. API table

Every endpoint a page calls today, grouped by area. "Signed in" means any session; with sign-in off that is always
the owner. "Admin" routes answer 404 to everyone else. All non-GET calls must come from the page itself (section 3).
Server lines are where the route is declared in `studio/server.py`.

**Pages and set-up**

| Method | Path | Server | Who may call | Called by |
|---|---|---|---|---|
| GET | `/api/public` | L520-525 | anyone | LAND-03, LAND-14, AUTH-03, EARN-INFO-03, EARN-INFO-06, ADM-HDR-06, EADM-SET-07 |
| GET | `/api/status` | L671-680 | signed in | APP-SHELL-02, APP-SYNC-07, APP-SET-09, APP-SET-17, APP-ERR-05 (after confirming) |
| GET | `/api/sync?v=` | L766-775 (fast path in the Gate, L215-220) | signed in | APP-SYNC-01..06 |
| GET | `/api/overview` | L1405-1407 | signed in | APP-HOME-02..08 |
| GET | `/api/usage` | L1347-1349 | signed in | APP-USE-01..06 |
| PUT | `/api/settings` | L1415-1421 | signed in | APP-HOME-08 (`paused`), APP-TOUR-07 (`tour_done`) |

**Signing in**

| Method | Path | Server | Who may call | Called by |
|---|---|---|---|---|
| GET | `/api/auth/me` | L629-631 | anyone (works with sign-in off) | LAND-12, ADM-HDR-05 |
| POST | `/api/auth/signup` | L535-544 | anyone; 8 an hour per address | AUTH-06 |
| POST | `/api/auth/login` | L608-618 | anyone; throttled | AUTH-06 |
| POST | `/api/auth/logout` | L621-626 | anyone; 404 with sign-in off | APP-ACCT-04, APP-SET-12, EARN-HDR-10, ADM-HDR-08 |
| POST | `/api/auth/forgot` | L586-595 | anyone; throttled | RST-01 |
| POST | `/api/auth/reset` | L598-605 | anyone with a token | RST-02 |
| POST | `/api/auth/password` | L634-644 | signed in; 6 per 10 min | APP-SET-11 |
| POST | `/api/auth/verify-code` | L562-574 | signed in | APP-ERR-05, EARN-VER-02 |
| POST | `/api/auth/resend-verification` | L547-559 | signed in; 3 per 15 min | APP-ERR-05, EARN-VER-03 |
| GET | `/auth/google/start?next=` (link) | L647-655 | anyone, when Google is set up | AUTH-03 |
| POST | `/api/account/delete` | L1109-1122 | signed in | APP-SET-13 |
| GET | `/api/me/photo?v=` (image) | L1223-1229 | signed in | APP-NAV-11, APP-SET-10 |

**Videos, clips and uploads**

| Method | Path | Server | Who may call | Called by |
|---|---|---|---|---|
| GET | `/api/preview?url=` | L788-806 | signed in; 12 a minute | APP-COMP-04, APP-COMP-05 |
| POST | `/api/jobs` | L809-836 | signed in, email confirmed | APP-COMP-23..25 |
| POST | `/api/upload` (multipart) | L839-878 | signed in, email confirmed | APP-UPL-05 |
| POST | `/api/upload/start` | L918-959 | signed in, email confirmed | APP-UPL-06 |
| PUT | `/api/upload/<id>/<n>` (raw bytes) | L962-983 | the account that started it | APP-UPL-06 |
| POST | `/api/upload/<id>/finish` | L986-1020 | the account that started it | APP-UPL-06 |
| DELETE | `/api/upload/<id>` | L1023-1027 | the account that started it | APP-UPL-06 |
| POST | `/api/jobs/<job>/clips/<clip>/render` | L1030-1043 | signed in; 20 per 10 min | APP-CLIP-06 |
| DELETE | `/api/jobs/<job>` | L1046-1052 | signed in | APP-VID-05 |
| DELETE | `/api/jobs/<job>/clips/<clip>` | L1064-1072 | signed in | APP-VID-17 |
| POST | `/api/bulk/delete` | L1075-1080 | signed in; 30 per 10 min | APP-VID-19 |
| GET | `/api/clips.zip?ids=` (download link) | L1083-1094 | signed in; 12 per 10 min | APP-VID-20 |
| GET | `/media/<job>/<file>[?download=1]` (image, video, link) | L1125-1132 | signed in, own jobs | APP-VID-04, APP-VID-12, APP-VID-17, APP-CLIP-02, APP-CLIP-08 |
| POST | `/api/posts` | L1558-1567 | signed in | APP-CLIP-07 |
| POST | `/api/posts/<id>/cancel`, `/api/posts/<id>/retry` | L1570-1578 | signed in | APP-HOME-08 |

**Creators and live recording**

| Method | Path | Server | Who may call | Called by |
|---|---|---|---|---|
| GET | `/api/channel-preview?url=` | L1232-1248 | signed in; 12 a minute | APP-CRE-01 |
| POST | `/api/creators` | L1269-1280 | signed in | APP-CRE-01 |
| PUT | `/api/creators/<id>` | L1283-1300 | signed in; 60 per 10 min | APP-CRE-04..10, APP-LIVE-12 |
| DELETE | `/api/creators/<id>` | L1097-1106 | signed in | APP-CRE-11 |
| GET | `/api/creators/<id>/avatar?p=&v=` (image) | L1251-1261 | signed in | APP-NAV-07, APP-TOP-03, APP-COMP-12, APP-CRE-05 |
| POST | `/api/creators/<id>/live` | L1303-1319 | signed in, email confirmed | APP-LIVE-07 |
| POST | `/api/live/<job>/stop` | L1322-1328 | signed in | APP-LIVE-08 |
| POST | `/api/live/<job>/clip` | L1331-1343 | signed in; 6 a minute | APP-LIVE-10 |

**Notifications**

| Method | Path | Server | Who may call | Called by |
|---|---|---|---|---|
| GET | `/api/notifications` | L1210-1213 | signed in | APP-BELL-01, APP-BELL-07 |
| POST | `/api/notifications/read` | L1216-1220 | signed in | APP-BELL-03, APP-BELL-04 |

**Settings (AI, storage, posting accounts)**

| Method | Path | Server | Who may call | Called by |
|---|---|---|---|---|
| GET | `/api/ai` | L1358-1361 | admin | APP-SET-04..08 |
| PUT | `/api/ai` | L1364-1375 | admin | APP-SET-09 |
| POST | `/api/ai/models` | L1378-1389 | admin; 30 per 10 min | APP-SET-08 |
| POST | `/api/ai/test` | L1392-1401 | admin; 20 per 10 min | APP-SET-09 |
| GET | `/api/storage` | L1500-1504 | admin | APP-SET-18..22 |
| POST | `/api/storage/open` | L1507-1517 | admin, on the same computer | APP-SET-18 |
| POST | `/api/storage/pick` | L1520-1526 | admin, on the same computer | APP-SET-23 |
| PUT | `/api/storage` | L1529-1540 | admin | APP-SET-21, APP-SET-23 |
| GET | `/api/apps` | L1543-1546 | admin | APP-SET-17 |
| PUT | `/api/apps` | L1549-1555 | admin | APP-SET-17 |
| DELETE | `/api/accounts/<id>` | L1429-1432 | signed in | APP-SET-15 |
| GET | `/oauth/<platform>/start` (link) | L1443-1450 | signed in | APP-SET-16 |

**Earn (clippers)**

| Method | Path | Server | Who may call | Called by |
|---|---|---|---|---|
| GET | `/api/earn/public/overview` | L1687-1692 | anyone (`user: null` when signed out) | EARN-LOAD-01/02, EARN-HDR-04/05, EARN-HERO-02..11, EARN-LIST-*, EARN-LB-*, EARN-CALC-04..06, EARN-CTA-02, EARN-DASH-*, EARN-SUB-02/03, EARN-HOW-03 |
| GET | `/api/earn/public/campaigns/<slug>` | L1695-1697 | anyone; `sources` only for members | EARN-CAMP-01..15, EARN-ROUTE-03, EARN-JOIN-01 |
| GET | `/api/earn/me` | L1700-1702 | signed in | EARN-LOAD-01/02, EARN-DASH-*, EARN-SUB-*, EARN-CLIPS-*, EARN-PAY-*, EARN-PROF-01/05, EARN-CTA-02 |
| PUT | `/api/earn/profile` | L1705-1707 | signed in | EARN-PROF-02..05 |
| POST | `/api/earn/campaigns/<slug>/join` | L1710-1713 | signed in, confirmed, complete profile | EARN-JOIN-01/02 |
| POST | `/api/earn/submissions` | L1716-1723 | signed in, confirmed; 40 an hour | EARN-SUB-07/08 |
| DELETE | `/api/earn/submissions/<id>` | L1726-1729 | own pending clip | EARN-CLIPS-07 |
| POST | `/api/earn/submissions/<id>/proof` (multipart) | L1732-1736 | own pending clip; 9 MB cap | EARN-PROOF-02 |
| GET | `/api/earn/proof/<id>` (link, image) | L1739-1743 | the owner or an admin | EARN-PROOF-03, EADM-SUBM-12 |
| GET | `/earn/cover/<id>.jpg?v=` (image) | L1679-1684 | anyone | EARN-LIST-05, EARN-CAMP-04, EADM-COV-03 |

**Admin dashboard**

| Method | Path | Server | Who may call | Called by |
|---|---|---|---|---|
| GET | `/api/admin/overview` | L1606-1609 | admin | ADM-HDR-03, ADM-OVR-*, ADM-USR-*, ADM-LOG-*, ADM-POLL-01/02, ADM-HDR-10, ADM-ERR-04 |
| GET | `/api/admin/users/<id>` | L1612-1618 | admin | ADM-UDLG-01..07 |
| POST | `/api/admin/users/<id>/disabled` | L1621-1627 | admin | ADM-ACC-01..04 |
| POST | `/api/admin/users/<id>/delete` | L1630-1646 | admin | ADM-ACC-05..07 |
| GET | `/api/admin/feedback[?status=]` | L1192-1196 | admin | ADM-FB-01..09, ADM-HDR-04, ADM-HDR-10 |
| POST | `/api/admin/feedback/<id>` | L1199-1207 | admin | ADM-FB-05, ADM-FB-06, ADM-FB-10 |

**Earn admin**

| Method | Path | Server | Who may call | Called by |
|---|---|---|---|---|
| GET | `/api/admin/earn/summary` | L1746-1749 | admin | EADM-HDR-03, EADM-OVR-01..04, EADM-SET-01..04, EADM-NAV-04 |
| GET | `/api/admin/earn/campaigns` | L1752-1755 | admin | EADM-OVR-03, EADM-CAMP-*, EADM-SUBM-03, EADM-FORM-13 |
| POST | `/api/admin/earn/campaigns` | L1758-1761 | admin | EADM-FORM-13..16 |
| PUT | `/api/admin/earn/campaigns/<id>` | L1764-1767 | admin | EADM-CAMP-10..12, EADM-CAMP-16, EADM-FORM-13..16 |
| DELETE | `/api/admin/earn/campaigns/<id>` | L1770-1774 | admin | EADM-FORM-17 |
| POST | `/api/admin/earn/campaigns/<id>/cover` (multipart) | L1777-1782 | admin; 9 MB cap | EADM-COV-01, EADM-COV-02, EADM-COV-04 |
| GET | `/api/admin/earn/submissions?status=&campaign=&q=` | L1785-1788 | admin | EADM-SUBM-01..13, EADM-SUBM-18, EADM-SUBM-21 |
| POST | `/api/admin/earn/submissions/bulk` | L1791-1801 | admin | EADM-BULK-03, EADM-BULK-04, EADM-BULK-07 |
| POST | `/api/admin/earn/submissions/<id>` | L1804-1807 | admin | EADM-SUBM-14..16, EADM-SUBM-19, EADM-SUBM-20 |
| POST | `/api/admin/earn/submissions/<id>/views` | L1810-1813 | admin | EADM-SUBM-10, EADM-BULK-03, EADM-BULK-04 |
| POST | `/api/admin/earn/refresh` | L1823-1828 | admin | EADM-YT-01 |
| GET | `/api/admin/earn/clippers` | L1831-1834 | admin | EADM-CLIP-* |
| GET | `/api/admin/earn/owed` | L1837-1840 | admin | EADM-PAY-01..08 |
| GET | `/api/admin/earn/owed.csv` (link) | L1843-1847 | admin | EADM-PAY-09 |
| POST | `/api/admin/earn/payouts` | L1850-1853 | admin | EADM-PAY-05, EADM-PAY-10 |
| PUT | `/api/admin/earn/settings` | L1862-1866 | admin | EADM-SET-03..05 |

**Routes no page calls today** (keep them in mind; adding a UI for them is new work, not parity): `GET /api/jobs`,
`GET /api/jobs/<id>`, `GET /api/creators`, `GET /api/settings`, `GET /api/accounts`, `POST /api/alerts/test` (only a
dead `testalert` action refers to it), `POST /api/feedback` (nothing in `web/` sends feedback to the server, see
Q-20), `GET /api/admin/email-preview`, `POST /api/admin/test-email`, `GET /api/admin/earn/settings`,
`POST /api/admin/earn/submissions/<id>/proof`.

## 6. Browser storage

| Key | Kind | Written | Read | What it holds | Items |
|---|---|---|---|---|---|
| `mini` | localStorage | index L2344 | index L2545 | "1" when the sidebar is collapsed, "" when not | APP-NAV-02 |
| `view` | localStorage | index L1354 | never | the last view's name. Dead: nothing reads it (Q-01) | APP-ROUTE-09 |
| `lastNotice` | localStorage | index L1229, L1232 | index L1197 | the highest notification id already shown as a pop-up, so old ones are not replayed | APP-BELL-07 |
| `clipcrest_update_seen` | localStorage | index L1253, L2489 | index L1317 | the version whose update banner the user hid with "Later" | APP-UPD-01, APP-UPD-02 |
| `clipcrest_link` | sessionStorage | landing L459 | index L2561-2562 (then removed) | a link pasted on the landing page before signing up | LAND-05, APP-ROUTE-11 |
| `clipcrest_session` | cookie (HttpOnly, set by the server) | server on sign-in (`studio/auth.py` L16, L374-376) | the server | the session; 30 days, SameSite=Lax, Secure on https. Scripts cannot read it | all signed-in pages |
| `g_state` | cookie (HttpOnly, path `/auth/google`) | server L654 | server L660 | ties the Google sign-in round trip to this browser, 15 minutes | AUTH-03 |

No other page uses browser storage: `earn.html`, `admin.html`, `earn-admin.html`, `auth.html`, `reset.html` and
`legal.html` keep everything in memory or in the address. Three accesses in `index.html` are not wrapped in
`try`, so a browser that blocks storage stops the app from starting (Q-27).

**State kept only in memory** (lost on reload; the React port must not accidentally persist it unless the owner
asks): the app's composer drafts per page (APP-COMP-11), the selection of videos and clips (APP-VID-18), which
platform's live stream is playing (APP-LIVE-02), the open Storage change form and the open app set-up panel, Earn's
dashboard tab and the "send a clip for" campaign, the admin dashboard's search, filter, sort and feedback status, the
Earn admin's selection, campaign filter and search.

**State kept in the address:** the app's view (`/app/...`) and its one-time messages (`?connected=`,
`?connect_error=`, `?verified=`, `?verify_error=`); Earn's hash (`#c=<slug>`, `#me`, `#submit=<link>`); the admin
tabs (`/admin/<tab>`, `/admin/earn/<tab>`); the legal page; sign-in's `?next=` and `?error=google`; the reset
token `?t=`.

## 7. External embeds and assets

The Content Security Policy (server L49-52) decides what a page may load. The React build must live inside it:
scripts only from this server (inline allowed), styles from this server and Google Fonts, fonts from
`fonts.gstatic.com`, images only from this server or `data:`, media from this server or `blob:`, network calls only
to this server, frames only from the three players below, and the page itself may not be framed.

| What | Where | Used for | Notes |
|---|---|---|---|
| Twitch player | `https://player.twitch.tv/?channel=<login>&parent=<host>&muted=true&autoplay=true` (index L1106) | live player on a creator page (APP-LIVE-01) | Twitch needs `parent` to be a real host name; on an IP address the page shows a link instead (APP-LIVE-03) |
| YouTube player | `https://www.youtube-nocookie.com/embed/<video id>?autoplay=1&mute=1&playsinline=1` (index L1107) | same | |
| Kick player | `https://player.kick.com/<slug>?muted=true&autoplay=true` (index L1108) | same | |
| Google Fonts | `fonts.googleapis.com` / `fonts.gstatic.com` | Geist on every page except `legal.html` (Q-21); Inter 300 for GradientASCII (index, landing); Archivo Black, Anton, Poppins 800 for the caption previews (index L10); Geist Mono 500 on Earn | the pages fall back to Segoe UI / system fonts; tests can block these hosts |
| GradientASCII | `/assets/gradient-ascii.js` | hero backgrounds on the app's Home, the landing page and Earn | see GA-01 |
| Demo clips | `/brand/demo-bounce.mp4`, `demo-hype.mp4`, `demo-clean.mp4` with `.jpg` posters | landing (LAND-08, LAND-11, LAND-13), Earn hero | muted, looping, autoplay |
| Logos | `/brand/logo.svg` (dark text), `/brand/logo-light.svg` (light text), `/brand/favicon.svg`; `/brand/logo-email.png` is for emails only | every page | |
| Data images | `data:` thumbnails from `/api/preview` (`studio/media.py` L193-216) | link rows in the composer | why `img-src` allows `data:` |
| Blob video | `blob:` URLs of picked files | file rows in the composer | why `media-src` allows `blob:` |
| Web Audio | generated tones, no file | the notification chime (APP-BELL-07) | |
| Links out (new tab) | the GitHub repo and its issues page, the maker's profile, GitHub commits (update dialog), AI providers' key pages, Google Cloud, Meta for Developers and TikTok for Developers consoles, `wa.me`, social profile links, `mailto:` | | checked by href only in tests |

There are no analytics, trackers or third-party scripts on any page.

## 8. The app: `web/index.html`

The signed-in app. One HTML file: CSS L11-824, markup L826-848, script L851-2569. Every `/app/...` address serves
this file and the script shows the right view. State lives in one object `S` (L1076-1077): `status` (from
`/api/status`), `jobs`, `creators`, `accounts` (from `/api/sync`), `overview`, `usage`, `view`, `ctab` (creator
tab), `stab` (settings tab). Most clicks go through one handler that reads `data-act` (L2315-2542); an error thrown
by any action becomes a red toast and re-enables the button (L2541).

**Views:** `overview` (Home), `library` (All videos), `c:<creator id>` (a creator, with tabs `clips`, `setup`,
`activity`), `settings` (tabs `ai`, `profile`, `security`, `apps`, `storage`), `usage` (AI usage).

### 8.1 Shell (APP-SHELL)

- [ ] **APP-SHELL-01 Page frame.** A dark sidebar on the left and a white, rounded main panel that scrolls on its own.
  - Trigger: page load · API: none · State: none · Notes: grid of 240px sidebar and main (L33); main has an 8px margin and rounded corners (L73); body never scrolls (L24); content is centred, max 1280px (L179). Markup L827-848.
- [ ] **APP-SHELL-02 Start-up order.** The page loads its status, reads the address, loads data, then draws the view.
  - Trigger: script start (L2547-2568; see Q-11 for a failed first status call) · API: `GET /api/status` first; then `GET /api/sync`; then `GET /api/overview` when the view is Home · State: everything · Notes: order is: status (failure ignored, L2548), one-time query messages (APP-ROUTE-10), view from the address (L2557), first sync (L2558), draw the view and replace the address with its canonical form (L2559), the hand-off link from the landing page (APP-ROUTE-11), start polling (L2564), the tour if due (APP-TOUR-01), notification baseline (APP-BELL-07), then the 15-second status timer (L2567).
- [ ] **APP-SHELL-03 Tab title and icon.** The browser tab reads "ClipCrest" with the brand favicon on every view.
  - Trigger: `<title>` (L6), favicon `/brand/favicon.svg` (L7) · API: none · Notes: the title does not change per view. Port note: changing it per view is allowed (it adds, it does not remove).
- [ ] **APP-SHELL-04 Top bar edge when scrolled.** The top bar gets a thin bottom line once the main panel is scrolled.
  - Trigger: scroll of `#main` > 4px (L2546) · Notes: class `stuck` (L75). Always on when creator tabs are shown (L93).
- [ ] **APP-SHELL-05 Confirm dialog.** A modal with a title, a sentence, "Cancel" and an action button.
  - Trigger: `ask(title, text, okLabel, danger)` (L945-952) · API: none · Notes: the action button is red for dangerous actions, brand-green otherwise, and has focus. Esc or Cancel answers no. Used by APP-VID-05, APP-VID-17, APP-VID-19, APP-CLIP-07, APP-CRE-09, APP-LIVE-08, APP-SET-15.
- [ ] **APP-SHELL-06 Typed confirmation dialog.** For the two biggest deletions, the user must type a word before the red button works.
  - Trigger: `askTyped(title, text, mustType, okLabel)` (L1830-1840) · Notes: label "Type **X** to confirm"; the button stays disabled until the typed text matches, ignoring case and outer spaces; the field gets focus. Used by APP-CRE-11 (creator name) and APP-SET-13 (email).
- [ ] **APP-SHELL-07 How API errors are handled.** Every call shares one helper.
  - Trigger: `api()` and `send()` (L930-936) · Notes: a 401 sends the browser to `/login`; any other failure throws the server's `detail` text (or the status text, or "Something went wrong"); `send()` posts JSON. Network failures throw the browser's own message (see Q-12).
- [ ] **APP-SHELL-08 Reduced motion.** With "reduce motion" set in the system, nothing animates.
  - Trigger: `prefers-reduced-motion: reduce` (L799) · Notes: also the tour moves instantly (L988) and its scrolling is not smooth (L1044).
- [ ] **APP-SHELL-09 Layout at smaller widths.** The app works from phone width up.
  - Trigger: media queries (L748-764, L800-823) · Notes: ≤1100px tiles in 2 columns and stacked Home grid; ≤900px sidebar becomes a drawer (APP-NAV-13), dialogs stack; ≤760px creator tabs drop to their own row; ≤640px clip grid in 2 columns, the post-queue table becomes labelled rows; ≤560px smaller top-bar buttons, full-width "Make clips".
- [ ] **APP-SHELL-10 Visual rules.** Hover changes colour only, never size; no shadows; brand-green focus ring.
  - Trigger: CSS (L29, L720-745) · Notes: from AGENTS.md: keep the palette (`:root`, L12-20), no shadows, colour-only hover states.

### 8.2 Sidebar and navigation (APP-NAV)

- [ ] **APP-NAV-01 Logo.** The full light logo at the top of the sidebar; only the round mark when collapsed.
  - Trigger: `.side-head` (L829) · Notes: `/brand/logo-light.svg` and `/brand/favicon.svg` (L36-37, L186).
- [ ] **APP-NAV-02 Collapse the sidebar.** A button shrinks the sidebar to a 76px icon rail and back; the choice is remembered.
  - Trigger: `button[data-act=collapse]` `#collapseBtn` (L830, L2344) · API: none · State: localStorage `mini` ("1" collapsed, "" expanded), read at start (L2545) · Notes: collapsed hides labels, counts, section titles, Rec/Live tags, the AI card text and the name under the avatar (L184-196, L678, L688-689). The button is hidden on phones (L756), where the drawer always shows the full sidebar (L754-755). Its label is always "Collapse sidebar" (Q-15).
- [ ] **APP-NAV-03 Home.** Goes to Home; highlighted when active, with a filled icon.
  - Trigger: `.nav-item[data-act=go][data-v=overview]` (L1272) · API: see APP-HOME-02 · Notes: filled icon variants via `navIc` (L924).
- [ ] **APP-NAV-04 All videos, with a work counter.** Goes to All videos. Shows "N working" with a spinner while videos are being made, otherwise the number of videos.
  - Trigger: `[data-v=library]` (L1273-1274) · State: `jobs[].status` in `queued`/`running` · Notes: no badge when there are no videos; tooltip "N working now".
- [ ] **APP-NAV-05 Earn link.** "Earn" with a "New" pill, linking to the Earn website.
  - Trigger: `a.nav-item[href=earn_url]` (L1275) · State: `status.earn_url`, `status.accounts` · Notes: shown only when `earn_url` is set. A normal link (full page load); opens in a new tab when sign-in is off. Title "Earn: paid clipping campaigns".
- [ ] **APP-NAV-06 Creators heading.** A small "Creators" heading above the creator list.
  - Trigger: L1276.
- [ ] **APP-NAV-07 One item per creator.** Each creator's avatar and name; a red ring and a "Rec" or "Live" tag while recording or live.
  - Trigger: `[data-act=go][data-v=c:<id>]` (L1277-1279) · State: `creators[]` order from the server; `live_job`; `profiles[k].live`; `profile.pic` · Notes: avatar is `/api/creators/<id>/avatar?v=<time>` only when the main channel's profile has a picture, otherwise the first letter (L1147-1148, L1102). "Rec" (title "Recording now") wins over "Live" (title "Live on Twitch and Kick", the platforms joined). Tags hidden when collapsed.
- [ ] **APP-NAV-08 New creator.** Opens the New creator dialog.
  - Trigger: `button[data-act=newcreator]` (L1280) · See APP-CRE-01.
- [ ] **APP-NAV-09 Owner section.** Admin links in the sidebar. See APP-ADML-01 and APP-ADML-02.
- [ ] **APP-NAV-10 AI card.** Under the list: "AI" and the provider name (or "Not set up") and today's call count. Opens AI usage.
  - Trigger: `button.ai-card[data-act=go][data-v=usage]` (L1284-1285) · State: `status.ai.ready`, `provider`, `today_calls` · Notes: outlined when the AI usage view is open; tooltip "AI: <provider>, N calls today" or "The AI is not set up". Hidden when `status.ai` is missing.
- [ ] **APP-NAV-11 Me button.** The user's picture or a coloured initial, with name and email; opens the account menu.
  - Trigger: `button.me-btn[data-act=acctmenu]` (L1286-1287) · API: `GET /api/me/photo?v=<stamp>` when `user.photo` is set · State: `status.user`, `status.accounts` · Notes: without a photo, a gradient picked from a hash of the email (8 gradients, L1149-1156). With sign-in off the text is "Settings" / "AI key, connected apps". `aria-expanded` follows the menu.
- [ ] **APP-NAV-12 Bell.** A bell button with a red unread count ("9+" above 9).
  - Trigger: `button.bell[data-act=bell]` (L1288) · State: `status.unread` · Notes: aria-label "Notifications, N new". See APP-BELL.
- [ ] **APP-NAV-13 Phone drawer.** At 900px and below the sidebar slides in over the page from a menu button.
  - Trigger: `#menuBtn[data-act=menu]` in the top bar; the dark scrim `[data-act=menu]` (L834, L836, L2343) · Notes: 280px wide, slides from the left (L749-758); choosing any view closes it (L1355); the tour opens it for sidebar steps (L1029).
- [ ] **APP-NAV-14 Tooltips on every item.** Each nav item has a `title` with its label, which is what shows in the collapsed rail.
  - Trigger: L1271.

### 8.3 Top bar, title and tabs (APP-TOP)

- [ ] **APP-TOP-01 Title.** "Home", "All videos", "Settings", "AI usage", or the creator's name.
  - Trigger: `#title` (L1291, L1298, L1327).
- [ ] **APP-TOP-02 Subtitle.** A line under the title that depends on the view.
  - Trigger: `#subtitle` (L1292-1295) · State: local hour, `creators.length`, creators recording · Notes: Home: "Good morning." / "Good afternoon." / "Good evening." (before 12, before 18, after; L1256) followed by "N creator(s), M recording now."; All videos: "Every video and recording, across all creators."; Settings: "Your profile, security and connected apps." or, with sign-in off, "Your AI key and connected apps."; AI usage: "What the AI has been used for.".
- [ ] **APP-TOP-03 Creator header.** On a creator page: a 42px avatar (red ring when recording or live) and a status badge as the subtitle.
  - Trigger: `#tpic`, `#subtitle` (L1297-1300, L1325) · State: `live_job`, `profiles`, `channels`, `auto_watch` · Notes: badge texts (L1140-1146): "Recording"; "Live on <Platform> · N watching"; "No channel yet"; "Offline" or "Offline · records when live".
- [ ] **APP-TOP-04 Creator tabs.** "Clips", "Setup", "Activity", with counts, and a green pill that slides to the chosen tab.
  - Trigger: `button.tabbtn[data-act=tab][data-t=clips|setup|activity]` in `#utabs` (L1302-1303) · State: number of this creator's videos; number of log lines · Notes: counts above 99 show "99+"; `role=tab`, `aria-selected`. The pill animates from the previous tab (L1257-1270) and is re-placed on window resize (L1258). Centred in the bar on wide screens, own row at 760px and below (L98-99). The tab labels hide their text at ≤900px only in `.ttabs` (unused, Q-17).
- [ ] **APP-TOP-05 Record button on a creator page.** "Stop recording" while recording; otherwise "Record live stream" when they are live, or "Start recording".
  - Trigger: `[data-act=stoplive][data-j=<job>]` or `[data-act=golive]` in `#actions` (L1304-1305) · See APP-LIVE-07, APP-LIVE-08 · Notes: at 560px and below only the red dot shows (L150).
- [ ] **APP-TOP-06 Buttons on Home and All videos.** "Star on GitHub" (or "₹ Earn money" when there is no repo link but there is Earn), and "Follow me".
  - Trigger: links in `#actions` (L1307-1311) · State: `status.links.repo`, `.earn`, `.follow` · Notes: open in a new tab. "Follow me" shows the site's icon and the title "Follow the maker of ClipCrest on <Site>" (sites: LinkedIn, Instagram, YouTube, GitHub, X; otherwise a person icon, L917-923). " on GitHub" and " money" hide at 560px and below (L160).
- [ ] **APP-TOP-07 No buttons on Settings and AI usage.** The action area is empty there.
  - Trigger: L1291-1327.

### 8.4 Routing (APP-ROUTE)

| Address | View |
|---|---|
| `/app` | Home |
| `/app/videos` | All videos |
| `/app/usage` | AI usage |
| `/app/settings` | Settings, first tab this user may see |
| `/app/settings/ai`, `/profile`, `/security`, `/apps`, `/storage` | that Settings tab |
| `/app/creators/<id>` (and `/clips`) | creator, Clips tab |
| `/app/creators/<id>/setup`, `/activity` | creator, that tab |
| anything else under `/app/` | Home |

- [ ] **APP-ROUTE-01 Address to view.** Every address in the table above opens its view, including on a fresh load.
  - Trigger: `fromPath()` (L1336-1343) · Notes: a trailing slash is accepted; creator ids are URL-decoded.
- [ ] **APP-ROUTE-02 View to address.** Moving around updates the address bar.
  - Trigger: `pathFor()` (L1331-1335), `remember()` (L1344-1347) · Notes: the Clips tab is left out of creator addresses; creator ids are URL-encoded.
- [ ] **APP-ROUTE-03 History entries.** Going to a view adds a history entry; switching creator tabs replaces it; choosing a Settings tab adds one.
  - Trigger: `go()` (L1353), `setTab()` (L1374), `settab` (L2487).
- [ ] **APP-ROUTE-04 Back and forward.** The browser's back and forward buttons move between views without adding entries.
  - Trigger: `popstate` (L1348).
- [ ] **APP-ROUTE-05 Deep links.** Opening any app address directly shows that view once data has loaded, and the address is tidied with `replaceState`.
  - Trigger: L2557-2559 · Notes: see Q-02 for `/app/settings` without a tab, and Q-04 for a Settings tab leaking into creator addresses.
- [ ] **APP-ROUTE-06 Unknown or deleted creator.** A creator address that is not yours, or a creator deleted while open, goes to Home.
  - Trigger: `go()` (L1350); after a sync (L2242).
- [ ] **APP-ROUTE-07 Settings tab you may not see.** A Settings address for a tab you cannot see shows the first tab you can.
  - Trigger: L1352 · Notes: for example `/app/settings/ai` for a non-admin, `/app/settings/profile` with sign-in off.
- [ ] **APP-ROUTE-08 The animated background stops when leaving Home.**
  - Trigger: `window._gaStop()` in `go()` (L1357) · Notes: no WebGL loop keeps running on other views.
- [ ] **APP-ROUTE-09 Last view.** `/app` always opens Home. The last view is written to localStorage `view` (L1354) but never read.
  - Port note: the key is dead; the React app need not write it (Q-01). The address is what restores a view.
- [ ] **APP-ROUTE-10 One-time messages in the address.** After connecting an account or confirming an email, a message shows once and the query is removed.
  - Trigger: query on load (L2549-2556) · Notes: `?connected=<platform>&name=<name>` → green toast "<name> is connected. Pick it in a creator's Setup to post there."; `?connect_error=<msg>` → red toast with the message; `?verified=1` → "Email confirmed. You're ready to clip."; `?verify_error=<msg>` → red toast. Shown 300ms after load; the query is removed with `replaceState`.
- [ ] **APP-ROUTE-11 Link handed over from the landing page.** A link pasted on the landing page before signing up is waiting in the Home box.
  - Trigger: sessionStorage `clipcrest_link` (L2560-2563) · Notes: the key is removed, the app goes Home, fills the link box, starts recognising the link (APP-COMP-02), focuses the box and shows "Your link is ready. Press Make clips.".
- [ ] **APP-ROUTE-12 In-app links do not reload the page.** Links with `data-act` (for example creator names in the Home table, `href="#"`) are handled in the page.
  - Trigger: L2318.
- [ ] **APP-ROUTE-13 Links from notifications.** A notification link inside `/app` opens that view in the page; any other site path (for example `/earn#me`, `/admin/feedback`) is a normal page load.
  - Trigger: `ntgo` (L2513), notification pop-up click (L1219).

### 8.5 Home and the composer (APP-HOME)

- [ ] **APP-HOME-01 Hero.** "What do you want to clip today?", "Paste a link or drop in videos. You get captioned shorts back.", the large composer, and an animated green ASCII gradient behind it.
  - Trigger: Home view, `#heroSlot` (L1358-1359, L1365-1366) · Notes: GradientASCII options at L1366 (`horizon` shape, light mode, cell 16, density 0.8, no mouse effects). The gradient is skipped quietly if it fails (WebGL missing). See GA-01.
- [ ] **APP-HOME-02 Home data.** The tiles, chart and tables come from one overview call.
  - Trigger: entering Home (L1370) · API: `GET /api/overview` on entering Home; on each sync that brought changes while on Home (L2241); on an unchanged sync when the last load is older than 20s (L2232); after pause, cancel, retry (L2516-2517) · State: `recording`, `creators[]`, `daily[]`, `posts[]`, `paused` · Notes: redrawn on the 15-second status timer (L2567). A failed load shows nothing until a later load works.
- [ ] **APP-HOME-03 Four tiles.** "Recording now", "Clips today", "Posted today", "Waiting to post" (with " · N failed" in red and a warning icon when posts failed).
  - Trigger: L1975-1979 · State: `overview.recording`; sums over `overview.creators[]` of `clips_today`, `posted_today`, `queued`, `failed`.
- [ ] **APP-HOME-04 Activity chart.** "Activity", "Last 14 days", four numbers and a bar chart of clips made and posted per day.
  - Trigger: L1981-1985, `barChart()` (L1942-1959) · State: `overview.daily[]` (`day`, `clips`, `posted`, `views`), `creators[].views`, `.earnings` · Notes: numbers: Clips made, Posted (sums of the 14 days), Views (sum, locale format), Est. earnings ("$" + two decimals). Two bars per day (green clips, dark posted), 4 grid lines, every other day labelled, the last "Today"; hovering a day shows "<date>: N clips made, M posted, V views". With no data: "No clips in the last 14 days yet".
- [ ] **APP-HOME-05 AI card on Home.** "AI", the provider (or "Not set up"), the model (or "Clips are picked by loudness until an AI key is added."), AI calls today, tokens today, and buttons.
  - Trigger: `aiCard()` (L1084-1092) · State: `status.ai.*`, `status.user.is_admin` · Notes: "Add AI key" (admins, when not ready) goes to `/app/settings/ai`; "View usage →" goes to AI usage. Tokens shown short (1.2K, 3M; L1103).
- [ ] **APP-HOME-06 Next steps.** A numbered list of set-up steps that are still open. The card is hidden when none are.
  - Trigger: `button.step[data-act=step][data-to=...]` (L1960-1967, L1988-1989, L2347-2353) · State: creators, jobs, accounts, `auto_watch` · Notes: "Add your first creator" (opens the New creator dialog), "Make your first clips" (focuses the link box), "Connect a posting account" (opens Settings; for admins that lands on the AI tab, Q-08), "Turn on auto-record" (opens the first creator's Setup). Heading "Next steps", "Finish setting up ClipCrest".
- [ ] **APP-HOME-07 Creators table.** Each creator with status, auto-post, clips, posts, waiting, failed, views and estimated pay.
  - Trigger: L1990-1993 · State: `overview.creators[]` · Notes: columns Creator (link to the creator), Status ("Recording" red / "Waiting for live" / "Idle"), Auto-post (On/Off), Clips today "N / total", Posted today "N / total", Waiting, Failed, Views, Est. $. Scrolls sideways on phones. Empty: "No creators yet" and "Add one to give each streamer their own workspace.".
- [ ] **APP-HOME-08 Post queue.** Scheduled, posting, posted and failed posts, with pause, cancel and retry.
  - Trigger: L1994-1999 · API: "Pause all posting" / "Resume posting" → `PUT /api/settings {paused: !paused}` then reload overview (L2516); "Cancel" (scheduled) → `POST /api/posts/<id>/cancel`; "Retry" (failed) → `POST /api/posts/<id>/retry` (L2517) · State: `overview.posts[]` (`status`, `title`, `url`, `error`, `creator_name`, `account_name`, `views`, `due_at`), `overview.paused` · Notes: subtitle "Queued clips go out at their scheduled time." or "Paused. Recording and clipping carry on; nothing is posted."; status pills Posted / Failed / Posting now / the scheduled time (weekday and time); the clip title links to the post when it has a URL; errors show under the title; creator "None" when unfiled; views "–" when unknown. On phones each row stacks with labels (L812-819). Empty: "Nothing queued or posted yet.".
- [ ] **APP-HOME-09 After starting from Home.** When every video started without errors, the app moves to the creator they were filed under, or to All videos.
  - Trigger: `makeClips()` (L1688-1690).

### 8.6 The composer (APP-COMP)

The composer adds videos by link or file. It appears large on Home (`hero`) and compact on All videos and on a
creator's Clips tab (L1384-1414). Nothing starts until "Make clips" is pressed.

- [ ] **APP-COMP-01 Link box.** One input: "Paste a YouTube, Twitch or Kick video link"; once anything is attached it reads "Paste another link".
  - Trigger: `#url` (L1387, L1542) · Notes: `aria-label="Video link"`, no autocomplete; the composer border turns green on focus (L271).
- [ ] **APP-COMP-02 Link recognition while typing.** The box tells a channel from a video and only takes real video links.
  - Trigger: `input` on `#url` → `onLink()` (L1576-1586) · Notes: empty clears the note. A channel link (twitch.tv/<name>, kick.com/<name>, youtube.com/@x or /channel/x, optionally /live, /videos, /streams) shows "That's a channel, not a video. To clip their live streams, add them as a creator and press Start recording." Not a YouTube, Twitch or Kick http(s) link: "Paste a full YouTube, Twitch or Kick video link." (only once the text is longer than 10 characters). Patterns at L1485-1487. A complete video link (`?v=<11>`, `youtu.be/<11>`, `/shorts|/live|/embed/<11>`, `twitch.tv/videos/<6+ digits>`, `clips.twitch.tv/...`, `twitch.tv/<x>/clip/<y>`, `kick.com/<x>/video(s)|clip(s)/<id>`) is taken at once; other link shapes are taken 900ms after typing stops.
- [ ] **APP-COMP-03 Enter takes the link.** Pressing Enter in the box takes a link-looking text at once instead of waiting.
  - Trigger: keydown Enter on `#url` (L1588).
- [ ] **APP-COMP-04 Taking a link.** The box empties at once for the next link; the link appears in the list as a loading row.
  - Trigger: `takeLink()` (L1560-1574) · API: `GET /api/preview?url=<link>` · Notes: the same link twice is ignored; when the batch is full the note reads "You can send up to N videos at a time. Remove one first." (N = `status.max_batch`, default 5).
- [ ] **APP-COMP-05 Preview lookup and its errors.** The link is checked on the server; the row shows the video or the reason it cannot be used.
  - Trigger: `lookUp()` (L1549-1559) · API: `GET /api/preview?url=` (server L788-806) · Notes: on a network drop it tries once more after 800ms, then shows "Couldn't reach ClipCrest to check that link. Check your connection and paste it again.". Server messages shown on the row: 400 "Paste a full link to a YouTube, Twitch or Kick video.", 429 "Too many links at once. Wait a moment." (12 a minute), 429 "Lots of people are looking things up right now. Try again in a few seconds.", 503 YouTube refusing, 422 "Couldn't open that video. Check the link is public and complete.". The thumbnail comes back as a `data:` image (`studio/media.py` L193-216).
- [ ] **APP-COMP-06 Ready link row.** Thumbnail, length, title, uploader, and a state: "Ready", "Live now" or "Sending".
  - Trigger: L1518-1527, `rowHtml()` (L1508-1513) · State: preview `title`, `uploader` (or "Video link"), `duration`, `is_live`, `thumb` · Notes: no length badge for live streams; the ✕ "Remove <title>" button is hidden while sending.
- [ ] **APP-COMP-07 Failed link row.** A red row with the link in bold and the reason, and ✕ to remove it.
  - Trigger: L1521-1522 · Notes: failed links do not count toward the batch limit (L1489).
- [ ] **APP-COMP-08 Note row.** Messages about what was typed show as a red row at the top of the list.
  - Trigger: `A.note` (L1517).
- [ ] **APP-COMP-09 "Add another video".** A row "Add another video" with "n of N" while there is room.
  - Trigger: `button.addrow[data-act=addmore]` (L1533-1535, L2356) · Notes: shown when 0 < n < N and nothing is sending. With the link box empty it focuses the box and says "Paste another link, or drop a file anywhere on the box."; with text in the box it opens the file picker.
- [ ] **APP-COMP-10 Attachment list opens smoothly.** The list grows open when it has rows and closes when empty.
  - Trigger: `#att.has` (L1541, L295-297).
- [ ] **APP-COMP-11 Separate drafts per page.** Home, All videos and each creator keep their own list of links and files.
  - Trigger: `DRAFTS` keyed by view or `c:<id>` (L1476-1481) · Notes: kept in memory only; a reload empties them. A link typed for one creator never shows under another.
- [ ] **APP-COMP-12 Creator picker.** Outside a creator page, a chip to file the new videos under a creator.
  - Trigger: `.pick` with hidden input `#o_creator` (L1391, L1422-1428) · State: `creators[]` · Notes: options "No creator" and every creator (with avatar); the chosen one has a tick; "New creator" at the bottom opens APP-CRE-01; with no creators the menu says "No creators yet. Add one to keep each streamer's clips, settings and accounts together.". A dark drop-down list (L341-358).
- [ ] **APP-COMP-13 Picker keyboard and mouse.** The picker works like a list box.
  - Trigger: L1440-1467 · Notes: click toggles; opening focuses the chosen option; ArrowDown/ArrowUp open it and move through options (wrapping); Esc closes and returns focus to the chip; clicking outside closes; choosing closes, updates the chip text, returns focus and fires `change`.
- [ ] **APP-COMP-14 Picking a creator sets captions on or off.** Choosing a creator copies that creator's "Generate captions" setting, unless the user already changed the switch.
  - Trigger: `change` on `#o_creator` (L2285-2289) · Notes: only captions follow the picked creator; the other options keep their values (Q-18).
- [ ] **APP-COMP-15 Options panel.** "Options" opens a panel of clip settings.
  - Trigger: `button.chip[data-act=toggleopts]` (L1392, L2345) · Notes: animated open and close; the closed panel is `inert`; the chip is highlighted and `aria-expanded` follows.
- [ ] **APP-COMP-16 How many and how long.** Three number steppers: "How many" (1-20, default 6), "Shortest" (5-120 s, step 5, default 15), "Longest" (10-180 s, step 5, default 60).
  - Trigger: `[data-step=o_max|o_min|o_maxlen]` buttons, inputs `#o_max`, `#o_min`, `#o_maxlen` (L1397-1401, L1429-1434, L1455-1457) · State: on a creator page the defaults are that creator's `max_clips`, `min_len`, `max_len` · Notes: − and + stay within the limits; typed values are not limited in the page (the server checks them).
- [ ] **APP-COMP-17 Generate captions.** A switch; when off, the caption style tiles are disabled.
  - Trigger: `#o_captions[data-caption-toggle]` (L1403, L2280-2293) · Notes: default on, or the creator's setting.
- [ ] **APP-COMP-18 Caption style tiles.** One tile per style from the server (Bounce, Hype, Clean), each with a small preview of "CLIP THIS" or "Clip this".
  - Trigger: `button.tile-o[data-seg=o_style]` (L1404, L1435-1438) · State: `status.styles` · Notes: default `bounce` or the creator's style. Port note: the previews must match the real render (Q-03).
- [ ] **APP-COMP-19 Layout tiles.** One tile per layout from the server with a short name and a mini picture: "Blurred fill", "Zoomed in", "Fill screen", "Gameplay + facecam".
  - Trigger: `[data-seg=o_layout]` (L1405, L1415) · State: `status.layouts` · Notes: the full name is the tooltip; default `blur` or the creator's layout. The gameplay layout has no mini picture of its own (L388-393).
- [ ] **APP-COMP-20 Video quality.** Two buttons: "720p" "Fast" (default) and "1080p" "Sharper, about 2x slower".
  - Trigger: `[data-seg=o_quality]` (L1406-1408) · Notes: not taken from the creator.
- [ ] **APP-COMP-21 Part of the video.** Optional "From" and "To" minutes.
  - Trigger: `#o_from`, `#o_to` (L1409-1411) · Notes: sent as `range_start` and `range_end` in seconds (minutes × 60) only when filled in (L1472-1473).
- [ ] **APP-COMP-22 Make clips button.** Shows what will happen.
  - Trigger: `#goBtn` (L1394, L1543-1546) · Notes: "Make clips", or "Make clips (k)" when more than one is ready; "Sending…" and disabled while sending; "Finding video…" while waiting for a lookup.
- [ ] **APP-COMP-23 Starting the work.** Pressing Make clips (or Enter in the form) sends every ready link, then every file.
  - Trigger: form submit `#addform` (L2267) → `makeClips()` (L1655-1692) · API: per link `POST /api/jobs {url, options, creator}`; per file APP-UPL-05 or APP-UPL-06 · Notes: a link still in the box is taken first. If a link is still being looked up: "Finding the video first. Clipping starts as soon as it's found." and the start happens by itself when the lookup ends, or "That link couldn't be used. The reason is shown on it." (L1569-1572). Nothing usable: the note or "Paste a YouTube, Twitch or Kick video link, or add a video file first." and the box gets focus. Each item is sent one at a time; failures stay in the list with their reason; sent items leave the list. Then "Your video is being clipped now." or "N videos are being clipped now."; if nothing started: "Nothing was started. The reason is shown on the video.".
- [ ] **APP-COMP-24 What is sent.** The options and the creator for every new video.
  - Trigger: `jobOptions()`, `targetCreator()` (L1468-1475) · Notes: `{max_clips, min_len, max_len, captions, style, layout, quality, range_start?, range_end?}`; creator is the page's creator, or the picker's value, or "".
- [ ] **APP-COMP-25 Refusals from the server.** Reasons a video could not start are shown on its row.
  - Trigger: `POST /api/jobs` (server L809-836), upload checks (server L169-177) · Notes: email not confirmed (403), ffmpeg missing (503), "You already have N videos in progress. Wait for one to finish." (429), drive or storage full (507), 30 new videos per 10 minutes (429), YouTube refusing (503), "Those options aren't valid." (400), "No such creator" (404).

### 8.7 Uploads (APP-UPL)

- [ ] **APP-UPL-01 Upload button.** "Upload video" opens the file picker; several files can be picked.
  - Trigger: `button.chip[data-act=pickfile]` (L1390, L2355) clicks hidden `#file` (`accept="video/*" multiple`, L845) · Notes: the input is cleared after each pick so the same file can be picked again (L2276).
- [ ] **APP-UPL-02 Drag and drop.** Dragging files over the page highlights the composer; dropping attaches them.
  - Trigger: `dragover`, `dragleave`, `drop` on the document (L2277-2279) · Notes: only when a composer is on the page; class `over` (L273). The hint "or drop a video file here" shows in the bar on wider screens (L1393, hidden at 560px and below).
- [ ] **APP-UPL-03 File checks.** Only videos within the limits are attached.
  - Trigger: `attach()` (L1492-1504) · State: `status.max_upload_mb`, `status.max_batch` · Notes: a file that is not `video/*` and has no video extension (.mp4 .mov .mkv .webm .m4v .ts .flv) → "<name> is not a video file."; too big → "<name> is over the N MB limit." (by default there is no limit); the same name and size again is skipped silently; over the batch → "You can send up to N videos at a time. Start these, then add more.".
- [ ] **APP-UPL-04 File row.** A still from the video, its length, name, "<size> · uploaded file" and "Ready".
  - Trigger: L1528-1532, L1537-1540 · Notes: the still is a muted `<video>` at 1s from a `blob:` URL; the length is read from the file's metadata; sizes as "N MB" or "N.N GB". ✕ removes the row and frees the blob URL (L1589-1595).
- [ ] **APP-UPL-05 Upload in one go.** Files up to the piece size go up in one request with a progress bar.
  - Trigger: `sendFile()` (L1638-1654) · API: `POST /api/upload` multipart with `file`, `options` (JSON text), `creator` · Notes: XHR so progress can be shown.
- [ ] **APP-UPL-06 Upload in pieces.** Bigger files go up in pieces, two at a time, with retries; the bar shows the whole file.
  - Trigger: `sendBig()` when size > `status.upload_part_mb` MB (L1597-1637, L1639) · API: `POST /api/upload/start {name, size, options, creator}` → `{id, part, parts}`; `PUT /api/upload/<id>/<n>` with the raw bytes of piece n (`application/octet-stream`); `POST /api/upload/<id>/finish`; on failure `DELETE /api/upload/<id>` · Notes: two senders in parallel; a failed piece is retried up to 3 more times after 1.5s, 3s, 4.5s, except for a final 4xx answer (anything but 408 and 429); progress is capped at 99% until "finish" answers. Server rules: pieces must be exactly their size; a user may have at most `max_batch` unfinished uploads ("You already have N uploads in progress. Let one finish first."); unfinished uploads expire after 6 hours; a missing piece at finish is 409 (server L881-1027).
- [ ] **APP-UPL-07 Upload progress.** The row's pill shows "N%", then "Starting" at 100%, with a thin bar along the bottom.
  - Trigger: L1531-1532.
- [ ] **APP-UPL-08 Upload errors.** A failed upload stays in the list with the reason in red under its name.
  - Trigger: L1610-1615, L1645-1651, L1682 · Notes: 401 goes to `/login`; network failure "Upload failed. Check your connection."; otherwise the server's text, for example "That file is too big. The limit is N MB.".
- [ ] **APP-UPL-09 Locked while sending.** While anything is sending, rows cannot be removed and Make clips is disabled.
  - Trigger: `A.busy` (L1511, L1544, L1590).
- [ ] **APP-UPL-10 Server checks before any bytes.** Email confirmed, a free slot and disk space are checked before an upload is accepted, so a refused upload fails fast.
  - Trigger: Gate (server L169-177) · Notes: the reasons appear on the row (APP-COMP-25).

### 8.8 All videos and jobs (APP-VID)

- [ ] **APP-VID-01 All videos view.** A compact composer and every video from every creator.
  - Trigger: `/app/videos` (L1361).
- [ ] **APP-VID-02 Empty lists.** "No videos yet" with "Paste a link above and the studio will find the best moments and turn them into clips."; on a creator page "No clips for this creator yet" with "Start recording their stream, or paste a link to one of their videos above.".
  - Trigger: `drawJobs()` (L1849-1852).
- [ ] **APP-VID-03 Stable list.** Videos keep their place and are updated in place, so the page does not flicker while polling.
  - Trigger: L1855-1862, `put()` (L943-944) · Notes: order as the server sends it.
- [ ] **APP-VID-04 Video header.** Thumbnail with length, title, and a line of details.
  - Trigger: `jobHtml()` (L1777-1784) · API: `GET /media/<job>/thumb.jpg` when `thumb` is true · State: `title` (or `source.name`), `creator`, `uploader`, `duration`, `clips.length`, `took`, `kind`, `stage` · Notes: details are joined with " · ": creator name (only on All videos), uploader, "<length> long", "N clip(s)", "made in <time>", and for recordings "recording, <stage>". Without a thumbnail: a film icon for files, a link icon for links.
- [ ] **APP-VID-05 Video actions.** Download all, Delete, and a select box, once the video is no longer being made.
  - Trigger: `[data-act=dlall]`, `[data-act=deljob]`, `input[data-sel="j:<id>"]` (L1785-1788) · API: Delete → confirm "Delete this video?" "The video and all of its clips are permanently deleted. This cannot be undone." → `DELETE /api/jobs/<id>` → toast "Deleted" (L2443-2446) · Notes: "Download all" only when at least one clip is done (APP-VID-20). The server refuses deleting something still being worked on (409).
- [ ] **APP-VID-06 Progress bar.** While queued or running, a bar with a percentage.
  - Trigger: L1789 · State: `progress` (0-1).
- [ ] **APP-VID-07 Steps with timers.** While running: four steps, each done step with how long it took, the current step with a clock that keeps counting.
  - Trigger: `stepsHtml()` (L1757-1774), the 1-second clock (L1776) · State: `step`, `step_took[]`, `step_secs`, `stage`, `fetching`, `clips[].status` · Notes: steps "Get the audio" / "Got the audio", "Get the transcript" / "Transcript ready", "Pick the best moments" / "Best moments picked" (or "Picked N moment(s)"), "Make the clips" / "Clips made". The current step shows the server's stage text; step 4 adds "Downloading the video: <x>" and "M of N clips made · K being made now · F could not be made". Before steps start: the stage, plus " · downloading the video, <x>".
- [ ] **APP-VID-08 Finished with no clips.** The stage text explains why (for example nothing clip-worthy found).
  - Trigger: L1791.
- [ ] **APP-VID-09 Failed video.** The error in red and a "Report this" link.
  - Trigger: L1792 · Notes: "Report this" runs APP-FB-02 with "Video failed: <title> | <error>".
- [ ] **APP-VID-10 AI note.** A grey line from the AI about the video, when there is one.
  - Trigger: `j.ai.note` (L1792).
- [ ] **APP-VID-11 Clip grid.** The video's clips as 9:16 cards.
  - Trigger: L1793 · Notes: columns fill at 200px minimum; two columns on phones (L524, L806).
- [ ] **APP-VID-12 Clip cover.** The cover picture with a play button; clicking opens the clip dialog.
  - Trigger: `button.shot[data-act=openclip]` (L1705, L1710) · API: `GET /media/<job>/<cover>?v=<version>` (lazy) · Notes: aria-label "Open clip: <title or hook>".
- [ ] **APP-VID-13 Clip not ready.** A shimmering placeholder: "Making this clip…", "Waiting for the video to download…" or "Waiting its turn…"; a failed clip says "Could not make this clip. Open it to try again.".
  - Trigger: L1705-1707 · State: `clips[].status` (`queued`, `rendering`, `done`, `error`), job `fetching`.
- [ ] **APP-VID-14 Badges.** The AI score at top left (green at 80+, light green at 60+), or "Hand" for clips made by hand; the length at top right.
  - Trigger: L1711, `scoreCls()` (L1695).
- [ ] **APP-VID-15 Hook and title.** The hook in bold (or "Untitled clip") and the title in two lines at most.
  - Trigger: L1713-1714.
- [ ] **APP-VID-16 Post pills.** One pill per account the clip went to or will go to.
  - Trigger: `postPills()` (L1696-1702) · State: `clips[].posts{}` (`status`, `account_name`, `due_at`, `url`, `error`) · Notes: text "<account> · <status>" or "<account> · <scheduled time>"; green posted, red failed, amber otherwise; cancelled posts hidden; a pill with a URL links to the post; a failed pill shows the error as a tooltip.
- [ ] **APP-VID-17 Clip buttons.** Select, Download, Copy post text, Send to a paid campaign, Delete, and "Post".
  - Trigger: `input[data-sel="c:<job>:<clip>"]`, `a[href=...?download=1]`, `[data-act=copy]`, `[data-act=tocampaign]`, `[data-act=delclip]`, `[data-act=openclip]` (L1716-1724) · API: Download `GET /media/<job>/<file>?download=1`; Delete → confirm "Delete this clip?" "The clip is removed for good. The video and its other clips stay." (red "Delete clip") → `DELETE /api/jobs/<job>/clips/<clip>` → removed at once, toast "Clip deleted", sync (L2406-2411) · Notes: select and delete are hidden while the clip is queued or rendering; Download and Post only when done; "Send to a paid campaign" only with Earn (APP-EARN-02). Copy puts "<title>\n\n<description>\n\n#tag1 #tag2" on the clipboard and says "Post text copied" (L2386-2389).
- [ ] **APP-VID-18 Selecting.** Videos and single clips can be ticked; ticking a video covers all its clips.
  - Trigger: `change` on `[data-sel]` (L2295-2300) · Notes: ticking a video removes its single clips from the selection; selected clips get a green border (L542); items that disappear are dropped from the selection (L1811-1814). The selection is in memory and survives moving between views.
- [ ] **APP-VID-19 Selection bar.** A dark bar at the bottom: "N selected", "Select all", "Download K clips", "Delete", "Cancel".
  - Trigger: `#selbar` (L1808-1823) · API: Delete → confirm "Delete what you selected?" "This removes <what> for good. It cannot be undone." → `POST /api/bulk/delete {videos: [ids], clips: [[job, clip]]}` → toast "Deleted N video(s) and M clip(s)" plus ". K still being made were left alone." when some were skipped (L2420-2427) · Notes: only shown while a video list is on screen. "Select all" ticks every video in the current list that is not queued, running or live (L2415-2419). Download is disabled when no selected clip is ready. "<what>" is "1 video with all its clips" / "N videos with all their clips" and/or "N clip(s)". Cancel clears.
- [ ] **APP-VID-20 Download as one zip.** Several clips download as one file.
  - Trigger: `zipDownload()` (L1824-1829), from `dlall` and `seldl` · API: `GET /api/clips.zip?ids=<job>.<clip>,...` through a temporary link · Notes: none ready → "None of those clips are ready to download yet."; more than 150 → red "That is a lot at once. Download up to 150 clips at a time."; otherwise "Preparing your clip…" or "Preparing N clips as one download…". The server allows 12 zips per 10 minutes and names the file `clipcrest-clips-N.zip` (server L1083-1094).
- [ ] **APP-VID-21 Live recordings in the list.** On All videos a recording that is still live shows as the live card (APP-LIVE-09); on a creator's Clips tab it shows above the composer instead.
  - Trigger: `jobHtml()` (L1778), `drawJobs()` (L1845-1848).

### 8.9 The clip dialog (APP-CLIP)

- [ ] **APP-CLIP-01 Open a clip.** A large dialog with the clip on the left and its settings on the right.
  - Trigger: `[data-act=openclip][data-j][data-c]` → `openClip()` (L2178, L2358) · Notes: native `<dialog>` `#clipdlg`, modal. Stacks vertically at 900px and below (L762).
- [ ] **APP-CLIP-02 The clip plays.** A finished clip plays with controls, its cover as the poster; otherwise the error or "Making this clip…" placeholder.
  - Trigger: `drawClipDlg()` (L2182-2185) · API: `GET /media/<job>/<file>?v=<version>` · Notes: `autoplay`, `playsinline`. When the clip's status or version changes (for example after a re-make), only the player is replaced; what the user typed in the form stays (L2212-2213).
- [ ] **APP-CLIP-03 Score and reason.** A badge with "Words N · Reaction M", or "Score N", or "Clipped by hand", and the AI's reason.
  - Trigger: L2189-2190 · State: `judges`, `score`, `reason`.
- [ ] **APP-CLIP-04 On the video.** "Big text", "Generate captions" (switches the caption style off and on), "Caption style", "Layout", "Start (seconds)", "End (seconds)".
  - Trigger: `[data-f=hook|captions|style|layout|start|end]` (L2191-2197) · Notes: start and end step 0.5.
- [ ] **APP-CLIP-05 Post text.** "Title" and "Description".
  - Trigger: `[data-f=title|description]` (L2198-2200).
- [ ] **APP-CLIP-06 Save and re-make.** Sends every field and re-renders the clip.
  - Trigger: `button[data-act=remake]` (L2201, L2528-2533) · API: `POST /api/jobs/<job>/clips/<clip>/render {hook, captions, style, layout, start, end, title, description}` · Notes: numbers sent as numbers, the switch as true/false. Toast "Re-making the clip…", then sync. Server: 409 "This clip is still being made. Try again when it has finished."; 20 re-makes per 10 minutes.
- [ ] **APP-CLIP-07 Post it.** Pick accounts and post now or add to the queue.
  - Trigger: `input[data-pacc]`, `[data-act=postnow]`, `[data-act=postqueue]` (L2202-2206, L2534-2540) · API: `POST /api/posts {job, clip, accounts, now}` · State: `accounts[]` (`id`, `label`, `name`) · Notes: account boxes read "<label> · <name>". None ticked → "Tick at least one account first.". "Post now" asks "Post now?" "This clip goes to N account(s) straight away." Results: "Posting now" or "Added to the queue". With no accounts: "No accounts connected yet. Connect one in Settings.". The current post pills (APP-VID-16) show above and refresh while open. Server: "Nothing was queued. Pick at least one account this clip has not already gone to." (400), "That clip is not ready" (404).
- [ ] **APP-CLIP-08 Dialog footer.** "Download" (when done), "Copy post text", "Send to a campaign" (with Earn).
  - Trigger: L2207-2210.
- [ ] **APP-CLIP-09 Closing.** ✕, Esc, or a click on the dark backdrop closes it.
  - Trigger: `[data-act=closedlg]`, native Esc, backdrop click (L2216-2217, L2357) · Notes: the dialog is emptied on close (the video stops). It closes by itself if the clip disappears (deleted elsewhere, L2181).

### 8.10 Creators (APP-CRE)

- [ ] **APP-CRE-01 New creator dialog.** Paste a channel link, see who it is, name the workspace, create it.
  - Trigger: `[data-act=newcreator]` from the sidebar, the creator picker, or Next steps (L2359-2385) · API: `GET /api/channel-preview?url=` 400ms after typing stops; "Create workspace" → `POST /api/creators {name, channel}`, then sync · Notes: title "New creator", text "Each creator gets their own workspace, folder, settings and accounts."; channel field placeholder "https://www.youtube.com/@name, twitch.tv/name or kick.com/name" (focused). The preview shows a loading skeleton, then the picture, name and "<platform> · <followers>", or the error in red; older answers are ignored. "Name" fills itself from the channel unless the user typed a different name; it is required. Success goes to the creator's Clips tab (or Setup when no channel was given) with "Workspace created". Errors (for example "This server allows N creators per account.", "Channel links must be from YouTube, Twitch or Kick.") become red toasts. Cancel skips validation. Pressing Enter in a field cancels instead of creating (Q-10).
- [ ] **APP-CRE-02 Creator page.** A live player area on top (when live) and the tab's content below; the player keeps playing when switching tabs.
  - Trigger: L1364, L1376-1377 · Notes: on Setup and Activity the player is hidden, not removed.
- [ ] **APP-CRE-03 Clips tab.** The live card (when recording), a compact composer for this creator, and this creator's videos.
  - Trigger: `setTab("clips")` (L1376, L1378) · Notes: the composer has no creator picker; its option defaults come from the creator.
- [ ] **APP-CRE-04 Connect a channel.** In Setup, "Their stream" lists YouTube, Twitch and Kick; an empty platform has a field and "Connect".
  - Trigger: `#chan_<platform>`, `[data-act=chadd][data-p]` (L1874-1875, L2447-2452) · API: `PUT /api/creators/<id> {channels}`, then sync and redraw (L1884-1888) · Notes: placeholders `https://www.youtube.com/@name`, `https://www.twitch.tv/name`, `https://kick.com/name`. Empty → focus and "Paste their <Platform> channel link."; `https://` is added when missing. Server: "That link isn't a <Platform> channel." (400).
- [ ] **APP-CRE-05 A connected channel.** Picture, name, platform and followers, Live or Offline, "Record from" when there are several, and ✕ to remove.
  - Trigger: L1876-1881 · API: avatar `GET /api/creators/<id>/avatar?p=<platform>&v=<time>`; "Record from" → `PUT /api/creators/<id> {channels, channel}` (L2455); ✕ → `PUT` without that platform (L2453) · State: `channels{}`, `channel`, `profiles{k}` (`name`, `followers`, `pic`, `live`, `live_at`, `viewers`) · Notes: "Looking it up…" until the profile arrives; Live/Offline only once checked; the radio's tooltip is "Start recording uses this channel unless another one is live".
- [ ] **APP-CRE-06 Record automatically.** A switch: "Record automatically when they go live", "Checks straight away, then every two minutes.".
  - Trigger: `[data-k=auto_watch]` (L1894) · API: saved at once, `PUT /api/creators/<id>` with the whole form (L2310-2312) · Notes: the server checks straight away when turned on (server L1298-1299).
- [ ] **APP-CRE-07 How the AI decides.** Settings for live judging.
  - Trigger: card at L1895-1905 · Notes: "Check the live stream every" (1, 2, 3, 5, 10 minutes) with the hint "About N AI calls per live hour at most. Each check covers everything since the last one, so slower checks don't miss moments; they find them later." which updates as the choice changes (L1866-1869, L2307); "Most live clips per hour" (1-60); "Make a clip when" ("Both judges say yes" / "Both say yes, or the words judge is very sure (90+)"); "Words judge must score at least" (0-100); "Make sure there's a live clip at least every" (Off, 15, 30 minutes, 1, 2 hours); "Minimum gap between live clips (minutes)" (0-60); "Always clip the last 30 seconds when someone says" (comma-separated phrases, placeholder "clip that, clip it").
- [ ] **APP-CRE-08 Clips settings.** How this creator's clips look.
  - Trigger: card at L1906-1914 · Notes: "Generate captions" switch (saved at once; disables the style), "Caption style", "Layout", "Game" (placeholder "Read from the title", with help text), "Shortest clip (seconds)", "Longest clip (seconds)", "Clips per video", "Minutes of live stream to keep".
- [ ] **APP-CRE-09 Posting settings.** Which accounts get this creator's clips, and the auto-post rules.
  - Trigger: card at L1915-1923 · State: `accounts[]`, `creator.accounts[]` · Notes: account boxes "<label> · <name>" (saved at once); with no accounts: "No accounts are connected yet. Connect one in Settings, then come back." and "Open Settings". "Post new clips automatically" asks "Turn on auto-posting?" "Clips that score high enough will be posted to the ticked accounts without you seeing them first." ("Turn on"); Cancel unticks it (L2311). Then "Only auto-post clips scoring at least", "Minutes between posts on one account", "Most posts per account per day", "Who can see posts (YouTube, TikTok)" (Public, Unlisted, Private), "Campaign pay per 1,000 views ($)" (step 0.1), "Line added to every post (credit, campaign tag)".
- [ ] **APP-CRE-10 Save bar.** Changing a text, number or select field shows "You have unsaved changes" with "Discard" and "Save changes".
  - Trigger: `input` inside `#cform` (L1586-1587); `[data-act=cdiscard]`, `[data-act=csave]` (L1926, L2514-2515) · API: `PUT /api/creators/<id>` with every `data-k` field and the ticked accounts (L1928-1933) · Notes: Save → "Saved" and sync; Discard redraws from saved data and says "Changes discarded". Switches and account boxes save at once, quietly, and that save includes any unsaved typing (Q-19).
- [ ] **APP-CRE-11 Delete a creator.** A red card at the bottom of Setup; the creator's name must be typed.
  - Trigger: `[data-act=delcreator]` (L1924-1925, L2428-2435) · API: `DELETE /api/creators/<id>` · Notes: title "Delete <name>?", text mentions "their N video(s) with all the clips" when there are any; button "Delete creator". Then Home and "Creator deleted". Server: 409 while something is still being made or recorded.
- [ ] **APP-CRE-12 Activity tab.** What happened for this creator, newest first.
  - Trigger: `drawLog()` (L1934-1938) · State: `creators[].log[]` (`t`, `msg`; the server sends the last 30, server L747) · Notes: time in the browser's locale, for example "Nov 24, 02:05 PM" in en-US (L927). Empty: "Nothing has happened yet" and "Recordings, clips and posts for this creator will be listed here.".
- [ ] **APP-CRE-13 Setup is not redrawn by polling.** What the user is typing survives the background refresh.
  - Trigger: the form is drawn on entering Setup (L1379) and after channel changes or Discard (L1886, L2515) only.
- [ ] **APP-CRE-14 Older creators.** A creator from before several channels were supported shows its one channel under the right platform.
  - Trigger: L2236-2237.

### 8.11 Live recording and players (APP-LIVE)

- [ ] **APP-LIVE-01 Live player.** When a creator is live on a connected channel, their stream plays muted on the creator page, with details beside it.
  - Trigger: `drawStream()` (L1112-1138) · State: `profiles{k}` with `live` and a `channel` equal to `channels[k]`; `embed`, `title`, `name`, `viewers`, `started`, `followers` · Notes: platform logo, "Live on <Platform>", the title (or "Live now"), the streamer's name, stats "N watching" (1.2K style), "live for" ("2h 5m"), followers. Embeds: section 7.
- [ ] **APP-LIVE-02 Several platforms live.** Small buttons switch which platform's stream plays.
  - Trigger: `[data-act=spick][data-p]` (L1132, L2454) · Notes: the choice is per creator and in memory only. The main channel is listed first (L1139, see Q-09).
- [ ] **APP-LIVE-03 Twitch on an address without a name.** Opened at an IP address (for example 127.0.0.1), Twitch cannot play; a card explains it and links to Twitch.
  - Trigger: L1123-1125 · Notes: "Twitch only plays inside sites with a web address", "It will play here once ClipCrest is on its domain, or open ClipCrest at localhost instead of <host>.", button "Watch on Twitch" (new tab).
- [ ] **APP-LIVE-04 The player does not restart on refresh.** The iframe is only replaced when the stream itself changes.
  - Trigger: `data-src` check (L1121).
- [ ] **APP-LIVE-05 Back to the live moment.** After the tab was hidden for over a minute, the player reloads to catch up with the live edge.
  - Trigger: `visibilitychange` (L2248-2257).
- [ ] **APP-LIVE-06 Record from the player.** "Record this stream" with "ClipCrest watches it and clips the best moments as they happen."; while recording, "Stop recording" with "Recording now. Clips appear below as they're made.".
  - Trigger: `[data-act=golive][data-url=<channel>]` / `[data-act=stoplive]` (L1135-1137) · Notes: recording from here records the platform that is playing (`{channel}` in the request).
- [ ] **APP-LIVE-07 Start recording.** Starts recording the creator.
  - Trigger: `[data-act=golive]` (L2456-2470) · API: `POST /api/creators/<id>/live` with `{channel}` from the player or `{}` · Notes: no channel yet → switches to Setup and says "Connect one of their channels first, then press Start recording.". The button shows "Starting…" and is disabled; the new recording is added to the page at once. Toast "Recording started. Clips appear below as they're made.", or, if the user moved to another creator meanwhile, "Recording started for <name>."; the Clips tab opens when still on that creator. On failure the button comes back. The server records the asked channel, else a live one, else the main one (server L1312-1315).
- [ ] **APP-LIVE-08 Stop recording.** Stops a recording after a confirmation.
  - Trigger: `[data-act=stoplive][data-j]` (L2471-2477) · API: `POST /api/live/<job>/stop` (in the background) · Notes: asks "Stop recording?" "Clips already made are kept. The rest of the buffer is cleared." (red "Stop recording"). The page shows it stopped at once ("Stopped by you") and says "Recording stopped. Clips already made are kept."; a server error comes back as a red toast.
- [ ] **APP-LIVE-09 Live card.** A card for a recording in progress: "Live", the title, uploader and stage, and the buttons "Clip last 30s", "Last 60s", "Stop".
  - Trigger: `liveHtml()` (L1735-1742).
- [ ] **APP-LIVE-10 Clip the last seconds.** Makes a clip of the last 30 or 60 seconds by hand.
  - Trigger: `[data-act=clipnow][data-s=30|60]` (L2478) · API: `POST /api/live/<job>/clip {seconds}` · Notes: "Clipping the last N seconds…". Server: 6 a minute and 3 waiting at most, else "Give it a moment: your last clips are still being made." (429).
- [ ] **APP-LIVE-11 Live numbers.** Recorded time, minutes kept in the buffer, how often the AI checks, AI calls, clips so far, hand clips being prepared.
  - Trigger: L1743-1746 · State: `live.elapsed`, `buffer_sec`, `every_min`, `auto` (`warming`, `waiting`, `spikes`), `checks`, `skipped`, `rejected`, `pending_clips`, `clips.length` · Notes: "AI calls · N skipped · N turned down". The texts for `every_min` 0 ("AI checks: learning the stream", "AI checks: jump spotted, checking soon", "AI checks on jumps · N so far") can no longer appear: the server stopped allowing 0 (Q-07).
- [ ] **APP-LIVE-12 Change how often the AI checks, live.** A drop-down in the live card (1, 2, 3, 5, 10 min).
  - Trigger: `.evpick` with `input[data-every=<creator>]` (L1729-1734, L2301-2306) · API: `PUT /api/creators/<creator> {ai_every_min}` · Notes: "AI checks every N min"; a recording not filed under a creator: "This recording isn't filed under a creator.". The card is not redrawn while the drop-down is open (L1847).
- [ ] **APP-LIVE-13 Meters.** "Loudness, last minute", "Chat messages per second" (when there is chat), "Latest AI decisions", "What was just said".
  - Trigger: L1747-1751, `spark()` (L1727) · State: `live.level[]` (dB, drawn from -55 to -8), `chat[]`, `verdicts[]` (`t`, `transcript`, `reaction`, `result`), `lines[]` · Notes: up to 4 decisions as "<time> · words N · reaction M · <result>"; "First check soon…" and "Listening…" before there is data.
- [ ] **APP-LIVE-14 Clips made while live.** The recording's error (if any) and its clips, newest first, under the card.
  - Trigger: L1752-1753.

### 8.12 Settings (APP-SET)

- [ ] **APP-SET-01 Settings layout.** Section links on the left with a title and a line each; the section on the right.
  - Trigger: `drawSettings()` (L2064-2069) · Notes: links are real addresses (`/app/settings/<tab>`) handled in the page (L2487). At 860px and below the links become a sideways-scrolling row without the lines (L489).
- [ ] **APP-SET-02 Which sections show.** AI (admins), Profile and Security (sign-in on), Connected apps (everyone), Storage (admins).
  - Trigger: `setTabs()` (L2049-2054) · Notes: section lines: "Your AI service, model and key", "Your name, email and how you sign in", "Password and signing out", "Where your clips get posted", "Where videos and clips are kept".
- [ ] **APP-SET-03 Loading and errors.** "Loading…" while a section loads; a failed load shows the error in its place.
  - Trigger: L2069, L2173.
- [ ] **APP-SET-04 AI status.** A "Ready" pill with the service and first model, or "Not set up" and "Choose a service, paste your key and pick a model.".
  - Trigger: AI section (L2072-2075) · API: `GET /api/ai` when the section opens · State: `ready`, `label`, `models[]`, `providers[]`, `provider`, `has_key`, `key_hint`, `base_url`.
- [ ] **APP-SET-05 Choose the AI service.** A list of services.
  - Trigger: `#ai_provider` (L2077, L2294) · Notes: changing to another service than the saved one clears the model and address fields and the found models.
- [ ] **APP-SET-06 The key.** A password field whose hint depends on the service and what is saved.
  - Trigger: `#ai_key`, `aiHints()` (L2055-2062, L2078) · State: provider `needs_key`, `key_url` · Notes: placeholder "Saved, ends in XXXX. Paste a new key to replace it" / "Paste your key" / "Not needed"; hint "Get a key at <site>." or "Set it up at <site>." (link, new tab) and "The key stays on this server and is never shown again.". An empty key keeps the saved one (server L1367-1370).
- [ ] **APP-SET-07 The address.** "Address" with "Where the service answers. Only needed for a custom service.", shown for the custom service, or when an address is saved for the current one.
  - Trigger: `#ai_base`, `#ai_basewrap` (L2079, L2061-2062) · Notes: placeholder is the service's own address or `http://127.0.0.1:1234/v1`.
- [ ] **APP-SET-08 The model and "Find models".** A model field with suggestions; "Find models" asks the service for its list.
  - Trigger: `#ai_model` + `datalist#ai_models`, `[data-act=aimodels]` (L2080-2081, L2321-2330) · API: `POST /api/ai/models {provider, base_url, key}` · Notes: hint "A fast, inexpensive model is the right choice. Add a second one after a comma to fall back on."; result toasts "N models found. Click the model box to pick one." or "The service listed no models. Type the model yourself."; the button is disabled while asking. Server errors (502) explain what went wrong.
- [ ] **APP-SET-09 Save and test.** Saves the AI settings and checks the AI answers; "Test again" only checks.
  - Trigger: `[data-act=aisave]`, `[data-act=aitest]` (L2083, L2331-2342) · API: `PUT /api/ai {provider, models, base_url, key}` then `POST /api/ai/test`, then `GET /api/status` and the section reloads · Notes: "Saved. <model> answered, so the AI is ready." or red "Saved, but the test failed. <reason>". "Test again" shows only when ready.
- [ ] **APP-SET-10 Profile.** Picture, name, email, whether the email is confirmed, sign-in method, account type, member since.
  - Trigger: Profile section (L2086-2095) · State: `user.name`, `email`, `verified`, `google`, `has_password`, `is_admin`, `created_at`, `photo` · Notes: "Confirmed" / "Not confirmed" pill; "Google and password", "Google" or "Email and password"; "Admin" / "Standard"; date in the browser's locale, for example "November 24, 2026" in en-US; with Google: "Your name and picture come from your Google account.". Nothing here can be edited.
- [ ] **APP-SET-11 Password.** Change the password, or set one for a Google-only account.
  - Trigger: Security section (L2097-2101), `[data-act=pwsave]` (L2402-2405) · API: `POST /api/auth/password {current, new}` · Notes: with a password: "Current password" and "New password", button "Change password", link "Forgot it?" to `/reset`; Google-only: "You sign in with Google. You can also set a password, to sign in with your email." with "Password" and "Set password". Placeholder "At least 8 characters". Success: "Password changed. Other devices were signed out.". Server: 6 tries per 10 minutes.
- [ ] **APP-SET-12 Sign out here.** "Sessions" with a "Sign out" button.
  - Trigger: `[data-act=logout]` (L2102-2103) · See APP-ACCT-04.
- [ ] **APP-SET-13 Delete my account.** The email must be typed; then the account and everything in it are deleted.
  - Trigger: `[data-act=delaccount]` (L2104-2105, L2436-2442) · API: `POST /api/account/delete {confirm: <typed email>}`, then the browser goes to `/` · Notes: "Delete your account?" "This removes your account and everything in it for good: creators, recordings, videos, clips, connected accounts and history.", button "Delete my account". Server: 400 "Type your email address exactly to confirm.", 409 while busy.
- [ ] **APP-SET-14 Connected apps.** Cards for YouTube ("Post clips to your channel as Shorts."), Instagram ("Post clips as Reels. Needs a Creator or Business account.") and TikTok ("Post clips straight to your TikTok.").
  - Trigger: Apps section (L2124-2172) · State: `accounts[]`, `status.connect{youtube, instagram, tiktok}`, `user.is_admin` · Notes: intro "Connect the accounts ClipCrest posts clips to: ...".
- [ ] **APP-SET-15 Connected accounts and Disconnect.** Each connected account under its card, with "Disconnect".
  - Trigger: `[data-act=accremove][data-id]` (L2128-2130, L2524-2527) · API: `DELETE /api/accounts/<id>`, then sync and redraw · Notes: "Connected" pill, name, detail; asks "Disconnect this account?" "Posts still waiting for it will fail." (red "Disconnect"). Accounts are matched to a card by platform (or label) containing the platform name.
- [ ] **APP-SET-16 Connect an account.** "Connect" (or "Add another") takes the user to the platform's sign-in and back.
  - Trigger: `a[href=/oauth/<platform>/start]` (L2151) · Notes: a full page navigation; the return lands on `/app/settings/apps` with APP-ROUTE-10. When the server has no app keys for the platform: admins see "Set up"; others see "Not set up on this server".
- [ ] **APP-SET-17 Set up a platform (admins).** A panel with steps to register the server with the platform, the redirect address to copy, and fields for the app keys.
  - Trigger: `[data-act=appsetup][data-p]` (L2134-2165, L2502) and the ⚙ button next to Connect when already set up · API: `GET /api/apps` when the section draws (admins); Save → `PUT /api/apps {platform, client_id, client_secret}` → toast "Saved. People can connect now." and `GET /api/status` (L2504-2507) · State: `apps[p]` (`redirect`, `https`, `id_label`, `secret_label`, `ready`, `id_hint`) · Notes: one panel open at a time; "Close" closes it. Steps and links per platform (Google Cloud, Meta for Developers, TikTok for Developers) at L2136-2148. "Copy" copies the redirect address ("Copied"). Instagram and TikTok without https: "<Name> only accepts https addresses. Put ClipCrest on a domain with https (or a tunnel) and set CLIPCREST_PUBLIC_URL to it first.". Saved fields show "Saved: <hint>. Paste a new one to replace it".
- [ ] **APP-SET-18 Storage folder.** The folder ClipCrest keeps everything in, with "Open folder".
  - Trigger: Storage section (L2107-2114) · API: `GET /api/storage`; "Open folder" → `POST /api/storage/open` (L2490) · State: `path`, `local`, `used_gb`, `free_gb`, `total_gb`, `drive`, `full`, `min_free_gb`, `pending`, `fixed` · Notes: "Open folder" only shows when the browser is on the same computer as the server (`local`).
- [ ] **APP-SET-19 Drive space.** A bar of how full the drive is, "ClipCrest uses X GB" and "Y GB free of Z GB on <drive>".
  - Trigger: L2109-2116 · Notes: the bar turns red when the drive is nearly full; it has an aria-label "N% of the drive is used".
- [ ] **APP-SET-20 Drive full warning.** "This drive is almost full, so ClipCrest can't take new videos. X GB free on <drive>; it needs at least Y GB. ..."
  - Trigger: L2112.
- [ ] **APP-SET-21 Folder change waiting for a restart.** "The folder changes to <path> the next time ClipCrest starts. Close ClipCrest and start it again." with "Undo".
  - Trigger: L2113, `[data-act=storcancel]` (L2501) · API: `PUT /api/storage {cancel: true}` · Notes: "Kept the current folder".
- [ ] **APP-SET-22 Folder fixed in `.env`.** "This folder is set with CLIPCREST_DATA in the .env file. Change it there, or remove that line to choose it here." and no change button.
  - Trigger: L2117 · State: `fixed`.
- [ ] **APP-SET-23 Change the folder.** "Change folder" opens a small form: "New folder", "Browse", "Move everything that is in the current folder there too", "Use this folder", "Cancel".
  - Trigger: `[data-act=storchange]`, `[data-act=storpick]`, `[data-act=storsave]` (L2118-2122, L2491-2500) · API: Browse → `POST /api/storage/pick` (fills the field; local only); Use this folder → `PUT /api/storage {path, move}` → "Saved. Close ClipCrest and start it again to switch to the new folder." · Notes: placeholder "For example D:\ClipCrest"; the move box starts ticked; "The change happens the next time ClipCrest starts, so nothing is moved while a video is being made.".

### 8.13 AI usage page (APP-USE)

- [ ] **APP-USE-01 Open AI usage.** `/app/usage`, from the AI card, the account menu, or "View usage".
  - Trigger: L1363 · API: `GET /api/usage` each time the view opens (L2003-2007) · Notes: the answer also refreshes the sidebar AI card. The page does not refresh itself while open.
- [ ] **APP-USE-02 Not set up note.** For admins: "No AI key is set, so clips are picked by loudness only. Add your key under Settings, AI."; for others: "The AI isn't set up on this server yet, so clips are picked by loudness.".
  - Trigger: L2029 · State: `usage.ready`.
- [ ] **APP-USE-03 Five tiles.** The service (and model), AI calls today, tokens today, AI calls in total, tokens in total.
  - Trigger: L2030-2035 · State: `provider`, `model`, `today_calls`, `today_tokens`, `calls_total`, `tokens_total`.
- [ ] **APP-USE-04 Tokens per day.** A 30-day bar chart: "Last 30 days. Your AI provider bills you for these directly.".
  - Trigger: `tokenChart()` (L2008-2021, L2036) · State: `daily[]` (`day`, `tokens`, `calls`) · Notes: labels every fifth day ending with "Today"; hover "<date>: N tokens in M call(s)"; empty "No AI used in the last 30 days".
- [ ] **APP-USE-05 What it was used for, and by creator.** Two lists of bars with "N tokens · M calls".
  - Trigger: `hbars()` (L2022-2026, L2037-2040) · State: `by_purpose[[label, tokens, calls]]`, `by_creator[[name, tokens, calls]]` · Notes: "Nothing yet." when empty.
- [ ] **APP-USE-06 Recent AI activity.** A table: When, What, Creator, Video, Tokens.
  - Trigger: L2041-2044 · State: `recent[]` (`t`, `purpose`, `creator_name`, `where`, `tokens`) · Notes: creator "None" when unfiled; empty "No AI calls yet.".

### 8.14 Notifications bell (APP-BELL)

- [ ] **APP-BELL-01 Open the bell.** A panel beside the sidebar, lined up with the bell, first "Loading…", then the list.
  - Trigger: `[data-act=bell]` → `openBell()` (L1169-1182), placement `openPop()` (L1161-1168) · API: `GET /api/notifications` · Notes: at 900px and below the panel sits at the bottom left above the sidebar foot (L650).
- [ ] **APP-BELL-02 The list.** Newest first (40 at most): an icon for the kind, the title, the text, how long ago, and a dot for unread.
  - Trigger: L1176-1179 · State: `items[]` (`id`, `t`, `kind`, `title`, `body`, `link`, `read`), `unread` · Notes: icons by kind (L1157): live → radio, clips → scissors, post and fail → warning, account → person, feedback → speech bubble, anything else (for example `earn`) → bell. Times: "just now", "N min ago", "N h ago", then a date (L1158). Empty: "Nothing yet. Recordings, finished clips and posts that need a look show up here."; a failed load shows the error.
- [ ] **APP-BELL-03 Read when seen.** 1.5 seconds after the panel opens with unread items, they are marked read and the badge clears.
  - Trigger: L1180, `markRead()` (L1183) · API: `POST /api/notifications/read`.
- [ ] **APP-BELL-04 Mark all as read.** A button in the panel header when there are unread items.
  - Trigger: `[data-act=bellread]` (L1176, L2512) · API: `POST /api/notifications/read` · Notes: the panel closes afterwards (Q-06).
- [ ] **APP-BELL-05 Open what a notification is about.** Clicking one closes the panel and follows its link (APP-ROUTE-13).
  - Trigger: `[data-act=ntgo][data-link]` (L2513).
- [ ] **APP-BELL-06 Close the panel.** The bell again, a click elsewhere, or Esc.
  - Trigger: L1171, L1194-1195 · Notes: it fades out over 180ms before hiding (L1159).
- [ ] **APP-BELL-07 Pop-up for new notifications.** New ones appear as cards at the bottom right with a soft two-note chime.
  - Trigger: `checkNew()` (L1224-1234), `noticeToast()` (L1211-1223), `chime()` (L1198-1210) · API: `GET /api/notifications` on start, then on each 15-second status check when `unread` > 0 · State: localStorage `lastNotice` (highest id already shown) · Notes: the first time ever, the newest id is stored and nothing is shown, so old notices are not replayed. At most the 3 newest unseen unread ones pop up; each closes after 7 seconds or with ✕; clicking one opens its link. The chime is A5 then E6, quiet, through Web Audio (it may stay silent until the user has clicked the page, a browser rule).
- [ ] **APP-BELL-08 Unread count stays current.** The badge follows `unread` from `/api/status` (every 15s) and `/api/sync` (when anything changed).
  - Trigger: L2240, L2567.

### 8.15 Update banner and dialog (APP-UPD)

- [ ] **APP-UPD-01 New version banner.** Admins see "A new version of ClipCrest is out: N update(s) since yours." with "How to update" and "Later"; when the new files are already in place: "The new version is downloaded. Close ClipCrest and start it again to use it." with "What's new".
  - Trigger: `#vbanner` (L1315-1319) · State: `status.update` (`latest`, `current`, `behind`, `notes[]`, `url`, `restart`), localStorage `clipcrest_update_seen` · Notes: hidden when `latest` equals the stored value. Lower priority than the ffmpeg, disk and AI-problem banners (APP-ERR-01..03).
- [ ] **APP-UPD-02 Later.** Hides the banner until a newer version comes out.
  - Trigger: `[data-act=updlater]` (L2489) · Notes: stores `latest` in `clipcrest_update_seen`.
- [ ] **APP-UPD-03 How to update.** A dialog with what changed and how to update.
  - Trigger: `[data-act=updhow]` → `updateHow()` (L1243-1255) · Notes: heading "A new version of ClipCrest is out" or "The new version is ready"; "You're on <version>. N updates have been added since." and "Your settings, keys and clips stay as they are."; a list of changes with dates; two copy boxes: a prompt for an AI coding assistant and `git pull && pip install -r requirements.txt`, each with "Copy" ("Copied"); the Docker command; "See every change on GitHub" (new tab). Buttons "Remind me next version" (same as Later) and "Got it". Not opened while another dialog is open.

### 8.16 Feedback (APP-FB)

- [ ] **APP-FB-01 Send feedback.** In the account menu; opens the project's "new issue" page (or the maker's profile) in a new tab.
  - Trigger: `[data-act=feedback]` (L1190, L2509), `openFeedback()` (L1237-1242) · State: `status.links.repo`, `.follow` · Notes: the menu item only shows when one of the two links exists. The target is `<repo>/issues/new`.
- [ ] **APP-FB-02 Report a problem.** Red toasts have "Report", failed videos have "Report this": the message is copied, then the feedback page opens.
  - Trigger: toast "Report" (L940), `[data-act=report][data-ctx]` (L1792, L2510) · Notes: "The problem is copied. Paste it in your message." With no feedback link: "Copy this message and send it to the person who runs this ClipCrest." (nothing opens). With no link and no message: "There's no feedback link on this server.".

### 8.17 Guided tour (APP-TOUR)

- [ ] **APP-TOUR-01 Starts once by itself.** The first time someone opens the app, the tour starts half a second after load.
  - Trigger: L2565 · State: `status.tour` (true until the tour has been closed once, saved per user) · Notes: not started if a dialog is already open.
- [ ] **APP-TOUR-02 Take the tour again.** From the account menu.
  - Trigger: `[data-act=tour]` (L1190, L2486).
- [ ] **APP-TOUR-03 It starts on Home.** The tour goes to Home and closes open panels first.
  - Trigger: L956-958 · Notes: only one tour at a time.
- [ ] **APP-TOUR-04 Eight steps.** Each with a title, a sentence and a row of chips.
  - Trigger: `steps` (L960-976) · Notes: 1 "Welcome to ClipCrest" (no target); 2 "Start with any video" (the composer, `#addform`); 3 "Your day at a glance" (the Home tiles); 4 "Every video in one place" (All videos in the sidebar); 5 "Add the creators you clip" (New creator); 6 "The AI picks the moments" (the AI card); 7 "Your account and alerts" (the me button and bell); 8 "You're ready to clip" (no target).
- [ ] **APP-TOUR-05 Spotlight.** The page dims with a rounded hole and a green ring around what the step is about; the card sits beside it.
  - Trigger: `tick()`, `placeCard()` (L994-1024) · Notes: the hole eases to its target every frame and follows resizing; the card goes beside, under or over the target, or in the middle when there is none; on screens under 700px wide the card docks to the top or bottom; on phones the sidebar slides in for sidebar steps (L1029). The page scrolls only as far as needed to show the target (L1039-1045).
- [ ] **APP-TOUR-06 Controls.** A progress bar, "N of 8", Back (hidden on step 1), "Next" ("Start clipping" on the last), and ✕.
  - Trigger: `[data-tour=back|next|close]` (L1034-1037, L1065-1066) · Notes: keys: Esc closes, ArrowRight next, ArrowLeft back, Tab and Shift+Tab stay inside the card, Enter and Space press the focused button (L1057-1064). Clicks outside the card do nothing (L1065, the page behind is blocked).
- [ ] **APP-TOUR-07 Done for good.** Closing the tour in any way saves that it was seen and puts the cursor in the link box.
  - Trigger: `close()` (L1048-1055) · API: `PUT /api/settings {tour_done: true}`, once · Notes: errors ignored.

### 8.18 Account menu and sign out (APP-ACCT)

- [ ] **APP-ACCT-01 Open the account menu.** The me button opens a small menu beside the sidebar.
  - Trigger: `[data-act=acctmenu]` → `openAcct()` (L1184-1193) · Notes: `aria-expanded` on the button; closes like the bell (click elsewhere, Esc, button again).
- [ ] **APP-ACCT-02 Who is signed in.** The menu starts with the name and email (sign-in on only).
  - Trigger: L1189.
- [ ] **APP-ACCT-03 Menu items.** "Settings", "AI usage", "Take the tour", "Send feedback" (when there is a feedback link), "Sign out" (sign-in on only, red).
  - Trigger: L1190-1191.
- [ ] **APP-ACCT-04 Sign out.** Ends the session and goes to the landing page.
  - Trigger: `[data-act=logout]` (L2401) · API: `POST /api/auth/logout`, then `location = "/"`.

### 8.19 Admin links (APP-ADML)

- [ ] **APP-ADML-01 Admin dashboard link.** An "Owner" heading and "Admin dashboard" (shield icon) to `/admin`.
  - Trigger: L1281 · State: `user.role === "admin"` and sign-in on (Q-16) · Notes: a normal link (full page load).
- [ ] **APP-ADML-02 Earn campaigns link.** "Earn campaigns" to `/admin/earn`, under the same heading, when Earn exists.
  - Trigger: L1281 · State: also `status.earn_url`.
- [ ] **APP-ADML-03 Admin-only parts of the app.** Listed here so a non-admin test can check they are all absent.
  - Notes: AI and Storage settings (APP-SET-02); app set-up panels (APP-SET-17); "Add AI key" on Home (APP-HOME-05) and in the AI banner (APP-ERR-06); "Open AI settings" (APP-ERR-03); "Open Storage" (APP-ERR-02); the update banner (APP-UPD-01).

### 8.20 Earn links (APP-EARN)

All of these show only when `status.earn_url` is set (section 4.5).

- [ ] **APP-EARN-01 Earn in the sidebar.** See APP-NAV-05.
- [ ] **APP-EARN-02 Send a clip to a paid campaign.** The money icon on a clip card and "Send to a campaign" in the clip dialog open Earn's submit form with the clip's posted link.
  - Trigger: `[data-act=tocampaign]` (L1720, L2210, L2390-2400) · Notes: uses the clip's first post URL; without one, a native browser prompt (Q-13) asks "Paste the link to this clip after you posted it (YouTube Short, Instagram reel, X or TikTok post):". Opens `<earn_url>#submit=<link>` in a new tab and says "Opening Earn to send this clip". Cancel or an empty answer does nothing. Earn reads the hash (see section 13).
- [ ] **APP-EARN-03 "Earn money" button.** On Home and All videos, when there is no repo link (APP-TOP-06).
- [ ] **APP-EARN-04 Earn campaigns admin link.** See APP-ADML-02.

### 8.21 Toasts (APP-TOAST)

- [ ] **APP-TOAST-01 Toasts.** Short messages in the bottom right, newest at the bottom.
  - Trigger: `toast(msg, kind)` (L937-942) · Notes: `#toasts` is a polite live region (L846). Kinds: plain (green dot), `ok` (mint dot), `bad` (red dot). An empty message shows nothing.
- [ ] **APP-TOAST-02 How long they stay.** 3.2 seconds; red ones 7 seconds and with a "Report" button (APP-FB-02).
  - Trigger: L940-941.
- [ ] **APP-TOAST-03 Notification cards share the corner.** See APP-BELL-07.

### 8.22 Keyboard (APP-KEY)

There are no global keyboard shortcuts. These are all the keys the page handles itself:

- [ ] **APP-KEY-01 Esc closes the bell and account panels.** (L1195)
- [ ] **APP-KEY-02 Pickers.** ArrowDown/ArrowUp open and move, Esc closes and returns focus (L1459-1467).
- [ ] **APP-KEY-03 Enter in the link box takes the link; Enter in the composer starts.** (L1588, L2267)
- [ ] **APP-KEY-04 Tour keys.** Esc, ArrowLeft, ArrowRight, Tab trapping, Enter and Space (L1057-1064).
- [ ] **APP-KEY-05 Dialogs.** Esc closes every dialog (native `<dialog>`); in a confirm dialog that means "no"; the action button has focus when it opens (L949).
- [ ] **APP-KEY-06 Email code.** Enter in the code field submits it (APP-ERR-05).

### 8.23 Polling and sync (APP-SYNC)

- [ ] **APP-SYNC-01 The sync call.** The page asks "has anything of mine changed?" with the token it got last time.
  - Trigger: `tick()` (L2226-2245) · API: `GET /api/sync?v=<token>` · State: answer `{v}` when nothing changed, or `{v, jobs, creators, accounts, ai, unread}` · Notes: the token is "<server start id>.<user's change counter>.<queue epoch while busy>" (server L751-752). An unchanged answer is made in the gate from memory (server L215-220, L755-763). Anything that changes what a user sees calls `ctx.bump()` on the server (AGENTS.md).
- [ ] **APP-SYNC-02 How often.** Every 1s while a channel is being looked up or a recording just started; every 2s while anything is queued, running, live or rendering; every 4s otherwise; every 20s while the tab is hidden.
  - Trigger: `loop()` (L2259-2264) · Notes: each wait starts after the previous answer.
- [ ] **APP-SYNC-03 Straight away on return.** Showing the tab again, or focusing the window, syncs at once.
  - Trigger: `visibilitychange` (L2249-2251), `focus` (L2258).
- [ ] **APP-SYNC-04 What a change does.** Replaces videos, creators and accounts; updates the AI card and bell count; reloads Home data on Home; leaves a deleted creator's page; redraws.
  - Trigger: L2235-2243.
- [ ] **APP-SYNC-05 Home stays fresh.** On an unchanged answer, Home data older than 20 seconds is reloaded anyway (posting times, views).
  - Trigger: L2231-2233.
- [ ] **APP-SYNC-06 After a server restart.** The token contains the server's start id, so the first sync after a restart brings everything again; the page recovers without a reload.
  - Trigger: server L55, L751-752.
- [ ] **APP-SYNC-07 Status every 15 seconds.** Banners, AI card, bell badge and update state refresh; Home redraws; new notifications are checked.
  - Trigger: L2567 · API: `GET /api/status`.
- [ ] **APP-SYNC-08 Sync after actions.** Saving, deleting, starting and stopping sync straight away instead of waiting for the timer.
  - Trigger: `tick()` calls after actions (for example L1690, L1886, L2410, L2469).
- [ ] **APP-SYNC-09 Errors are silent.** A failed sync or status call shows nothing; polling just carries on.
  - Trigger: L2244, L2567 · Notes: see APP-ERR-08.
- [ ] **APP-SYNC-10 Local clocks.** The current step's clock counts every second between syncs.
  - Trigger: L1776 · State: `S.syncAt`.
- [ ] **APP-SYNC-11 What a redraw covers.** Shell, video list, live player, selection bar, Home, activity log, and the open clip dialog; unchanged HTML is not replaced.
  - Trigger: `render()` (L2220-2225), `put()` (L943-944).

### 8.24 Error, empty and edge states (APP-ERR)

The banner slot under the top bar shows at most one banner, in this order (L1320-1324): ffmpeg missing, drive full,
AI not answering, new version, email not confirmed, AI not set up.

- [ ] **APP-ERR-01 ffmpeg missing.** "ClipCrest can't make clips yet: ffmpeg isn't installed on this computer." with the install commands for Windows (`winget install Gyan.FFmpeg`), Mac (`brew install ffmpeg`) and Linux (`sudo apt install ffmpeg`), "then close ClipCrest and start it again".
  - Trigger: `status.no_ffmpeg` (L1320) · Notes: shown to everyone, on every view, `role=alert`. Starting videos fails with 503 meanwhile.
- [ ] **APP-ERR-02 Drive full.** "The drive ClipCrest saves to is almost full, so it can't take new videos. Free up space on it, or move ClipCrest's folder to a bigger drive." and, for admins, "Open Storage".
  - Trigger: `status.disk_full` (L1322) · Notes: not shown on Settings (the Storage section says it there). `role=alert`.
- [ ] **APP-ERR-03 AI not answering.** Admins see "The AI isn't answering. <problem> Until then, clips are picked by loudness." and "Open AI settings".
  - Trigger: `status.ai.problem` (L1321) · Notes: not on Settings. The server keeps the problem for 6 hours (`studio/usage.py` L65).
- [ ] **APP-ERR-04 New version.** See APP-UPD-01.
- [ ] **APP-ERR-05 Email not confirmed.** "Confirm your email to start clipping. We sent a 6-digit code to <email>." with a code field, "Confirm" and "Send a new code".
  - Trigger: `user.verified === false` (L1323) · API: Confirm → `POST /api/auth/verify-code {code}` then `GET /api/status` (L2268-2275); "Send a new code" → `POST /api/auth/resend-verification` (L2479-2485) · Notes: code field numeric, one-time-code autofill, max 7 characters, placeholder "123456". Success: "Email confirmed. You're ready to clip."; a wrong code: red toast and the code is selected. Resend: "New code sent to <email>. Check your spam folder too." or, with no mail set up, red "Email isn't set up on this server yet, so the code was written to the server log."; already confirmed: "Your email is already confirmed.". Server: 3 resends per 15 minutes ("We've sent a few already. Check your spam folder, or try again in 15 minutes.").
- [ ] **APP-ERR-06 AI not set up.** Admins: "Add your AI key to let the AI pick clips and write titles. Until then, clips are picked by loudness." with "Add AI key" (not on Settings); others: "The AI isn't set up on this server yet, so clips are picked by loudness.".
  - Trigger: `status.ai.ready === false` (L1324) · Notes: not shown on the AI usage page.
- [ ] **APP-ERR-07 Signed out while using the app.** Any 401, from a call or an upload, sends the browser to `/login`.
  - Trigger: L932, L1610, L1646.
- [ ] **APP-ERR-08 Offline or server stopped.** Polling fails silently and resumes when the server is back; actions show a red toast with the browser's network error; link checks retry once (APP-COMP-05); uploads say "Upload failed. Check your connection.".
  - Trigger: L2244, L2541 · Notes: there is no "offline" banner (Q-12).
- [ ] **APP-ERR-09 Server restarted.** Data reloads by itself (APP-SYNC-06). Uploads that were half-way are deleted at start-up, so their next piece answers "This upload has expired. Start it again." (server L67-71, L912).
- [ ] **APP-ERR-10 Errors from any action.** The server's message in a red toast with "Report"; the pressed button works again.
  - Trigger: L2541.
- [ ] **APP-ERR-11 Empty states.** Every list has its own empty text: APP-VID-02, APP-HOME-07, APP-HOME-08, APP-CRE-12, APP-BELL-02, APP-USE-04..06, APP-CLIP-07, APP-CRE-09, APP-COMP-12.
- [ ] **APP-ERR-12 Failed videos and clips.** See APP-VID-09 and APP-VID-13.
- [ ] **APP-ERR-13 Earn-only server.** Non-admins never reach the app (they are sent to `/earn#me`); if a non-admin page still calls a clip-making API, it gets the Earn-only 403 message (section 4.3).
- [ ] **APP-ERR-14 Settings that fail to load.** The error replaces the section (APP-SET-03).

## 9. Landing page: `web/landing.html`

The public marketing page. Served at `/` when sign-in is on (and the site is not Earn-only), and always at
`/clip-maker`. The server replaces `{{SITE}}` and `{{DOWNLOAD}}` and caches the result (server L355-364). Script at
L409-490. It calls only two APIs: `GET /api/public` and `GET /api/auth/me`.

- [ ] **LAND-01 Search and share tags.** Title, description, canonical address, Open Graph and Twitter tags, and three JSON-LD blocks (SoftwareApplication, Organization, FAQPage).
  - Trigger: `<head>` (L6-23) · Notes: title "ClipCrest: AI Clip Maker for Twitch, Kick & YouTube Live Streams"; `{{SITE}}` in canonical, `og:url` and JSON-LD; `theme-color` `#C6F432`; the hero poster `/brand/demo-hype.jpg` is preloaded (L20). The FAQ JSON-LD repeats the visible FAQ (LAND-16) and must stay in step with it.
- [ ] **LAND-02 Header.** Sticky; logo to `/`; section links; "Sign in"; "Sign up".
  - Trigger: `header.nav` (L287-292) · Notes: links: "Earn NEW" (LAND-03), "How it works", "Features", "Open source", "Who it's for", "FAQ" (page anchors). A line appears under it once scrolled (L414). The section links hide at 960px and below with no menu to replace them (L267); "Sign in" hides at 560px and below (L274).
- [ ] **LAND-03 Earn pieces, only when Earn exists.** The header link, the hero announcement ("Earn money clipping: paid campaigns are live", shorter "Paid clipping campaigns are live" on phones, "See campaigns"), the band "Earn with ClipCrest. Join paid clipping campaigns, post from your own accounts and get paid per 1,000 views, straight to UPI." and the footer link "Earn: paid campaigns".
  - Trigger: `[data-earn]` (L277, L289, L298, L314, L403) · API: `GET /api/public` (L465-466) · State: `earn_url` · Notes: hidden by CSS until the body gets class `earn`; then every Earn link points at `earn_url` (which may be another website).
- [ ] **LAND-04 Hero.** "Clip live streams while they are still live" with the lede, over the animated ASCII gradient.
  - Trigger: L296-300 · Notes: GradientASCII with the same options as the app's Home (L415-416); started when the deferred script has loaded. See GA-01.
- [ ] **LAND-05 Link bar.** "Paste a YouTube, Twitch or Kick link" and "Get clips", in the hero and again at the end of the page.
  - Trigger: `form.linkform` (L301-303, L392-394, L455-461) · API: none · Notes: a typed link is saved in sessionStorage `clipcrest_link`; then the browser goes to `/signup`, or to `/app` when signed in (LAND-12). The app picks the link up (APP-ROUTE-11). The field is `type=url`, so the browser itself refuses text that is not a URL (Q-24).
- [ ] **LAND-06 "Upload a video".** A button next to the hero link bar that goes to `/signup` (or `/app` when signed in).
  - Trigger: `a[data-auth=up2]` (L304).
- [ ] **LAND-07 Three promises.** "Free and open source", "Uses your own AI key", "Runs on your own PC".
  - Trigger: L305.
- [ ] **LAND-08 Demo clips.** Three phone frames playing real example clips (muted, looping) with names, and a credit note.
  - Trigger: `.reel` (L307-312) · Notes: `/brand/demo-bounce.mp4`, `demo-hype.mp4`, `demo-clean.mp4` with their `.jpg` posters; captions "Kai Cenat / GTA 6 reaction", "IShowSpeed / on GTA 6", "GTA 6 trailer / stream reaction"; note "Example clips made with ClipCrest from public streams, credited to the creators. Not affiliated with or endorsed by them.". On phones only the middle one shows (L274).
- [ ] **LAND-09 Platforms strip.** "Clips from" YouTube, Twitch, Kick, your own video files; "Posts straight to" YouTube Shorts, Instagram Reels.
  - Trigger: L315-318.
- [ ] **LAND-10 Open source section.** "Free to use. Runs on your own machine, with your own AI key." and three blocks, with "Read the code" linking to GitHub.
  - Trigger: `#open` (L320-329).
- [ ] **LAND-11 How it works.** Three numbered steps, each with a small mock of the app; the third has a demo clip that plays only while on screen.
  - Trigger: `#how` (L331-353), `video.lazyplay` with an IntersectionObserver (L417-420).
- [ ] **LAND-12 Signed-in visitors.** "Sign in" disappears, "Sign up" becomes "Open ClipCrest" to `/app`, and the upload button and link bars go to `/app`.
  - Trigger: L483-489 · API: `GET /api/auth/me` · State: `user` · Notes: with sign-in off this endpoint returns the owner, so the page always shows the signed-in version. The footer's "Sign up" link does not change (Q-25).
- [ ] **LAND-13 Features.** Four cells: two judges, captions (three demo stills), live clipping (`#live`, animated bars), every AI call accounted for.
  - Trigger: `#features` (L355-368).
- [ ] **LAND-14 Earn-only website.** The link bars become "Download free" and "How to install" buttons, "Upload a video" becomes "Download free", "Sign up" becomes "Start earning" (to Earn), the closing text changes, and the header loses "Who it's for" and "Open source" and gains "Download".
  - Trigger: L463-481 · API: `GET /api/public` · State: `earn_only`, `download_url`, `earn_url` · Notes: falls back to `{{DOWNLOAD}}` when `download_url` is empty. A capturing submit handler also sends any link bar submit to the download (L481). If the visitor is signed in, LAND-12 then points "Start earning" at `/app`, which redirects non-admins to `/earn#me`.
- [ ] **LAND-15 Who it's for.** Five tabs (Clippers, Streamers, Podcasters, Agencies, Marketing teams); each shows a problem, the fix, and "From → To".
  - Trigger: `#tabs` buttons `[data-i]` (L370-374, L436-452) · Notes: `role=tablist`, `aria-selected`; the panel fades in on change. Mouse only: no arrow keys (Q-26).
- [ ] **LAND-16 FAQ.** Seven questions as `<details>`; the first is open.
  - Trigger: `#faq` (L376-387).
- [ ] **LAND-17 Closing call to action.** "Your last stream is a week of clips." and the second link bar.
  - Trigger: L389-395.
- [ ] **LAND-18 Footer.** Logo, a short description, "Sign up", columns Product, Get started, Legal, and "© <year> ClipCrest".
  - Trigger: L398-409 · Notes: the year is filled in by script.
- [ ] **LAND-19 Sections fade in.** Blocks rise into view when scrolled to; they can never stay hidden.
  - Trigger: `.reveal` (L27, L422-432) · Notes: the `js` class is set before paint; checked on scroll, resize, load, every 400ms until all shown, and by an IntersectionObserver. Reduced motion shows everything at once (L275).

## 10. Sign in and sign up: `web/auth.html`

One file for `/login` and `/signup`; the script reads the address and changes the words (L107-147). With sign-in
off, and for anyone already signed in, both addresses redirect to `/app`.

- [ ] **AUTH-01 Sign in or sign up.** The same page reads differently for each address.
  - Trigger: `location.pathname === "/signup"` (L109-119) · Notes: `/login`: tab "Sign in to ClipCrest", heading "Welcome back", "Sign in to get back to your clips.", button "Sign in". `/signup`: tab "Create your ClipCrest account", heading "Create your account", "Start clipping in a couple of minutes.", button "Create account".
- [ ] **AUTH-02 Side panel.** On wide screens a dark panel: logo (to `/`), "Make clips free. Get paid for views.", three points, "© <year> ClipCrest · Privacy · Terms".
  - Trigger: `aside.side` (L78-89) · Notes: below 861px the panel is hidden and a logo sits above the form instead (L74, L91).
- [ ] **AUTH-03 Google button.** "Sign in with Google" / "Sign up with Google" and the divider "or use your email", only when the server has Google sign-in.
  - Trigger: `#google`, `#or` (L93-96, L131-133) · API: `GET /api/public` → `google` · Notes: the link is `/auth/google/start?next=<destination>` (L128).
- [ ] **AUTH-04 Fields.** "Your name" (sign up only, up to 80 characters, "What should we call you?"), "Email" ("you@example.com"), "Password".
  - Trigger: L99-101, L117-119 · Notes: the password placeholder is "Choose a password" (sign up) or "Your password" (sign in); browser autofill hints `new-password` / `current-password`; "At least 8 characters." under it on sign up; "Forgot password?" next to the label on sign in (to `/reset`).
- [ ] **AUTH-05 Show the password.** An eye button shows or hides what was typed.
  - Trigger: `#pwshow` (L101, L120-126) · Notes: `aria-pressed`, label "Show password" / "Hide password"; focus returns to the field.
- [ ] **AUTH-06 Submit.** Sends the form and goes on; shows the server's reason in a red box when it fails.
  - Trigger: `#f` submit (L134-146) · API: `POST /api/auth/signup {email, password, name}` or `POST /api/auth/login {email, password, name}` · Notes: empty email or password → "Enter your email and password." without a request. The button is disabled while waiting. On success the browser goes to the destination (AUTH-07). The form has `novalidate`, so the browser does not check the fields itself. Server limits: sign-up 8 an hour per address; sign-in 30 per 10 minutes per address, 8 per email and address, 60 per email (server L535-618).
- [ ] **AUTH-07 Where to go after.** `?next=<path>` sends the user there afterwards, but only to a path on this site; otherwise `/app`.
  - Trigger: L110-111 · Notes: accepted: starts with one `/`, not `//` or `/\`, no tabs or line breaks.
- [ ] **AUTH-08 Google failed.** `?error=google` shows "Google sign-in didn't finish. Try again, or use your email.".
  - Trigger: L130 · Notes: the server sends people here when the Google round trip fails (server L661, L666).
- [ ] **AUTH-09 Legal line and switch link.** "By continuing you agree to our Terms and Privacy Policy." and "Already have an account? Sign in" / "New to ClipCrest? Create an account".
  - Trigger: `#legal`, `#swap` (L104-105, L127).

## 11. Password reset: `web/reset.html`

One file with two forms: ask for a reset link, or (with `?t=<token>` from the email) choose a new password
(L102-135). With sign-in off `/reset` redirects to `/app`.

- [ ] **RST-01 Ask for a reset link.** "Reset your password", "Enter the email you signed up with and we'll send you a link to choose a new password.", an email field and "Send reset link".
  - Trigger: `#ask` submit (L86-91, L111-121) · API: `POST /api/auth/forgot {email}` · Notes: empty → "Enter your email."; the button is disabled while waiting; success replaces the form with "If there's an account for that email, a reset link is on its way. It works for one hour. Check your spam folder if you don't see it." The answer is the same whether the account exists or not. Server limits: 10 an hour per address and 3 an hour per email, answered with 429 and shown in the red box.
- [ ] **RST-02 Choose a new password.** With `?t=` the page reads "Choose a new password", "You'll be signed in, and signed out everywhere else.", with "New password" ("At least 8 characters.") and "Type it again".
  - Trigger: `token` from the query (L104, L107-110), `#set` submit (L122-134) · API: `POST /api/auth/reset {token, password}` · Notes: shorter than 8 → "Use at least 8 characters."; different → "The two passwords don't match."; success signs the user in and goes to `/app`; a bad or expired token shows the server's reason. Server limit 20 an hour per address.
- [ ] **RST-03 Side panel.** Like the sign-in page but with "Clips from every stream, without watching all of it." and its own three points.
  - Trigger: L72-83 · Notes: hidden below 861px, with a logo above the form instead (L68, L85).
- [ ] **RST-04 Back to sign in.** A link to `/login` under the form.
  - Trigger: L99.

## 12. Legal pages: `web/legal.html`

One file holds all three policies. The server fills in the placeholders on every request (server L398-426);
`<body data-page="{{PAGE}}">` decides which article shows (CSS L22-26). Public in every mode.

- [ ] **LEGAL-01 Three addresses, one page.** `/terms`, `/privacy` and `/acceptable-use` each show their policy with its own title, description and canonical address.
  - Trigger: server L405-423 · Notes: `<title>{{TITLE}} | ClipCrest</title>`, description `{{DESC}}`, canonical `{{SITE}}/{{PAGE_PATH}}`, robots `index,follow` (L6-9). Titles and descriptions come from `LEGAL` in server L398-402.
- [ ] **LEGAL-02 Business details filled in.** The business name, contact and governing law come from settings.
  - Trigger: placeholders `{{NAME}}`, `{{CONTACT}}`, `{{LAW}}`, `{{SITE}}` · Notes: `CLIPCREST_LEGAL_NAME` (default "ClipCrest"); `CLIPCREST_CONTACT_EMAIL` becomes a `mailto:` link, otherwise "the contact details on our website"; `CLIPCREST_LEGAL_COUNTRY` becomes "the laws of <country>", otherwise "the laws of the country where ClipCrest's operator is established". All escaped by the server.
- [ ] **LEGAL-03 Header with tabs.** Logo to `/` and a pill row "Terms", "Privacy", "Acceptable use"; the current one is green.
  - Trigger: L55-56, CSS L19-23.
- [ ] **LEGAL-04 Switch without reloading.** Clicking a link to one of the three pages (header, text or footer) swaps the article in place with a short fade, updates the title and address, and scrolls to the top.
  - Trigger: click handler (L247-263), `popstate` (L264) · Notes: not when Ctrl, Cmd or Shift is held (those open normally). Back and forward work.
- [ ] **LEGAL-05 The policies.** Terms of Service (15 sections, including "12. Earn (paid clipping campaigns)"), Acceptable Use Policy, Privacy Policy (including the Google API Services User Data Policy box), each "Last updated 18 November 2026".
  - Trigger: `article#terms`, `#acceptable-use`, `#privacy` (L60-232) · Notes: the text is legal content; the port must keep it word for word (or replace it only with the owner's approval).
- [ ] **LEGAL-06 Footer.** The same footer as the landing page, without the Earn link.
  - Trigger: L235-246.

## 13. Earn: `web/earn.html`

Earn is a public page for clippers: browse paid campaigns, sign up, join, send links to posted clips, add proof
screenshots, and see what is owed and paid. One HTML file with an inline script; no placeholders.

**How it is served.** `GET /earn` (server L458-465): 404 when `earn_link()` is null; a 303 to
`<CLIPCREST_EARN_URL>/earn` when sign-in is off without `CLIPCREST_LOCAL_EARN=1`; otherwise the page, public, for
everyone. In Earn-only mode `/` serves the same file (server L347-352). Other pages lead here: the app's Earn link and
"Send to a paid campaign" (`#submit=<link>`, APP-EARN-02), Earn notifications (`/earn#me`), the Earn admin's "View"
(`/earn#c=<slug>`), sign-up and sign-in coming back through `?next=/earn#me` or `?next=/earn#c=<slug>`.

**Modes on this page.**
- Sign-in off with `CLIPCREST_LOCAL_EARN=1`: the owner is always signed in and an admin, so the dashboard always shows
  ("Hey You", "Manage campaigns"); download buttons go to the download address; "Sign out" only reloads (Q-32).
- Sign-in on, signed out: "Sign in" and "Start earning" links, no dashboard, campaign sheets offer "Sign up to join";
  `#submit=` sends the visitor to sign up first.
- Sign-in on, signed in: the dashboard, "My earnings", "Sign out", and either "Open ClipCrest" or (Earn-only, not
  admin) "Download clip maker".
- Earn-only: download buttons point at `download_url` in a new tab; non-admins get "Download clip maker" and
  "Make clips" pointing at `#download`.
- `CLIPCREST_VERIFY_EMAIL=1`: the confirm-your-email banner; joining and sending answer 403 until confirmed.
- `CLIPCREST_CONTACT_EMAIL`: the "Still stuck?" box and the footer contact line.

**Data.** `GET /api/earn/public/overview` (everyone) and `GET /api/earn/me` (signed in) on load and after each
action. No polling: nothing refreshes by itself (EARN-LOAD-03). Earn changes never call `ctx.bump()` on the server, so
a React page that relied on `/api/sync` would not see them.

IDs in this section use the prefix `EARN-` and these areas: META (head), HDR (header and menu), HERO, HOW (steps and
download), LIST (campaign cards), CAMP (campaign sheet), JOIN, CTA (the "Start earning" buttons), CALC (calculator),
LB (leaderboard), INFO (fixed content and footer), DASH (dashboard), VER (email code), SUB (sending a clip), CLIPS
(my clips), PROOF, PAY (payouts), PROF (payout profile), ROUTE (hash routing), LOAD, ERR, TOAST, MOB (small
screens), MOT (motion), MODE.

### META: document head and global

- [ ] **EARN-META-01 Title and share tags.** Browser tab and link previews show the Earn title and description.
  - Trigger: page load · API: none · State: none · Notes: `<title>` "Earn with ClipCrest: get paid to clip creators". `meta description` starts "Join paid clipping campaigns on ClipCrest…". `theme-color` is `#1E1612`. `og:type=website`, `og:site_name=ClipCrest`, `og:title`, `og:description` "Paid clipping campaigns. Post clips, get paid per 1,000 views, straight to UPI." There is no og:image, og:url or canonical. (L4-12)
- [ ] **EARN-META-02 Favicon.** Tab icon.
  - Trigger: `<link rel=icon>` · API: `GET /brand/favicon.svg` · State: none · Notes: (L13)
- [ ] **EARN-META-03 Fonts.** Geist (400/500/600/700/800) and Geist Mono 500.
  - Trigger: stylesheet · API: Google Fonts (external) · State: none · Notes: preconnect to fonts.googleapis.com and fonts.gstatic.com. Falls back to "Segoe UI", system-ui. (L14-16, L29, L37)
- [ ] **EARN-META-04 JS flag for animations.** Script adds class `js` to `<html>` before first paint so `.reveal` items start hidden.
  - Trigger: inline script · API: none · State: none · Notes: (L17, L53-54)
- [ ] **EARN-META-05 Global styles.** Light colour scheme only. Brand palette is set as tokens on `:root`. No shadows. Hover states change colour only. Focus ring is a 2px lime outline. `[hidden]` is forced to `display:none`.
  - Trigger: CSS · API: none · State: none · Notes: (L20-35)

### HDR: header and navigation

- [ ] **EARN-HDR-01 Sticky header with logo.** Logo links to "/".
  - Trigger: `header.nav#nav`, `a[aria-label="ClipCrest home"] img[alt=ClipCrest]` (/brand/logo.svg) · API: none · State: none · Notes: sticky at the top, 62px high. (L420-421, L59-62)
- [ ] **EARN-HDR-02 Section links.** Five links: "How it works" (#how), "Campaigns" (#campaigns), "Leaderboard" (#leaderboard), "FAQ" (#faq), "Free clip maker" (/clip-maker).
  - Trigger: `nav[aria-label=Sections] a` · API: none · State: none · Notes: hidden at ≤980px. In-page anchors scroll smoothly with an 80px top margin. (L422-424, L27-28, L375)
- [ ] **EARN-HDR-03 Signed-out buttons.** "Sign in" goes to `/login?next=%2Fearn`. "Start earning" goes to `/signup?next=%2Fearn%23me`.
  - Trigger: `#navRight` static HTML · API: none · State: `user` is null · Notes: both are hidden at ≤560px, where the menu is used instead. (L425-428, L384-385)
- [ ] **EARN-HDR-04 Signed-in buttons.** "My earnings" (#me) and "Sign out", plus either "Download clip maker" (#download) or "Open ClipCrest" (/app).
  - Trigger: `drawNav()` replaces `#navRight` · API: data from `GET /api/earn/public/overview` · State: `user`, `user.is_admin`, `earn_only` · Notes: "Download clip maker" shows when `earn_only && !is_admin`. Otherwise "Open ClipCrest" shows. (L865-868)
- [ ] **EARN-HDR-05 Fallback when accounts are off and there is no user.** Only "Open ClipCrest" (/app) shows.
  - Trigger: `drawNav()` · API: overview · State: `accounts === false` and `user` null · Notes: this only happens when `/api/earn/me` failed (L928). In practice it is dead code. (L874-876)
- [ ] **EARN-HDR-06 Header border after scroll.** A bottom border appears once the page scrolls more than 4px.
  - Trigger: scroll listener toggles `.stuck` · API: none · State: none · Notes: (L1052, L60)
- [ ] **EARN-HDR-07 Mobile menu toggle.** The hamburger opens and closes `#mnav`.
  - Trigger: `button.menu-btn[data-act=menu][aria-label=Menu][aria-controls=mnav]` · API: none · State: `aria-expanded` "true"/"false" · Notes: shown at ≤980px. The icon turns into an X when open. Escape and outside clicks do not close it. (L429, L984, L71-73, L369)
- [ ] **EARN-HDR-08 Mobile menu contents.** The same five links, plus two auth buttons.
  - Trigger: `#mnav`, `#mnavAuth` · API: none · State: `user` · Notes: signed out shows "Sign in" (/login?next=%2Fearn) and "Start earning" (/signup?next=%2Fearn%23me). Signed in shows "My earnings" (#me, primary) and "Sign out" (data-act signout). (L431-434, L873)
- [ ] **EARN-HDR-09 Menu closes on link click.** Clicking any link in `#mnav` without `data-act` hides the menu and sets aria-expanded to "false".
  - Trigger: document click · API: none · State: none · Notes: (L976-978)
- [ ] **EARN-HDR-10 Sign out.** Signs out and reloads /earn.
  - Trigger: any `[data-act=signout]` (nav, mobile menu, dashboard) · API: `POST /api/auth/logout` on click · State: none · Notes: errors are ignored. Then `location.href = "/earn"`. With sign-in off the server answers 404, so this is only a reload (see Q-32). (L986)

### HERO

- [ ] **EARN-HERO-01 Animated ASCII background.** A WebGL gradient sits behind the hero.
  - Trigger: `#ga[aria-hidden]` · API: `GET /assets/gradient-ascii.js` (defer) · State: none · Notes: starts on `load` if the script is not ready yet. Errors are swallowed. Options are in GA-01. (L438, L18, L1057-1058, L83)
- [ ] **EARN-HERO-02 Live pill.** A pill above the headline names the featured campaign.
  - Trigger: `a#heroPill` / `#heroPillText` · API: overview · State: `campaigns[].open`, `.state`, `.title`, `.rate_per_1k`, `.slug` · Notes: default is badge "LIVE" + "Paid clipping campaigns are open", linking to #campaigns. If any campaign is open, it uses the first open one in server order: "<title>: ₹<rate> per 1K views", linking to `#c=<slug>`. If none is open but one is soon or starts later: badge "SOON", text "Coming soon: <title>", linking to `#c=<slug>`. (L442, L920-921)
- [ ] **EARN-HERO-03 Headline.** Fixed text: "Clip streams for free. Get paid for posting them!"
  - Trigger: `h1#heroH1` · API: none · State: none · Notes: (L443)
- [ ] **EARN-HERO-04 Rate line.** A short line under the headline with the rate.
  - Trigger: `#rateLine` · API: overview · State: c0 = the open campaign with a rate and the most `remaining` (client-side sort) · Notes: default is "Paid per 1,000 views" · "Straight to your UPI". With c0 it becomes "**₹X** per 1,000 views", then "Up to **₹Y** a clip" if `max_per_clip`, then "Paid to your UPI". (L444, L907-910)
- [ ] **EARN-HERO-05 Lede.** One paragraph under the rate line.
  - Trigger: `#heroLede` · API: overview · State: c0 · Notes: with c0 the text is "Our free AI app turns streams into captioned shorts on your PC. Post them, send us the link, get paid to UPI. One clip with 100K views = ₹Z." Z is `payFor(100000, c0)`. (L445, L911)
- [ ] **EARN-HERO-06 "Up for grabs" pot.** A box with the money left in live campaigns.
  - Trigger: `#pot` (hidden until c0 exists), `#potAmt`, `#potBar`, `#potLeft` · API: overview · State: `overview.live_budget`, `c0.budget`, `c0.used_pct`, the number of open campaigns · Notes: label "Up for grabs right now". The amount counts up to live_budget. After 200ms the bar width becomes max(2, clamp(100−used_pct))% (100 when there is no budget). The left foot text is "Across N live campaigns" when more than one is open, otherwise "N% of the <title> budget still left". The right foot text is "Clips posted early earn the most" with a pulsing dot. (L446-450, L913-917)
- [ ] **EARN-HERO-07 Two path cards.** "STEP 1 · FREE / Make the clips" with `#heroDl` "Download free". "STEP 2 · EARN / Get paid for views" with `#heroCta` "Start earning →".
  - Trigger: `.paths` · API: none · State: see HOW-03 and CTA-02 · Notes: (L451-464)
- [ ] **EARN-HERO-08 Hero notes.** Three ticked notes.
  - Trigger: `#heroNotes` · API: overview · State: c0.max_per_clip · Notes: default is "No followers needed", "No editing skills needed", "Paid to UPI". With c0 it becomes ["Up to ₹Y a clip"], "No followers needed", "Paid to UPI". (L465, L918)
- [ ] **EARN-HERO-09 Three demo videos.** Muted, looping, autoplaying vertical clips with captions.
  - Trigger: `.reel3 video` · API: `GET /brand/demo-bounce|demo-hype|demo-clean.mp4` and `.jpg` posters · State: none · Notes: captions are "Kai Cenat / GTA 6 reaction", "IShowSpeed / on GTA 6", "GTA 6 trailer / stream reaction". Note under them: "Example clips made with our clip maker, credited to the creators." (L467-474)
- [ ] **EARN-HERO-10 Example earnings chip.** Shows what 100K views pays.
  - Trigger: `.chip.c2`, `#exAmt`, `#exSub` · API: overview · State: `ex` = `calcCamp()` (the first open campaign with a rate in server order, else an example of ₹25/1K with min 1,000), and c0 · Notes: static text is "Example: 100K views ₹2,500 at ₹25 per 1K views". Computed: amount = `inr(payFor(100000, ex))`, sub = "at ₹X per 1K views" + " · <title>" when it is a real campaign. If `c0.max_per_clip` is set, the label becomes "One clip can earn up to", the amount becomes ₹max and the sub becomes "₹rate per 1K views · <c0 title>". The chip is aria-hidden and hidden at ≤560px. (L471, L904-905, L912, L389)
- [ ] **EARN-HERO-11 Ticker counters.** Four numbers count up over 1.2s.
  - Trigger: `#tLive`, `#tPaid`, `#tClippers`, `#tViews` · API: overview · State: `overview.live_budget`, `paid_out`, `clippers`, `views` · Notes: labels are "budget open right now", "paid out to clippers", "clippers in campaigns", "views counted". Money uses `inr` (en-IN grouping, e.g. ₹1,00,000). Views use `short` (K / L / Cr). Static values before load: ₹0, ₹0, 0, 0. (L476-481, L901-902, L646-650)
- [ ] **EARN-HERO-12 Marquee strip.** Scrolling selling points, aria-hidden, content repeated twice.
  - Trigger: `.marq` · API: none · State: none · Notes: CSS animation lasts 30s. (L483-486, L194)
- [ ] **EARN-HERO-13 Hidden budget span (dead).** `#chipBudget` is filled with the first live campaign's budget but never shown.
  - Trigger: none · API: none · State: `campaigns[0].budget` · Notes: (L472, L920)

### HOW: how it works and the download block

- [ ] **EARN-HOW-01 Four steps.** Fixed text: "Get the free clip maker", "Join a campaign", "Post from your accounts", "Send the link, get paid".
  - Trigger: `#how .steps` · API: none · State: none · Notes: heading "From a stream to money in your UPI. Four steps." (L493-502)
- [ ] **EARN-HOW-02 Download block.** "Don't have an editor? ClipCrest makes the clips for you." with `#dlBtn` and `#dlHelp`.
  - Trigger: `#download` · API: none · State: see HOW-03 · Notes: static `#dlBtn` is "Download free", href /app. `#dlHelp` is "How to install". (L503-507)
- [ ] **EARN-HOW-03 Download buttons depend on mode.** Where every download button points.
  - Trigger: `load()` · API: overview · State: `earn_only`, `accounts`, `download_url` · Notes: when `earn_only` or `accounts === false`, `#dlBtn`, `#heroDl`, `#finalDl` and `#mbarDl` get href = download_url, target `_blank`, rel `noopener`. Otherwise `#dlBtn` text becomes "Open the clip maker" (href stays /app) and `#dlHelp` is hidden; heroDl, finalDl and mbarDl keep `#download`. (L929-931)
- [ ] **EARN-HOW-04 "How to install".** Opens the download in a new tab and shows a toast.
  - Trigger: `[data-act=dlhelp]` · API: none (opens download_url) · State: `download_url` · Notes: toast text "The setup guide is in the same folder as the download. Windows: unzip to C:\clipcrest and double-click Start-ClipCrest-Windows.bat." (L506, L1000-1005)

### LIST: campaign list

- [ ] **EARN-LIST-01 Section header.** Kicker "Live campaigns", heading "Pick a campaign. Start clipping today.", and a line about fixed budget and rate.
  - Trigger: `#campaigns` · API: none · State: none · Notes: (L511-516)
- [ ] **EARN-LIST-02 Card grid in server order.** One `button.camp[data-open=<slug>]` per campaign.
  - Trigger: `drawCamps()` → `#camps .camps` · API: overview · State: `campaigns[]` · Notes: server order: open first, then status live < soon < paused < draft < ended, then more clippers, more clips, more remaining (earn.py L375-377). Drafts are never public (earn.py L369-370). There are no filters or sort controls. (L691-693)
- [ ] **EARN-LIST-03 State tag.** A tag on each cover.
  - Trigger: `cover()` · API: overview · State: `state` (falls back to `open`/`status`) · Notes: open shows "LIVE" (lime, pulsing dot). soon shows "🔒 Coming soon". starts shows "🔒 Opens <d Mon>". paused shows "Paused". full shows "Budget used up". Anything else shows "Ended". (L655-661)
- [ ] **EARN-LIST-04 Category and Joined tags.**
  - Trigger: `cover()` · API: overview (signed in: `member` per campaign) · State: `category`, `member` · Notes: the joined tag reads "✓ Joined". (L662-663)
- [ ] **EARN-LIST-05 Cover art.** An image, a lock picture, or initials.
  - Trigger: `cover()` · API: `GET /earn/cover/<id>.jpg?v=<updated>` when `cover` is set · State: `cover`, `accent`, `state`, `starts_at`, `creator_name`, `title` · Notes: the uploaded image wins. For soon/starts there is a lock icon on the accent colour with "Revealing soon" or "Opens <date>". Otherwise there are 2 initials of creator_name (or title) plus the name. Locked cards (soon/starts) get class `locked`, which dims the cover and bolds the state text. (L664-668, L678-679, L136-137)
- [ ] **EARN-LIST-06 Card body text.**
  - Trigger: `card()` · API: overview · State: `creator_name`, `title`, `tagline` · Notes: the by-line falls back to "ClipCrest campaign". The tagline is clamped to 2 lines. (L682-683, L214)
- [ ] **EARN-LIST-07 Rate.**
  - Trigger: `card()` · API: overview · State: `rate_per_1k`, `max_per_clip` · Notes: "₹X per 1,000 views" plus " · up to ₹Y a clip". Without a rate: "Soon" / "rate announced when it opens". (L684)
- [ ] **EARN-LIST-08 Budget meter.**
  - Trigger: `card()` · API: overview · State: `budget`, `remaining`, `used_pct` · Notes: shown only when budget > 0. Text "₹R left" / "of ₹B". The bar animates from 0 to max(1.5, 100−used_pct)% (the part left) after a frame plus 150ms. (L685, L695)
- [ ] **EARN-LIST-09 Platform chips.**
  - Trigger: `plats()` · API: overview · State: `platforms[]` · Notes: names and dot colours: "YouTube Shorts" #FF3B30, "Instagram Reels" #D62976, "X" #211813, "TikTok" #25F4EE. (L615, L670)
- [ ] **EARN-LIST-10 Card footer.** Counts and a state line.
  - Trigger: `card()`, `stateLine()`, `until()` · API: overview · State: `clippers`, `clips`, `ends_at`, `starts_at`, `state` · Notes: "<n> clippers · <n> clips". For open campaigns: "Xd Yh left", "Xh Ym left", "Xm left", or "Ended" from `ends_at`, or "Open now" when there is no end date. Other states read "🔒 Coming soon", "🔒 Opens <d Mon>", "Paused", "Budget used up", "Ended". It does not tick. (L671-676, L635-640, L688)
- [ ] **EARN-LIST-11 Open a card.** Clicking a card opens the campaign sheet.
  - Trigger: `[data-open]` click → `closeSheet(); openCampaign(slug)` · API: see CAMP-01 · State: none · Notes: (L980)
- [ ] **EARN-LIST-12 Empty list.** Shown when there are no public campaigns.
  - Trigger: `drawCamps()` · API: overview · State: `campaigns.length === 0` · Notes: "The next campaign is on its way" / "Create your account now and set up your payout profile, so you can join the moment it opens." The same text shows to signed-in users. (L694)

### CAMP: campaign detail side sheet

- [ ] **EARN-CAMP-01 Open the sheet and set the hash.**
  - Trigger: card click, `#c=<slug>` hash, `[data-open]` buttons · API: `GET /api/earn/public/campaigns/{slug}` on open · State: whole campaign plus `leaderboard`, and `sources` for members only · Notes: on error, a red toast shows the server text (e.g. "That campaign doesn't exist." for unknown slugs and drafts). On success the hash becomes `#c=<slug>` via replaceState, so no hashchange fires. (L711-715)
- [ ] **EARN-CAMP-02 Sheet frame.** Dark backdrop and a right-hand panel.
  - Trigger: `.sheet-bg[data-act=close-bg] > .sheet[role=dialog][aria-label=<title>]` · API: none · State: none · Notes: top bar has mono "Campaign" and a "Close" button. Page scroll is locked (`body.style.overflow="hidden"`). It slides in. There is no aria-modal and no focus handling. (L728-729, L761, L325-328)
- [ ] **EARN-CAMP-03 Close the sheet.** Three ways to close.
  - Trigger: `[data-act=close]` button, a click on the backdrop itself (`e.target === a`), or the Escape key while open · API: none · State: `S.open` · Notes: clears `#sheet`, restores scroll, and if the hash starts with `#c=`, replaces the URL with `location.pathname`. (L763, L983, L1010)
- [ ] **EARN-CAMP-04 Cover with tags.** Same rules as LIST-03 to LIST-05. The banner is 16:6.
  - Trigger: `cover(c, true)` · API: cover jpg · State: as LIST · Notes: (L730, L329)
- [ ] **EARN-CAMP-05 Creator line.** The name, linked when a creator URL exists.
  - Trigger: `.by` · API: none · State: `creator_name`, `creator_url` · Notes: only http/https URLs pass (`safeUrl`, others become "#"). Opens in a new tab with noopener. (L733, L616)
- [ ] **EARN-CAMP-06 Title, tagline, brief.**
  - Trigger: `h2`, `p.sub`, `.brief` · API: none · State: `title`, `tagline`, `brief` · Notes: the brief keeps line breaks (`white-space:pre-line`). Everything is escaped. (L734-736, L332)
- [ ] **EARN-CAMP-07 Clip rules.** Heading "Clip rules" and a ticked list, shown only when there are rules.
  - Trigger: `ul.rules` · API: none · State: `rules[]` (one per line on the server) · Notes: (L737)
- [ ] **EARN-CAMP-08 Required tag.** "Required in your caption" with the tag in bold and "Checked automatically on YouTube, and by hand on the others."
  - Trigger: `.note.info` · API: none · State: `required_tag` · Notes: (L738)
- [ ] **EARN-CAMP-09 Source links (members only).** Heading "Streams and footage to clip".
  - Trigger: `.srcs` / `.locked` · API: campaign detail · State: `sources` is present only for members or admins (earn.py L338-339) · Notes: members see links "↗ <url>" (safeUrl, new tab), or "Links will be posted here." when the list is empty. Non-members see "🔒 Join the campaign to see which streams and videos to clip." (L739-741)
- [ ] **EARN-CAMP-10 Per-campaign leaderboard.** Heading "Top clippers in this campaign".
  - Trigger: `.mini-lb` · API: campaign detail · State: `leaderboard[]` (`name`, `views`, `earned`) · Notes: rows read "1. <name>" and "<short views> views · ₹earned". Empty: "No clips yet. Yours could be first." (L742-743)
- [ ] **EARN-CAMP-11 Big rate.**
  - Trigger: `aside .big` · API: none · State: `rate_per_1k` · Notes: "₹X" / "per 1,000 views". Without a rate: "Soon" / "The rate and budget are announced when it opens." (L746)
- [ ] **EARN-CAMP-12 Budget meter.** "₹R left" / "₹B", with the bar at max(1.5, 100−used_pct)%. Not animated.
  - Trigger: `aside .budget` · API: none · State: `budget`, `remaining`, `used_pct` · Notes: shown only when budget > 0. (L747)
- [ ] **EARN-CAMP-13 Facts list.**
  - Trigger: `aside dl` · API: none · State: `platforms`, `min_views`, `max_per_clip`, `hold_days`, `starts_at`, `ends_at`, `clippers` · Notes: rows are Platforms (first word of each name: "YouTube, Instagram, X, TikTok"), "Minimum views" (if set), "Most per clip" (if set), "Views counted" "<n> days after posting", "Starts" and "Ends" (if set, `d Mon`), "Clippers". (L748-756)
- [ ] **EARN-CAMP-14 Pay example.** "A clip with 50,000 views earns **₹X**."
  - Trigger: `.note.info` · API: none · State: `rate_per_1k`, `max_per_clip` · Notes: X = min(50×rate, max_per_clip or 1e12). It ignores `min_views`. (L727, L757)
- [ ] **EARN-CAMP-15 Call-to-action rules.** The button(s) at the bottom of the aside.
  - Trigger: `cta` · API: none · State: `state`, `open`, `member`, signed-in user, `S.me.profile.complete`, `starts_at` · Notes: rules, first match wins:
    - soon + signed in: disabled "🔒 Coming soon" plus "Fill in your payout profile now, so you can join the moment it opens."
    - soon + signed out: link "Sign up now, join when it opens →" to `signupHref("/earn#c=<slug>")`.
    - starts: disabled "🔒 Opens <d Mon>".
    - not open: disabled "Paused for now" (paused), "Budget used up" (full), or "Not taking clips" (ended or anything else).
    - open + signed out: "Sign up to join →" (`signupHref`) and "I have an account" (`/login?next=%2Fearn%23c%3D<slug>`).
    - open + member: "Send a clip →" `[data-act=submit-for][data-id=<id>]`.
    - open + profile incomplete: "Set up payout profile" `[data-act=profile-first]`.
    - otherwise: "Join campaign →" `[data-act=join][data-slug]`.

    `signupHref` returns `/signup?next=<encoded>`, or the bare path when `accounts === false`. (L717-726, L643, L758)
- [ ] **EARN-CAMP-16 "Set up payout profile" button.** Closes the sheet, opens the Profile tab and scrolls to #me.
  - Trigger: `[data-act=profile-first]` · API: none · State: `S.tab="profile"` · Notes: (L987)
- [ ] **EARN-CAMP-17 "Send a clip" button.** Closes the sheet, picks this campaign in the form, opens the Send tab, scrolls to #me and focuses the link field after 400ms.
  - Trigger: `[data-act=submit-for]` · API: none · State: `S.submitFor=<id>` · Notes: (L988)

### JOIN

- [ ] **EARN-JOIN-01 Join a campaign.**
  - Trigger: `[data-act=join]` (button disabled during the request) · API: `POST /api/earn/campaigns/{slug}/join` on click · State: returns the campaign, now `member` with `sources` · Notes: success toast (green) "You're in. Welcome to <title>.", then `refresh()`, then the sheet reopens: links become visible and the button becomes "Send a clip". The card gets "✓ Joined". (L989-994)
- [ ] **EARN-JOIN-02 Join errors.** Red toast, button enabled again.
  - Trigger: same · API: same · State: none · Notes: messages: "Confirm your email first. We sent you a link when you signed up; you can send a new one from the banner at the top." (403, only with VERIFY_EMAIL; server L326-328, L1712); "Finish your payout profile first: WhatsApp, UPI ID and at least one account handle."; "This campaign isn't taking new clippers right now."; "That campaign doesn't exist." (earn.py L538-548) (L992)
- [ ] **EARN-JOIN-03 Joining twice, or by sending a clip.** Joining again changes nothing. Sending a clip to a campaign also joins it.
  - Trigger: server behaviour · API: join / submissions · State: `joined[]` · Notes: (earn.py L546-547, L619-621)

### CTA: the four "Start earning" buttons

- [ ] **EARN-CTA-01 Signed-out CTAs.** `#heroCta`, `#calcCta`, `#finalCta` and `#mbarCta` read "Start earning" and link to `/signup?next=%2Fearn%23me`.
  - Trigger: static HTML · API: none · State: signed out · Notes: hard-coded, not built with signupHref. (L462, L534, L588, L606)
- [ ] **EARN-CTA-02 Signed-in CTAs.** All four are rewritten.
  - Trigger: `drawNav()` → `setCtas()` · API: overview + me · State: open campaigns, `S.me.joined` · Notes: if the user joined any open campaign, or none is open: href `#me`, text "My earnings". Otherwise: href `#c=<first open slug>`, text "Join a campaign" (more than one open) or "Join <title>". The phone bar shortens any "Join …" text to "Join campaign". The arrow SVG is kept by replacing only the first text node. Only redrawn by `load()`, not by `refresh()`. (L857-864, L869-872)

### CALC: earnings calculator

- [ ] **EARN-CALC-01 Section.** Kicker "Earnings calculator", heading "What could your clips make?", sub "Slide to see it. Worked out with <b>…</b>."
  - Trigger: `#calc` · API: none · State: none · Notes: (L520-526)
- [ ] **EARN-CALC-02 Views slider.**
  - Trigger: `input#calcViews[type=range][min=0][max=100][step=0.1][value=56.6][aria-label="Views on one clip"]` · API: none · State: none · Notes: the scale is logarithmic: raw = 1000×1000^(v/100), so 1K to 10L. It is rounded to 2 significant figures (step = 10^max(2, floor(log10 raw)−1)). `#calcViewsOut` shows `short()`, default "50K". v=0 gives 1K. v=100 gives "10 L". (L527, L888-893)
- [ ] **EARN-CALC-03 Clips-per-week slider.**
  - Trigger: `input#calcClips[min=1][max=30][value=5][aria-label="Clips a week"]` · API: none · State: none · Notes: `#calcClipsOut` shows the number. (L528, L893)
- [ ] **EARN-CALC-04 Results.** "One clip earns" and "In a month, about".
  - Trigger: `#calcOne`, `#calcMonth` · API: overview · State: `calcCamp()` (first open campaign with a rate, else ₹25/1K, min 1,000, no cap) · Notes: one = `payFor` (0 below min_views, capped at max_per_clip). Month = one × clips × 4.3, rounded to the nearest ₹100. After load with the example rate it shows ₹1,250 and **₹26,900**. The static HTML says ₹27,000 before load. (L531-532, L878-886, L892-894)
- [ ] **EARN-CALC-05 Which rate is used.**
  - Trigger: `#calcCamp` · API: overview · State: `calcCamp()` · Notes: "an example rate of ₹25 per 1,000 views" or "the <title> rate". (L526, L895)
- [ ] **EARN-CALC-06 Fine print.**
  - Trigger: `#calcFine` · API: overview · State: `rate_per_1k`, `max_per_clip`, `min_views` · Notes: for a real campaign: "₹X per 1,000 views, up to ₹Y a clip, from N views. An estimate: what you're paid depends on the real views each clip gets." For the example: just "An estimate: what you're paid…". The static HTML says "An estimate. What you're paid…". (L533, L896-897)
- [ ] **EARN-CALC-07 Live update.** Recalculates on every slider input.
  - Trigger: document `input` on #calcViews or #calcClips · API: none · State: none · Notes: (L965)
- [ ] **EARN-CALC-08 Calculator CTA.** `#calcCta`, see CTA-01 and CTA-02.
  - Trigger: none · API: none · State: none · Notes: (L534)

### LB: leaderboard

- [ ] **EARN-LB-01 Section header.** Kicker "Leaderboard", heading "Top clippers across every campaign.", sub "Ranked by views. Your name shows up here once your first clip is counted."
  - Trigger: `#leaderboard` · API: none · State: none · Notes: (L540-545)
- [ ] **EARN-LB-02 Leaderboard table.**
  - Trigger: `drawLb()` → `#lb .lb` · API: overview · State: `leaderboard[]` (`name`, `clips`, `views`, `earned`) · Notes: header "#", "Clipper", "Clips", "Views", "Earned". Rows show rank, a capital-initial avatar, name, clips (en-IN), views (`short`), and earned (`inr`, no decimals). Rank 1 is highlighted. The server keeps the top 10 by views and leaves out rejected clips. Pending views count. Earned counts only approved and paid clips. The name is the profile display_name, or the masked email "ea•••••" (2 letters + 2–5 dots) (earn.py L395-413). (L700-705, L310)
- [ ] **EARN-LB-03 Empty leaderboard.** "No one's on the board yet" / "The first clipper to send in a clip takes the top spot."
  - Trigger: `drawLb()` · API: overview · State: empty list · Notes: (L706)
- [ ] **EARN-LB-04 Columns on small screens.** "Earned" is hidden at ≤980px. "Clips" is hidden at ≤560px.
  - Trigger: CSS · API: none · State: none · Notes: (L377, L413)

### INFO: fixed content, final CTA and footer

- [ ] **EARN-INFO-01 "How we verify" band.** Heading "Every clip is cross-checked. Honest clippers get paid fast." and five cards: 01 "It's your account", 02 "Posted during the campaign", 03 "Credit in the caption", 04 "Never paid twice", 05 "Real views, counted later".
  - Trigger: `#checks` · API: none · State: none · Notes: at ≤560px the cards scroll sideways with snapping and the hint "Swipe for more →" shows. (L549-563, L396-399)
- [ ] **EARN-INFO-02 FAQ.** Eight `<details>`, the first one open.
  - Trigger: `#faq details > summary` · API: none · State: none · Notes: the questions: "Do I need a big following?", "How much can I earn?", "When do I get paid?", "How are Instagram and X views counted?", "Why was my clip refused?", "Can I use more than one account?", "What happens when the budget runs out?", "Do I have to use the ClipCrest clip maker?" The + rotates to × when open. (L565-581, L317-322)
- [ ] **EARN-INFO-03 FAQ contact box.** "Still stuck?" / "Email us and a real person will help." with a mailto link.
  - Trigger: `.help[data-contact][hidden]` · API: `GET /api/public` on load · State: `contact` · Notes: hidden unless contact is set. The link href is `mailto:<contact>` and its text is the address. Fetch errors are ignored. (L570, L1055-1056)
- [ ] **EARN-INFO-04 Final CTA band.** "Your next clip could pay you." / "Free clip maker. Paid campaigns. Money straight to your UPI."
  - Trigger: `#start` · API: none · State: see CTA and HOW-03 · Notes: has `#finalCta` "Start earning →" and `#finalDl` "Download the clip maker" (#download or download_url). (L584-590)
- [ ] **EARN-INFO-05 Footer links.**
  - Trigger: `footer.site` · API: `/brand/logo-light.svg` · State: none · Notes: the logo links to "/". Tagline: "The AI clip maker for streams, and paid clipping campaigns for the people who post them." Column Earn: "Live campaigns" #campaigns, "How we verify" #checks, "Leaderboard" #leaderboard, "My earnings" #me. Column Clip maker: "What it does" /clip-maker, "Download free" #download, "Create an account" /signup. Column Legal: "Terms of Service" /terms, "Privacy Policy" /privacy, "Acceptable Use" /acceptable-use. (L593-600)
- [ ] **EARN-INFO-06 Footer bottom.** "© <current year> ClipCrest", the contact line, and a disclaimer.
  - Trigger: `#yr`, `span[data-contact]` · API: `GET /api/public` · State: `contact` · Notes: the contact line "Want clippers for your channel? <mailto>" stays hidden without a contact. The disclaimer starts "Example clips on this site come from public streams…". (L601-602, L1053-1056)

### DASH: the clipper dashboard (#me)

- [ ] **EARN-DASH-01 Shown only when signed in.**
  - Trigger: `section#me.dash[hidden]` → `drawDash()` · API: overview (`user`) and `GET /api/earn/me` · State: `S.user` · Notes: (L489-491, L787-790)
- [ ] **EARN-DASH-02 Greeting.**
  - Trigger: `.hello` · API: me + overview · State: `profile.display_name` or `user.name` · Notes: avatar = first letter in capitals. Kicker "My earnings". Heading "Hey <display_name or name>". (L843-844)
- [ ] **EARN-DASH-03 Header buttons.**
  - Trigger: `.dash-top` · API: none · State: `user.is_admin`, `earn_only` · Notes: "Manage campaigns" (/admin/earn) for admins only. "Make clips" links to `#download` when `earn_only && !is_admin`, otherwise to `/app`. "Sign out" is `[data-act=signout]`. (L845)
- [ ] **EARN-DASH-04 Money cards.**
  - Trigger: `.kpis` · API: me · State: `totals.owed`, `pending_estimate`, `paid`, `views`, `clips`, `payouts.length` · Notes: "Owed to you" ₹owed / "approved, waiting for payout" (dark card). "Being counted" "~₹est" / "estimate from current views". "Paid to you" ₹paid / "N payout(s)" ("1 payout"). "Views" short(views) / "across N clip(s)". Money uses `inr2` (2 decimals only when there are paise). (L847-852, L612)
- [ ] **EARN-DASH-05 Tabs.**
  - Trigger: `.tabs button[data-act=tab][data-t=submit|clips|payouts|profile]` · API: none · State: `S.tab` (default "submit"), `submissions.length`, `payouts.length`, `profile.complete` · Notes: labels are "Send a clip", "My clips", "Payouts", and "Payout profile" (+ " ⚠" when incomplete). At ≤560px they become "Send", "Clips", "Payouts", "Profile[ ⚠]" in a 4-column grid. Count badges show only when above 0. The active tab has class `on`. Not stored anywhere. (L794, L853, L985, L180, L402-404)
- [ ] **EARN-DASH-06 Switching tabs redraws everything.** The whole dashboard HTML is rebuilt, so typed but unsaved input is lost.
  - Trigger: tab click · API: none · State: none · Notes: (L985)

### VER: confirming the email (only with CLIPCREST_VERIFY_EMAIL=1)

- [ ] **EARN-VER-01 Confirm-email banner.** "Confirm your email to join campaigns and send clips. We sent a 6-digit code to **<email>**."
  - Trigger: `.note.warn` with `form#vcode` · API: overview · State: `user.verified === false`, `user.email` · Notes: input `name=code`, `inputmode=numeric`, `autocomplete=one-time-code`, `maxlength=7`, placeholder "123456", `aria-label="6-digit code"`. Buttons "Confirm" (submit) and "Send a new code" (`[data-act=resend]`). (L840-841, L846)
- [ ] **EARN-VER-02 Confirm the code.**
  - Trigger: submit `#vcode` (button disabled during the request) · API: `POST /api/auth/verify-code {code}` · State: none · Notes: success: green toast "Email confirmed. You're ready to earn." and a full `load()`, which removes the banner. Errors: red toast, button enabled again, input text selected. Server texts: "Enter the 6-digit code from the email.", "That code isn't right. Check the newest email, or ask for a new code.", "That code has expired. Ask for a new one.", "Too many tries. Ask for a new code, or wait 15 minutes." (auth.py L151-167). Spaces are allowed ("123 456"). (L955-962)
- [ ] **EARN-VER-03 Send a new code.**
  - Trigger: `[data-act=resend]` (not disabled while waiting) · API: `POST /api/auth/resend-verification` · State: `verified`, `sent` · Notes: `{verified:true}` gives green "Your email is already confirmed." and `load()`. Otherwise green "A new code is on its way. Check your spam folder too." The server allows 3 per 15 min. After that, a red toast "We've sent a few already. Check your spam folder, or try again in 15 minutes." (server L547-559). (L1006-1008)

### SUB: sending a clip (incl. `#submit=`)

- [ ] **EARN-SUB-01 Profile not finished.** "Set up your payout profile first: UPI ID, WhatsApp number and at least one account handle. Clips are matched to these handles." with a "Set it up" button.
  - Trigger: Send tab, `profile.complete === false` · API: me · State: `profile.complete` · Notes: the button is `[data-act=tab][data-t=profile]`. (L797)
- [ ] **EARN-SUB-02 No joined open campaign.** An info note.
  - Trigger: Send tab · API: overview + me · State: open campaigns, `joined[]`, states soon/starts · Notes: if open campaigns exist that the user has not joined: "Join a campaign first. Open one below and press Join." plus a button "See <title of first one>" (`[data-open]`, opens the sheet). Otherwise: optionally "Campaigns are coming soon. Fill in your payout profile now so you can join the moment one opens. " (when a soon/starts campaign exists), followed by "No campaign is open right now. You'll see it here the moment one starts." (L798)
- [ ] **EARN-SUB-03 Campaign picker.**
  - Trigger: `#subForm select[name=campaign]` · API: me + overview · State: joined open campaigns · Notes: options read "<title> · ₹rate/1K". The one from "Send a clip" (`S.submitFor`) is preselected. Label "Campaign". (L799-800)
- [ ] **EARN-SUB-04 Clip link field.**
  - Trigger: `#subForm input[name=url][required]` · API: none · State: `S.prefill` · Notes: label "Clip link". Placeholder "https://youtube.com/shorts/…  or an Instagram, X or TikTok link". Hint "Send each clip once, after it's posted and public." (L801-802)
- [ ] **EARN-SUB-05 Live link check.** A badge in the field says whether the link looks right.
  - Trigger: `input` on `#subForm [name=url]` → `#det` · API: none · State: `S.me.profile[platform]` · Notes: empty clears the badge. Red `.detect.no` messages: "That isn't a link.", "Copy the Share link of your Short.", "Copy the reel's link, not your profile.", "Copy the post's link.", "Paste the full tiktok.com/@you/video/… link.", "YouTube, Instagram, X and TikTok links only.", "Add your <YouTube|Instagram|X|TikTok> handle in your profile", "This is @a, not @b" (X and TikTok only). Green `.detect.ok`: "✓ <YouTube Shorts|Instagram Reels|X|TikTok>". It is advice only and never blocks sending. (L766-778, L1011-1020)
- [ ] **EARN-SUB-06 Note for the reviewer.**
  - Trigger: `input[name=note][maxlength=300]` · API: none · State: none · Notes: label "Note for the reviewer (optional)". Placeholder "e.g. posted within 30 minutes of the moment". The server strips `<>`. (L803)
- [ ] **EARN-SUB-07 Send the clip.**
  - Trigger: submit `#subForm` · API: `POST /api/earn/submissions {campaign, url, note}` · State: returns `checks.owner`, `ready_at` · Notes: while waiting, the button is disabled and reads "Checking the clip…". Success: green toast "Clip sent. Your account is confirmed. Views are counted on <d Mon>." (the middle sentence only when `checks.owner === true`). Then the My clips tab opens, the prefill is cleared and `refresh()` runs. (L804, L1021-1028)
- [ ] **EARN-SUB-08 Send errors.** Red toast. The button text goes back to "Send clip for verification →".
  - Trigger: same · API: same · State: none · Notes: server texts:
    - "Confirm your email first…" (403).
    - "That's a lot of clips in one hour. Wait a bit, then send the rest." (429, 40 per hour).
    - "Paste the link to your clip." / "That link is too long." (more than 400 characters).
    - "That YouTube link doesn't point to a video. Copy the Share link of your Short." / "That Instagram link doesn't point to a reel. Open the reel, tap Share, then Copy link." / "That X link doesn't point to a post. Open the post, tap Share, then Copy link." / "Paste the full TikTok link (tiktok.com/@you/video/...). Short vm.tiktok.com links can't be checked." / "Links from YouTube, Instagram, X and TikTok are accepted."
    - "Finish your payout profile first…" / "Add your <Platform full name> handle to your profile first, so we can match the clip to you."
    - "This campaign isn't taking clips right now." / "This campaign doesn't pay for <P>. It pays for <list>."
    - "YouTube can't find that video. Make sure it's public, then try again." (only with a YouTube key).
    - "That clip isn't on the account in your profile (<detail>). Fix your handle or send a clip from your own account."
    - "That clip was posted before the campaign started, so it can't be paid."
    - "That clip has already been sent in for this campaign." / "That campaign doesn't exist."

    (server L1716-1723; earn.py L106-142, L580-618) (L1029)
- [ ] **EARN-SUB-09 "What happens next" box.** Four numbered points.
  - Trigger: `.side-box ol` · API: me · State: first joined open campaign's `hold_days`, `profile.youtube`, `profile.upi` · Notes: the points: "The link is checked right away: your account, posting time, caption tag and duplicates."; "Views are counted N days after posting[, automatically for YouTube]."; "For Instagram and X, add a screenshot … in **My clips** once the waiting days are over."; "Once approved, the amount is owed and gets paid to **<upi>**." (L806-810)
- [ ] **EARN-SUB-10 `#submit=<url>` from the main app.** The clip studio opens `<earn_url>#submit=<encodeURIComponent(url)>` in a new tab (index.html L2390-2399).
  - Trigger: hash on load or on hashchange → `route()` · API: none · State: `S.user`, `S.me.profile.complete` · Notes:
    - The URL is decoded first.
    - Signed out: `location.href = signupHref("/earn#submit=…")`, which is `/signup?next=%2Fearn%23submit%3D…` (or the bare path when `accounts === false`).
    - Signed in: the tab becomes "submit" if the profile is complete, else "profile". `S.prefill = url`, then `drawDash()`, then the hash is replaced with `#me` and the page scrolls to `#me`.
    - If the form exists, the link is filled in, an `input` event is fired (so the badge shows) and the field gets focus.
    - Otherwise, if the tab is profile: neutral toast "Set up your payout profile first, then send the clip."
    - With a complete profile but no joined open campaign, the SUB-02 note shows with no toast. The prefill is kept and appears once the user joins.

    (L939-949)

### CLIPS: My clips

- [ ] **EARN-CLIPS-01 Clips table.**
  - Trigger: My clips tab → `table.stack` in `.tbl-wrap` · API: me · State: `submissions[]` (newest first, at most 500; earn.py L652) · Notes: columns "Clip", "Checks", "Views", "Earnings", "Status", plus an unlabelled actions column. (L812)
- [ ] **EARN-CLIPS-02 Clip cell.**
  - Trigger: `.clip-url` · API: me · State: `platform`, `url`, `campaign`, `submitted_at`, `views_source`, `review_note`, `status` · Notes: the link text is "<YouTube Shorts|Instagram Reels|X|TikTok> · <url without http(s):// and www.>" (safeUrl, new tab). Below it: "<campaign> · sent <Nm|Nh|Nd ago>" plus " · views from YouTube" when `views_source === "api"`. The review note shows below that, in red when rejected. (L814-815, L642)
- [ ] **EARN-CLIPS-03 Check chips.**
  - Trigger: `checkChips()` · API: me · State: `checks.owner`, `checks.after_start`, `checks.tag` (true / false / null) · Notes: owner: "✓ Your account" / "✕ Not your account" / "Account: by hand". after_start: "✓ On time" / "✕ Too early" / nothing. tag: "✓ Tag found" / "✕ Tag missing" / nothing. (L783-786, L816)
- [ ] **EARN-CLIPS-04 Views.** en-IN grouped number. Phone label "Views".
  - Trigger: `td[data-l=Views]` · API: me · State: `views` · Notes: (L817)
- [ ] **EARN-CLIPS-05 Earnings.**
  - Trigger: `td[data-l=Earnings]` · API: me · State: `status`, `amount`, `estimate` · Notes: approved or paid shows ₹amount. Rejected shows "—". Pending shows "~₹estimate". (L818)
- [ ] **EARN-CLIPS-06 Status chip.**
  - Trigger: `statusChip()` · API: me · State: `status`, `ready`, `ready_at` · Notes: pending and ready: "Ready for review". Pending: "Counting views · <d Mon>". Approved: "Approved · owed". Paid: "Paid". Rejected: "Not approved". (L779-782, L819)
- [ ] **EARN-CLIPS-07 Remove a clip.** Only for pending clips.
  - Trigger: `[data-act=withdraw][data-id]` "Remove" (title "Remove this clip") · API: `DELETE /api/earn/submissions/{id}` after `confirm()` · State: none · Notes: the confirm text is "Remove this clip? You can send it again later." Cancel does nothing. Success: neutral toast "Clip removed." and `refresh()`. Error: red toast, e.g. "Only clips that haven't been reviewed yet can be removed." (L821, L995-999)
- [ ] **EARN-CLIPS-08 Empty clips.** "No clips yet" / "Send your first clip from the Send a clip tab."
  - Trigger: none · API: me · State: no submissions · Notes: (L822)
- [ ] **EARN-CLIPS-09 Rows become cards on phones.** At ≤560px each row is a 2-column card with small labels from `data-l`. The header row is hidden and empty cells are hidden.
  - Trigger: CSS `table.stack` · API: none · State: none · Notes: (L405-411)

### PROOF: views screenshot

- [ ] **EARN-PROOF-01 Add or replace a screenshot.** Only for pending clips.
  - Trigger: `label.btn.xs` "Add proof" or "Replace proof" (title "Add a screenshot of the clip's Insights showing the views") wrapping a hidden `input[type=file][accept="image/png,image/jpeg,image/webp"][data-proof=<id>]` · API: none · State: `status === "pending"`, `has_proof` · Notes: offered for every platform, YouTube included. (L820)
- [ ] **EARN-PROOF-02 Upload.**
  - Trigger: `change` on `[data-proof]` · API: `POST /api/earn/submissions/{id}/proof` (multipart field `file`) · State: none · Notes: a neutral toast "Uploading the screenshot…" shows first. Success: green "Proof added. A reviewer will check it." and `refresh()`. Errors (red):
    - HTTP 413, or 502 on an upload: "That file is too big. Use an image under 8 MB." (L626). The gate cuts off above 9 MB (server L113-114).
    - "That image is too big. The limit is 8 MB."
    - "Use a PNG, JPG or WEBP image."
    - "That file isn't an image ClipCrest can read. Use a PNG or JPG."
    - "This clip has already been reviewed."
    - "That clip doesn't exist."

    (earn.py L472-488, L677-688) (L1038-1043)
- [ ] **EARN-PROOF-03 View the proof.** A "Proof" link appears once a screenshot exists, whatever the status.
  - Trigger: `a.btn.xs[href="/api/earn/proof/<id>"][target=_blank]` · API: `GET /api/earn/proof/{id}` (owner or admin, served as image/jpeg) · State: `has_proof` · Notes: (L821; server L1739-1743)

### PAY: payouts

- [ ] **EARN-PAY-01 Payouts table.**
  - Trigger: Payouts tab → `table.stack` · API: me · State: `payouts[]` (`created_at`, `clips`, `upi`, `ref`, `amount`), newest first · Notes: columns "Date" (`toLocaleDateString("en-IN")`, e.g. 24/11/2026), "Clips", "Sent to" (the UPI at payout time), "Reference" ("—" when empty), "Amount" (`inr2`). Not wrapped in `.tbl-wrap`. (L824-825)
- [ ] **EARN-PAY-02 Empty payouts.** "No payouts yet" / "Approved clips show up as owed. When the money is sent to your UPI, it's listed here."
  - Trigger: none · API: me · State: no payouts · Notes: (L826)

### PROF: payout profile

- [ ] **EARN-PROF-01 Profile form fields.** Eight fields in `form#profForm`, values taken from the profile.
  - Trigger: Profile tab · API: me · State: `profile.*`, `user.name` · Notes:
    - "Name on the leaderboard" `display_name` (maxlength 40, placeholder = user.name)
    - "City" `city` ("Mumbai")
    - "UPI ID for payouts *" `upi` ("name@okaxis")
    - "WhatsApp number *" `whatsapp` ("+91 98765 43210")
    - "YouTube channel" `youtube` ("@yourchannel")
    - "Instagram" `instagram` ("@yourpage")
    - "X" `x` ("@yourhandle")
    - "TikTok" `tiktok` ("@you")

    No `required` attributes. Labels are not tied to their inputs. (L828-836)
- [ ] **EARN-PROF-02 Save the profile.**
  - Trigger: submit (`button.primary` "Save profile", disabled while waiting) · API: `PUT /api/earn/profile` with all form fields · State: returns the profile · Notes: success: green "Profile saved.", the Send tab opens, `refresh()` runs. Error: red toast, button enabled again. No email check is needed. (L837, L1031-1036)
- [ ] **EARN-PROF-03 Server tidies the values.** After a refresh the form shows the cleaned values.
  - Trigger: none · API: PUT profile · State: none · Notes: handles become "@lowercase". Links are accepted (x.com/Name becomes @name, youtube.com/@Name becomes @name, a UC… channel id is kept). WhatsApp loses spaces, dashes and brackets; 10 digits get "+91" in front. UPI is lowercased. `< > "` are removed from the name. City is cut at 60 characters. (earn.py L85-103, L506-528)
- [ ] **EARN-PROF-04 Profile validation messages.** Red toasts.
  - Trigger: none · API: PUT profile · State: none · Notes: "Write your WhatsApp number with the country code, like +91 98765 43210."; "That UPI ID doesn't look right. It looks like name@okaxis or 98xxxxxxxx@ybl."; "Your <YouTube|Instagram|X|TikTok> handle doesn't look right. Write it like @yourname." (earn.py L102, L511, L517)
- [ ] **EARN-PROF-05 What "complete" means.** UPI, WhatsApp and at least one handle.
  - Trigger: none · API: me · State: `profile.complete` · Notes: drives the ⚠ on the tab, SUB-01, CAMP-15 and SUB-10. A partial profile still saves. (earn.py L502)
- [ ] **EARN-PROF-06 "Why we need this" box.** Three points about handles, UPI and WhatsApp.
  - Trigger: none · API: none · State: none · Notes: (L838)

### ROUTE: URL hash routing

- [ ] **EARN-ROUTE-01 Route after the first load.** `load().then(route)`.
  - Trigger: page load · API: none · State: none · Notes: (L1060)
- [ ] **EARN-ROUTE-02 Route on hash change.**
  - Trigger: `hashchange` event · API: none · State: none · Notes: (L1044)
- [ ] **EARN-ROUTE-03 `#c=<slug>` opens the campaign sheet.**
  - Trigger: hash · API: campaign detail · State: none · Notes: the slug is URL-decoded. (L950)
- [ ] **EARN-ROUTE-04 `#me` scrolls to the dashboard when signed in.** Signed out, nothing happens because the section is hidden.
  - Trigger: hash · API: none · State: `S.user` · Notes: this is the target of the `/signup?next=/earn#me` round trip. (L951)
- [ ] **EARN-ROUTE-05 `#submit=<url>`.** See SUB-10.
  - Trigger: hash · API: none · State: none · Notes: (L941-949)

### LOAD: loading and refreshing data

- [ ] **EARN-LOAD-01 First load.** Reads the public data, then the user's own data, then draws everything.
  - Trigger: `load()` · API: `GET /api/earn/public/overview`, then `GET /api/earn/me` if `user` · State: `user`, `earn_only`, `accounts`, `download_url` · Notes: if `/me` fails, the page acts as signed out (`S.me = S.user = null`). Then it sets the download links and calls drawNav, drawHero, drawCamps, drawLb and drawDash. (L925-933)
- [ ] **EARN-LOAD-02 Refresh after an action.** Runs after join, send, remove, proof and profile save.
  - Trigger: `refresh()` · API: overview + me · State: none · Notes: redraws only the campaigns, the leaderboard and the dashboard. The nav, hero, calculator and CTAs stay as they were. (L934-938)
- [ ] **EARN-LOAD-03 No polling.** There is no `/api/sync` and no timer refresh, and countdowns do not tick.
  - Trigger: none · API: none · State: none · Notes: the only interval is the 500ms reveal check. (L1051)
- [ ] **EARN-LOAD-04 Before data arrives.** The fixed HTML values show; there is no spinner.
  - Trigger: none · API: none · State: none · Notes: ticker ₹0/0, chip ₹2,500, calculator ₹1,250/₹27,000, empty `#camps`, `#lb` and `#dash`. (L476-481, L516, L531-532, L545)
- [ ] **EARN-LOAD-05 Load failure.** Red toast with the server's `detail`, or "Something went wrong. Try again."
  - Trigger: none · API: overview · State: none · Notes: (L1060, L627)

### ERR and TOAST

- [ ] **EARN-ERR-01 Error wording rules.** Every API error goes through one helper.
  - Trigger: `api()` · API: all · State: `detail` · Notes: it sends a JSON body with a Content-Type header, or FormData as is. A 413 status, or a 502 on an upload, gives "That file is too big. Use an image under 8 MB." Any other non-2xx gives `detail`, or "Something went wrong. Try again." (L620-629)
- [ ] **EARN-TOAST-01 Toasts.** A message at the bottom centre.
  - Trigger: `toast(msg, kind)` · API: none · State: none · Notes: only one at a time (older ones are removed). Kinds: `good` (green), `bad` (red), or plain (dark). It disappears after 4.2s. No aria-live. (L630-634, L348-349)

### MOB: phones and small screens

- [ ] **EARN-MOB-01 Phone action bar.** A floating bar at ≤560px with "Start earning" (`#mbarCta`) and "Download" (`#mbarDl`).
  - Trigger: `#mbar`, `placeBar()` on scroll and resize · API: none · State: none · Notes: it slides in once the hero has scrolled off. It hides while the final `#start` section is in view or the sheet has content. It is not rechecked when the sheet opens or closes. The footer gets extra bottom padding. (L606, L966-973, L175-177, L392-393)
- [ ] **EARN-MOB-02 Layout at ≤980px.** Changes that apply up to 980px wide.
  - Trigger: CSS · API: none · State: none · Notes: hero becomes one column; nav links hidden and menu button shown; ticker and money cards 2 columns; checks and steps 2 columns; send form and side box stacked; sheet becomes one column with the aside first and not sticky; footer 2 columns; leaderboard "Earned" hidden. (L363-378)
- [ ] **EARN-MOB-03 Layout at ≤560px.** Changes that apply up to 560px wide.
  - Trigger: CSS · API: none · State: none · Notes: smaller section padding; nav "Sign in" and button hidden; one campaign per row; form rows one column; example chip hidden; rate line as a list; phone bar shown; checks swipe sideways; steps compact; tabs a 4-column grid with short labels; stacked tables; leaderboard "Clips" hidden; hero buttons full width. (L379-415)
- [ ] **EARN-MOB-04 Reduced motion.** All CSS animations and transitions off, and reveal content visible at once.
  - Trigger: `prefers-reduced-motion: reduce` · API: none · State: none · Notes: the JS count-ups (MOT-02) still run. (L416)

### MOT: motion

- [ ] **EARN-MOT-01 Reveal on scroll.** `.reveal` items fade and slide in.
  - Trigger: `watchReveal()` / `check()` · API: none · State: none · Notes: an item gets `.in` once its top is above 94% of the viewport. Checked on scroll, on resize and every 500ms. Optional delay from the `--d` style. (L53-54, L1047-1051)
- [ ] **EARN-MOT-02 Count-up numbers.** 1.2s, ease-out cubic, using requestAnimationFrame.
  - Trigger: `countTo()` · API: none · State: none · Notes: used for the ticker and the pot amount. Runs again on every `load()`. (L646-650)
- [ ] **EARN-MOT-03 Bar animations.** Campaign meters (1.2s) and the pot bar (1.2s).
  - Trigger: CSS width transitions · API: none · State: none · Notes: (L221, L187, L695, L916)

### MODE: differences by server mode (see also section 4)

- [ ] **EARN-MODE-01 Sign-in off with CLIPCREST_LOCAL_EARN=1.** The page shows its own Earn with the owner `u_local` always signed in as an admin.
  - Trigger: none · API: overview `accounts:false`, `user` = owner · State: none · Notes: the dashboard always shows "Hey You" with "Manage campaigns". Download buttons go to `download_url` and "How to install" shows. "Sign out" only reloads. (server L138-148, L447-465; auth.py L279-297)
- [ ] **EARN-MODE-02 Sign-in off without LOCAL_EARN.** `/earn` returns 404, or 303 to `CLIPCREST_EARN_URL/earn` when that is set.
  - Trigger: none · API: none · State: none · Notes: (server L458-464)
- [ ] **EARN-MODE-03 Accounts on, signed out.** Static Sign in and Start earning links, no dashboard, signed-out sheet buttons, `#submit=` sends to sign-up.
  - Trigger: none · API: none · State: none · Notes:
- [ ] **EARN-MODE-04 Accounts on, signed in.** Signed-in nav, CTAs and dashboard.
  - Trigger: none · API: none · State: none · Notes:
- [ ] **EARN-MODE-05 CLIPCREST_EARN_ONLY=1.** The page is also served at "/" and `/app` sends non-admins to `/earn#me`.
  - Trigger: none · API: none · State: none · Notes: download buttons go to `download_url` in a new tab and "How to install" shows. Non-admins get "Download clip maker" in the nav and "Make clips" pointing to `#download`. (server L347-352, L429-437, L165-167)
- [ ] **EARN-MODE-06 Admin.** "Manage campaigns" shows. In Earn-only, admins still see "Open ClipCrest" and "Make clips" pointing to `/app`.
  - Trigger: none · API: none · State: none · Notes: (L845, L868)
- [ ] **EARN-MODE-07 CLIPCREST_VERIFY_EMAIL=1.** The VER banner shows for unconfirmed users, and join and send answer 403.
  - Trigger: none · API: none · State: none · Notes: (server L326-328)

## 14. Admin dashboard: `web/admin.html`

The admin dashboard: totals and charts for the whole server, every account (with disable, enable and delete), the
feedback inbox and the log of admin actions. One HTML file with an inline script; no placeholders.

**How it is served.** `GET /admin` and `GET /admin/<anything>` (server L468-472), except `/admin/earn...`, which
matches the Earn admin route declared first (server L440-444). Admins only: signed-out visitors and normal users get
the same 404 JSON `{"detail":"Not Found"}` from the Gate (server L149-152) and from `_admin()` (server L318-323).
There is no redirect to `/login`. In the admin area the Gate reads permissions from the database on every request,
so `python -m studio.admin grant <email>` and `revoke` take effect at once.

**Modes on both admin pages.**
- Sign-in off: the owner is always an admin, so both pages open for anyone who reaches the server by its own
  address, although the app hides the links (Q-14). Users lists one admin row with no Disable or Delete; "Sign out"
  posts to a 404 and `/` redirects to `/app` (Q-69).
- Sign-in on: admins are the accounts with `is_admin` set from the command line (`studio/admin.py`). "Sign out" lands
  on the landing page (or on Earn in Earn-only mode).
- Earn off: `admin.html` hides "Earn campaigns", but `/admin/earn` is still served and works; its "Open the Earn page"
  and "View" links lead to a 404.
- `CLIPCREST_EARN_URL` set with sign-in off: "Earn campaigns" still opens the local `/admin/earn`, whose campaigns the
  public never sees (Q-70).
- Other settings shown on the pages: `CLIPCREST_VERIFY_EMAIL` (the "Email not confirmed" pills and filter), mail set
  up (the "Email" pill, Earn settings' mail note), Google keys (the "Google sign-in" pill), AI key (the AI pill and
  note), `CLIPCREST_FETCH_MODEL=0` (the "Transcription" pill stays red), `CLIPCREST_YOUTUBE_API_KEY` (Earn settings
  shows ", read from .env" and hides Remove).

IDs use the prefix `ADM-` and these areas: SRV (serving), HDR (shell), NAV (routing), OVR (overview), USR (users
list), UDLG (account dialog), ACC (disable, enable, delete), FB (feedback), LOG (activity), POLL, ERR, RSP
(responsive).

### Serving and access (SRV)
- [ ] **ADM-SRV-01 Admin-only page.** Admins get the dashboard. Everyone else gets 404.
  - Trigger: GET `/admin`, `/admin/{rest}` · API: route L468-472, `_admin()` L318-323, Gate L149-152 · State: `users.is_admin`, `disabled` · Notes: non-admins and signed-out visitors get the same JSON `{"detail":"Not Found"}` with status 404. There is no redirect to /login. With sign-in off, the built-in owner is always an admin, so anyone reaching the server by its own address gets the page (Gate L138-148). Any other Host gets 403 "Open ClipCrest by its own address."
- [ ] **ADM-SRV-02 `/admin/earn…` is not this page.** That path goes to the Earn admin page.
  - Trigger: `/admin/earn`, `/admin/earn/*` · API: route L440-444 is registered before server L468 · Notes: the React router must keep this split.
- [ ] **ADM-SRV-03 Page metadata.** Title, robots tag and favicon.
  - Trigger: `<head>` · Notes: `<title>ClipCrest Admin</title>`, `meta robots noindex, nofollow`, favicon `/brand/favicon.svg` (L6-8)

### Shell, sidebar, top bar (HDR)
- [ ] **ADM-HDR-01 Logo.** The sidebar shows the light logo.
  - Trigger: `img.logo` src `/brand/logo-light.svg`, alt "ClipCrest" (L167)
- [ ] **ADM-HDR-02 Sidebar nav.** A heading "Admin", then 4 links with icons: Overview, Users, Feedback, Activity.
  - Trigger: `#nav a.nav-item[data-act=tab][data-k]` · Notes: hrefs `/admin`, `/admin/users`, `/admin/feedback`, `/admin/activity`. The active item has class `on` (lime background) (L219-223, L333-334).
- [ ] **ADM-HDR-03 Users count badge.** The Users link shows the total number of accounts.
  - State: `totals.users`, shown once the overview has loaded · Notes: `num()` formatting (L334)
- [ ] **ADM-HDR-04 Feedback new-count badge.** The Feedback link shows how many messages are new.
  - State: `S.fb.counts.new` · Notes: it appears only after feedback has loaded, which happens on the Feedback tab or after pressing Refresh (L334). It does not appear on first load of other tabs (see Q-61).
- [ ] **ADM-HDR-05 Who block.** The admin's name in bold, with their email below.
  - API: `GET /api/auth/me` at startup (L424) · State: `user.name`, `user.email` · Notes: hidden if the call fails. Also hidden at ≤900px (L147). With sign-in off on a fresh install it shows "You" / "you@localhost".
- [ ] **ADM-HDR-06 "Earn campaigns" link.** Goes to `/admin/earn`, only when the server has Earn.
  - API: `GET /api/public` at startup (L425) · State: `earn_url` must be truthy · Notes: the link is hard-coded to `/admin/earn` (L336)
- [ ] **ADM-HDR-07 "Back to the app" link.** Goes to `/app` (L336).
- [ ] **ADM-HDR-08 "Sign out" button.** Signs out, then opens "/".
  - Trigger: `button[data-act=logout]` · API: `POST /api/auth/logout` · Notes: uses plain `fetch` and ignores the reply, then sets `location.href="/"` (L337, L418). With sign-in off, the POST returns 404 and "/" redirects to /app (Gate L144-147). With accounts on, "/" is the landing page, or `earn.html` when EARN_ONLY is set.
- [ ] **ADM-HDR-09 Title and subtitle per tab.** `#title` and `#subtitle` change with the tab.
  - Notes: exact strings (L219-222):
    - Overview: "Sign-ups, videos and AI use across this ClipCrest server."
    - Users: "Every account. Open one to see how much it uses the AI."
    - Feedback: "Bug reports, feature ideas and other messages from users."
    - Activity: "Everything admins have done, newest first."
    - The initial h1 is "Admin" (L172).
- [ ] **ADM-HDR-10 Refresh button.** The only button in the top bar. Reloads all data.
  - Trigger: `button[data-act=refresh]` "Refresh" · API: `GET /api/admin/overview`, then `GET /api/admin/feedback?status=…` · Notes: toast "Up to date" (ok) (L339, L394)

### Routing (NAV)
- [ ] **ADM-NAV-01 Tab from the URL.** The path picks the tab.
  - Notes: segment 2 of the path, with a trailing slash removed. `/admin` is Overview. An unknown `/admin/xyz` shows Overview and keeps the bad URL (L223-224, L423).
- [ ] **ADM-NAV-02 Switching tabs.** No full page reload.
  - Trigger: nav click with `preventDefault` · Notes: `history.pushState` only if the path differs. Opening Feedback loads the list. The view redraws and `#main` scrolls to the top (L350-354, L393).
- [ ] **ADM-NAV-03 Back and forward.** History navigation restores the tab.
  - Notes: `popstate` calls `go(fromPath(), false)` (L355)
- [ ] **ADM-NAV-04 Deep link to Feedback.** `/admin/feedback` opens the Feedback tab.
  - Notes: in-app notifications about new feedback link here (`studio/feedback.py` L32)
- [ ] **ADM-NAV-05 State kept in memory only.** Search, filter, sort and feedback status survive tab switches but not a reload.
  - Notes: `S = {q, filter:"all", sort:"created_at", fbStatus:"new"}` (L218). None of it is in the URL or browser storage.

### Overview (OVR)
- [ ] **ADM-OVR-01 Tile row 1.** Four tiles: big number, label, small line.
  - API: `GET /api/admin/overview` · State: `totals.*` · Notes (L253-257):
    - `users` / "Accounts in total" / "`{verified} confirmed their email, {disabled} disabled`"
    - `signups_7d` / "Signed up, last 7 days" / "`{signups_today} today, {signups_30d} in 30 days`"
    - `active_7d` / "Active, last 7 days" / "`{admins} admin`" or "`… admins`" (singular when exactly 1)
    - `videos` / "Videos processed" / "`{clips} clips made`"
- [ ] **ADM-OVR-02 Tile row 2.** Four more tiles (L258-262):
  - `ai_calls` / "AI calls in total" / "`{ai_calls_today} today`"
  - `kfmt(tokens)` / "AI tokens used" / "Counted on your own AI key"
  - `recording` / "Recording right now" / "Live streams being clipped"
  - `working` / "Videos in progress" / "`{server.running} running, {server.waiting} waiting`"
- [ ] **ADM-OVR-03 Sign-ups chart.** Card "Sign-ups", subtitle "New accounts per day, last 30 days".
  - State: `daily[].signups` · Notes: aria-label "New accounts per day" (L265)
- [ ] **ADM-OVR-04 AI usage chart.** Card "AI usage", subtitle "Tokens used per day, last 30 days".
  - State: `daily[].tokens` · Notes: y-axis uses `kfmt`. aria-label "AI tokens used per day" (L266).
- [ ] **ADM-OVR-05 AI calls chart.** Card "AI calls", subtitle "Per day, last 30 days".
  - State: `daily[].calls` · Notes: aria-label "AI calls per day" (L269)
- [ ] **ADM-OVR-06 Chart mechanics.** How each bar chart is drawn.
  - Notes (L227-241):
    - SVG 640×190 with `role="img"`. Three gridlines labelled 0, half of max, max.
    - One `rect.b1` per day with value > 0, each with a `<title>` "`YYYY-MM-DD: value`".
    - X labels every 5th day and on the last day, written "DD/MM".
    - When every value is 0, centred text "Nothing in the last 30 days".
    - The 30 day buckets come from the server, using server local time.
- [ ] **ADM-OVR-07 "What the AI is used for".** Horizontal bars, subtitle "All users, all time".
  - State: `by_purpose` = `[purpose, calls, tokens]`, the top 12 by tokens · Notes: each row reads "`{n} call(s) · {kfmt} tokens`". Bar width is the share of calls, at least 2%. Empty: "Nothing yet." (L242-246, L270)
- [ ] **ADM-OVR-08 "Right now" card.** Live activity summary.
  - Notes: subtitle "`{recording} recording, {working} video(s) in progress`" (L272)
- [ ] **ADM-OVR-09 Server status pills.** Green when the service is ready, red when it is not.
  - State: `server.ai_key/ai_provider/ai_model/speech_model/google/mail/database/free_gb` · Notes (L251-252, L273):
    - AI pill: "`AI: {provider}, {model}`", or "AI: ready", or "No AI key"
    - "Transcription", "Google sign-in", "Email"
    - Neutral pills: database name (e.g. "sqlite") and "`{free_gb} GB free`"
- [ ] **ADM-OVR-10 Machine load pills.** Present in practice, because `server.load` always has a value (`load.state()`).
  - Notes (L273):
    - "Near full: new videos are queueing" (warn) or "Has room" (ok)
    - "`Processor {cpu}%`"
    - "`{ram_free_gb} GB memory free`"
    - "`{running} running, {waiting} waiting`"
- [ ] **ADM-OVR-11 No-AI-key note.** Shown only when `!server.ai_key` (L274).
  - Text: "No AI key is set, so clips are picked by loudness only. Add your own key to the .env file on the server (see .env.example) and restart."
- [ ] **ADM-OVR-12 Number formats.** How numbers and dates are written.
  - Notes: `num` uses `toLocaleString()` in the browser's locale. `kfmt` gives one decimal with k or M (e.g. 1.5k, 2.0M) (L199-200). Tests should pin the locale and timezone.

### Users list (USR)
- [ ] **ADM-USR-01 Search.** Filters accounts by name or email as you type.
  - Trigger: `input#q[type=search]`, placeholder "Search by name or email", aria-label "Search accounts" · Notes:
    - case-insensitive substring match on email or name, client side
    - redraws on every keystroke, keeping focus and caret position (L278-279, L289, L342-344, L388)
- [ ] **ADM-USR-02 Filter segment.** Buttons "All", "Email not confirmed", "Disabled", "Admins".
  - Trigger: `[data-act=filter][data-k]` · State: `verified`, `disabled`, `role` · Notes: active button is `on` (L280-282, L286, L290, L397)
- [ ] **ADM-USR-03 Count.** Shows "`{shown} of {total}`" (L291).
- [ ] **ADM-USR-04 Sorting.** Header buttons sort the table.
  - Notes:
    - Sortable: Joined (created_at, the default), Last active (last_seen), AI calls, AI tokens, Videos, Clips.
    - Always descending, with no ascending toggle. The active header is coloured brand-deep. Account is not sortable (L283, L287, L292-294, L398).
- [ ] **ADM-USR-05 Row content.** What each account row shows.
  - Notes (L295-300):
    - Bold name, or the part of the email before "@" when there is no name.
    - Pills: "Admin" (lime), "Disabled" (red), "Email not confirmed" (warn).
    - The email under the name.
    - Joined as `day()`, e.g. "5 Nov 2026" in the browser locale. Last active as `ago()`.
    - The four number columns.
- [ ] **ADM-USR-06 Open an account.** Clicking a row opens the account dialog.
  - Trigger: `tr.u[data-act=user][data-id]` (L295, L400)
- [ ] **ADM-USR-07 Empty result.** Text: "No accounts match", then "Try another search or filter." (L301)
- [ ] **ADM-USR-08 List cap.** The server sends at most the 2000 newest users. `totals.users` still counts everyone (`admin.py` L45-46).
- [ ] **ADM-USR-09 Time formats.** Notes (L201-203):
  - `day()` and `ago()` show "Never" for an empty value.
  - `ago()`: under 5 min "Now", under 1 h "N min ago", under 1 day "N h ago", under 30 days "N d ago", otherwise the date.

### Account dialog (UDLG)
- [ ] **ADM-UDLG-01 Opening.** The native `<dialog id=dlg>` opens at once showing "Loading…".
  - API: `GET /api/admin/users/{id}` · Notes: on an error it closes and shows an error toast. A 404 redirects to /app instead (L359-361).
- [ ] **ADM-UDLG-02 Header.** h2 with the name (or email prefix), plus Admin and Disabled pills, and the email below (L363-364).
- [ ] **ADM-UDLG-03 Action buttons.** "Disable account" (red) or "Enable account" when already disabled, then "Delete account" (red), then "Close".
  - Notes: Disable and Delete are hidden for admin accounts (L365-368)
- [ ] **ADM-UDLG-04 Facts grid.** Eight boxes: AI calls, AI tokens, Videos, Clips, Joined, Last active, Signed-in devices, Email confirmed (Yes/No).
  - State: the first four and "Email confirmed" come from the users-list row, not the detail response. Joined, Last active and `signed_in_devices` come from the detail (L369-372).
- [ ] **ADM-UDLG-05 Privacy note.** Text: "You can see how much this account uses the AI. Their videos, clips and connected accounts stay private to them." (L373)
- [ ] **ADM-UDLG-06 "What they use the AI for".** Bars, one per purpose.
  - Notes: each row reads "`{kfmt} tokens · {n} call(s)`". Empty: "Nothing yet." (L374)
- [ ] **ADM-UDLG-07 "Latest AI calls".** Table with When / What / Tokens, up to 40 rows.
  - Notes: empty: "No AI calls yet." (L375-377)
- [ ] **ADM-UDLG-08 Closing.** The "Close" button or Escape (native dialog). Clicking the backdrop does nothing (L368, L399).
- [ ] **ADM-UDLG-09 Polling pauses.** Auto-refresh is skipped while any dialog is open (L427).

### Disable, enable, delete account (ACC)
- [ ] **ADM-ACC-01 Disable.** Confirm, then disable the account.
  - Trigger: `[data-act=disable][data-off=1]` · API: `POST /api/admin/users/{id}/disabled {disabled:true}` · Notes:
    - The account dialog closes, then a confirm dialog opens.
    - Heading "Disable this account?"
    - Text "`{email} is signed out everywhere and cannot sign in until you enable the account again. Their data is kept.`"
    - Buttons "Cancel" and "Disable account" (red, autofocus).
    - Afterwards: toast "Account disabled", and the data reloads (L401-408).
- [ ] **ADM-ACC-02 Enable.** Same flow for a disabled account.
  - Notes: heading "Enable this account?", text "`{email} will be able to sign in again.`", button "Enable account" (primary). Toast "Account enabled" (L404-408).
- [ ] **ADM-ACC-03 Confirm dialog mechanics.** How the confirm dialog answers.
  - Notes: `<form method=dialog>`; Cancel sets `value=no`, OK sets `value=yes`. Escape counts as No (L379-386). There is a likely bug here (Q-59).
- [ ] **ADM-ACC-04 Disable refusals.** Shown as an error toast.
  - Notes (`admin.py` L121-131): "You can't disable your own account.", "Admin accounts can't be disabled from here.", "Bad request." (when `disabled` is not a true/false value)
- [ ] **ADM-ACC-05 Delete.** Type the email to delete an account for good.
  - Trigger: `[data-act=deluser]` · API: `POST /api/admin/users/{id}/delete {confirm}` · Notes:
    - The dialog closes, then the browser's own `prompt()` asks (exact text, L413): "`Delete {email} and everything in the account for good?\n\nCreators, recordings, videos and clips are all removed. This cannot be undone.\n\nType the email address to confirm:`"
    - Cancel or an empty answer does nothing.
    - Afterwards: toast "Account deleted", and the data reloads (L410-417).
- [ ] **ADM-ACC-06 Delete errors.** Shown as an error toast.
  - Notes (server L1630-1646, `account.py` L140-148):
    - "Type the account's email address exactly to confirm." (the check ignores case and trims spaces)
    - "You can't delete your own account from here."
    - 409: "Admin accounts can't be deleted. Make it a normal account first." / "A stream is still being recorded. Stop the recording first." / "A video is still being made. Wait for it to finish, then delete the account."
    - A 404 redirects to /app.
- [ ] **ADM-ACC-07 Side effects to verify.** What the server does after each action.
  - Notes: disabling removes all of that user's sessions at once (`admin.py` L133-134). Disable, enable and delete each write an admin-log row. Delete removes every row with that `user_id` (feedback, usage, earn data) and the user's folder (`account.py` L151-166).

### Feedback inbox (FB)
- [ ] **ADM-FB-01 Loading.** Shows a "Loading…" box until the first list arrives (L315).
- [ ] **ADM-FB-02 Status segment.** Buttons "New" (default), "Seen", "Done", "All".
  - API: `GET /api/admin/feedback?status=new|seen|done`; All sends no query · Notes: a non-zero count is added as "` · N`", for example "New · 3". "All" never shows a count (L316-317, L395).
- [ ] **ADM-FB-03 Item header.** Kind pill, sender, details line, status pill.
  - Notes (L312, L318-320):
    - Kind pill: "Bug" (red), "Idea" (lime) or "Message". An unknown kind shows the raw value.
    - Sender: bold name, else the email, else "Deleted account".
    - Details: "`{email} · {when} · {page}`".
    - Status pill on the right: "New" (warn), "Seen" or "Done" (ok).
- [ ] **ADM-FB-04 Message and context.** The message keeps its line breaks. Context, when present, is in a grey box (L321).
- [ ] **ADM-FB-05 "Mark seen".** Shown unless the status is already seen.
  - API: `POST /api/admin/feedback/{id} {status:"seen"}` · Notes: toast "Marked seen", then the list reloads (L322, L396)
- [ ] **ADM-FB-06 "Done" and "Reopen".** "Done" (with a check icon) is shown when the status is not done. "Reopen" is shown when it is done and sets the status back to `new`.
  - Notes: toasts "Marked done" and "Reopened" (L323, L396)
- [ ] **ADM-FB-07 "Reply by email".** A mailto link, shown only when the sender has an email.
  - Notes: href `mailto:{email}?subject=About%20your%20ClipCrest%20feedback` (L324)
- [ ] **ADM-FB-08 Empty states.** Heading "Nothing here".
  - Notes: on New: "No new messages. Everything has been looked at."; on the others: "Messages appear here as users send them." (L325)
- [ ] **ADM-FB-09 Order and limit.** Newest first, at most 300 items (`feedback.py` L36-47).
- [ ] **ADM-FB-10 Status errors.** Toasts "Unknown status." and "That message no longer exists." (`feedback.py` L50-56).

### Activity log (LOG)
- [ ] **ADM-LOG-01 Card.** Heading "Admin activity". Subtitle "A permanent record. Entries cannot be edited or removed from here." (L305)
- [ ] **ADM-LOG-02 Table.** Columns When / Admin / Action / Account / Details.
  - Notes (L204, L306-308):
    - Action labels: disable "Disabled an account", enable "Enabled an account", delete "Deleted an account", role:admin "Made an admin", role:user "Removed admin". Unknown actions show raw.
    - An admin with no matching account shows "Removed admin".
    - When uses `when()`, month/day/time.
- [ ] **ADM-LOG-03 Empty state.** "Nothing yet", then "Account changes made by admins are recorded here." (L309)
- [ ] **ADM-LOG-04 Limit.** Only the newest 40 entries (`admin.py` L67-68). `admin grant` logs "role:admin" with details "set from the server command line" (`admin.py` L151).

### Startup and polling (POLL)
- [ ] **ADM-POLL-01 Auto-refresh.** Every 30 s the overview data reloads.
  - API: `GET /api/admin/overview` · Notes: only while no dialog is open and the tab is visible. Feedback is not re-polled (L427).
- [ ] **ADM-POLL-02 Startup order.** Draw the shell, then `/api/auth/me`, then `/api/public`, then `/api/admin/overview` (L422-428).

### Errors, loading, toasts (ERR)
- [ ] **ADM-ERR-01 Loading.** "Loading…" until the overview arrives, on every tab except Feedback (L173, L341).
- [ ] **ADM-ERR-02 Lost access.** A 401 or 404 from any `api()` call leaves the page: `location.replace("/app")` (L208).
- [ ] **ADM-ERR-03 Error text.** Uses the server's `detail`, else the HTTP status text. A non-text detail becomes "Something went wrong" (L209).
- [ ] **ADM-ERR-04 Load failure.** The view is replaced by "Couldn't load" plus the message (L348).
- [ ] **ADM-ERR-05 Toasts.** Stacked bottom-right in `#toasts` (`role=status`, `aria-live=polite`). Green dot for ok, red for errors. They last 3.2 s, or 7 s for errors (L134-137, L177, L213-216).

### Responsive (RSP)
- [ ] **ADM-RSP-01 ≤1100px.** Tiles in 2 columns; chart pairs stacked (L139).
- [ ] **ADM-RSP-02 ≤900px.** Layout for phones.
  - Notes (L140-155): the sidebar becomes a top block with a sideways-scrolling nav. The "Admin" heading and the who block are hidden. The foot links sit in a row. The whole page scrolls instead of `main`. The dialog facts grid has 2 columns.
- [ ] **ADM-RSP-03 Reduced motion.** Transitions are turned off (L156).

> Not on this page: `GET /api/admin/email-preview` (server L1151) and `POST /api/admin/test-email` (server L1165) exist, but nothing in `web/` calls them. They are API-only today. Adding them to React would be a new feature, not parity.

## 15. Earn admin: `web/earn-admin.html`

The Earn admin: campaigns (create, edit, cover, go live, pause, end, delete), the clip review queue with bulk
actions, clippers, payouts with a CSV export, and the YouTube key. One HTML file with an inline script; no
placeholders.

**How it is served.** `GET /admin/earn` and `GET /admin/earn/<anything>` (server L440-444), admins only, like
section 14. It is served whether or not this copy has Earn. The page handles `/admin/earn[/overview|campaigns|review|
clippers|payouts|settings]` itself. Modes: see section 14. Numbers, money and dates are always written the Indian
way ("1,00,000", en-IN), whatever the browser's language (Q-98).

IDs use the prefix `EADM-` and these areas: SRV, HDR (shell), NAV (routing), OVR (overview), CAMP (campaign table),
FORM (create and edit), COV (cover image), SUBM (review queue), BULK, YT (YouTube views), CLIP (clippers), PAY
(payouts), SET (settings), ERR, RSP (responsive).

### Serving (SRV)
- [ ] **EADM-SRV-01 Admin-only page.** Admins get the Earn admin. Everyone else gets 404.
  - Trigger: GET `/admin/earn`, `/admin/earn/{rest}` · API: server L440-444, Gate L149-152 · Notes: the page is served even when this copy has no Earn; there is no `earn_link()` check.
- [ ] **EADM-SRV-02 Page metadata.** `<title>Earn admin · ClipCrest</title>`, robots noindex, favicon (L5-8).

### Shell (HDR)
- [ ] **EADM-HDR-01 Sidebar.** Logo `/brand/logo-light.svg` (alt "ClipCrest"), heading "Earn", then the nav (L119-122).
- [ ] **EADM-HDR-02 Nav.** Six links with icons: Overview, Campaigns, Review clips, Clippers, Payouts, Settings.
  - Notes: hrefs `/admin/earn/<tab>`. Overview's link is `/admin/earn/overview`. The active link is `on` (L152-157, L174).
- [ ] **EADM-HDR-03 Nav badges.** "Review clips" shows `summary.pending`. "Payouts" shows `summary.owed_people`. No badge when 0 (L173-174).
- [ ] **EADM-HDR-04 Foot links.** Three links (L123-127):
  - "Open the Earn page": `/earn`, opens in a new tab
  - "Admin dashboard": `/admin`
  - "Back to the app": `/app`
  - The page has no sign-out and no display of who is signed in.
- [ ] **EADM-HDR-05 Title and subtitle per tab.** Exact strings (L152-157, L175):
  - Overview: "Campaigns, clips waiting for review, and money owed"
  - Campaigns: "Create campaigns, set budgets and rates, and go live"
  - Review clips: "Check each clip, set its views, then approve or reject it"
  - Clippers: "Everyone who signed up: payout details, account handles and campaigns"
  - Payouts: "What each clipper is owed, and the record of what was sent"
  - Settings: "The YouTube key that counts views automatically"
- [ ] **EADM-HDR-06 Top-bar action per tab.** (L176-178)
  - Overview and Campaigns: `button[data-act=new]` "+ New campaign" (primary)
  - Review clips: "Refresh YouTube views"
  - Payouts: link "Download CSV" to `/api/admin/earn/owed.csv`
  - Clippers and Settings: none

### Routing (NAV)
- [ ] **EADM-NAV-01 Tab from the URL.** `pathname.split("/")[3]`. Empty or unknown means Overview, but the URL is kept (L158-159).
- [ ] **EADM-NAV-02 Switching tabs.** Clicking any `[data-tab]` (nav links and the Overview "Add key" button) runs `go()`.
  - Notes: it clears the selection, always pushes `/admin/earn/<tab>` onto history, draws straight away (cached data or "Loading…"), then loads. Errors show as a toast (L364, L368).
- [ ] **EADM-NAV-03 Back and forward.** `popstate` reads the tab from the path and loads (L365).
- [ ] **EADM-NAV-04 Data per tab.** Every load fetches the summary and campaigns together.
  - Notes (L355-363): Review also fetches the queue. Payouts fetches what is owed. Clippers fetches the clipper list. Settings fetches `/api/public` for `mail`.
- [ ] **EADM-NAV-05 No polling.** Data refreshes only after an action or a tab switch.

### Overview (OVR)
- [ ] **EADM-OVR-01 YouTube key warning.** Shown when `!summary.settings.youtube_ready`.
  - Notes: text "No YouTube API key yet, so YouTube views have to be typed in by hand. Adding a key takes 2 minutes." The "Add key" button opens Settings (L191).
- [ ] **EADM-OVR-02 KPI tiles.** (L192-193)
  - "Waiting for review" (dark tile): `pending`
  - "Owed to clippers": `inr(owed_total)`
  - "Paid out, all time": `overview.paid_out`
  - "Open budget": `overview.live_budget`
- [ ] **EADM-OVR-03 "Campaigns" card.** The first 6 campaigns in server order, using the campaign table (L194).
- [ ] **EADM-OVR-04 "Clips by status" card.** Counts for pending, approved, paid and rejected, each labelled with its status chip (L195).

### Campaign table and row actions (CAMP)
- [ ] **EADM-CAMP-01 Campaigns tab.** All campaigns in one card (L214).
- [ ] **EADM-CAMP-02 Empty state.** "No campaigns yet", then "Create one, set the budget and rate, and go live." (L200)
- [ ] **EADM-CAMP-03 Columns.** Campaign / Status / Rate / Budget used / Clippers / Clips / To review / (actions) (L201).
- [ ] **EADM-CAMP-04 Campaign cell.** Bold title, with "`{creator_name} · /earn#c={slug}`" below (L202).
- [ ] **EADM-CAMP-05 Status chip.** Plus a note when the campaign is not taking clips.
  - Notes (L180-186, L203):
    - Chip text: Draft, Coming soon, Live, Paused, Ended.
    - When status is live but the campaign is not open, an orange line reads "`Not open yet: {why}`". The reason is one of:
      - "`opens {d MMM, h:mm}. Clippers see it as locked until then`"
      - "the budget is used up"
      - "the end date has passed"
    - Coming soon adds "Shown locked on the site".
- [ ] **EADM-CAMP-06 Rate.** "`₹{rate}/1K`" (L204).
- [ ] **EADM-CAMP-07 Budget meter.** Bar width is `used_pct`%, with "`₹{committed} of ₹{budget}`" below (L205).
- [ ] **EADM-CAMP-08 Clippers and Clips counts.** Uses `num()` in en-IN format (L206).
- [ ] **EADM-CAMP-09 "N to review" button.** Opens Review filtered to this campaign, on Pending. Shows "—" when 0 (L207, L380).
- [ ] **EADM-CAMP-10 "Go live" / "Pause".** "Go live" (primary) whenever the status is not live; "Pause" when it is live.
  - API: `PUT /api/admin/earn/campaigns/{id} {status}` (L209)
- [ ] **EADM-CAMP-11 "End".** Shown unless the status is already ended. Sends `{status:"ended"}` (L210).
- [ ] **EADM-CAMP-12 Status change toasts.** (L375-378)
  - state open: "Live and open. Clippers can join now." (good)
  - state starts: "`Live. It opens {when}, and shows locked until then.`" (plain)
  - otherwise: "`Campaign is now {paused|ended|live|coming soon|draft}.`" (good)
- [ ] **EADM-CAMP-13 "Edit".** Opens the form filled with this campaign (L211, L373).
- [ ] **EADM-CAMP-14 "View".** Link to `/earn#c={slug}` in a new tab (L212).
- [ ] **EADM-CAMP-15 Order.** Open campaigns first, then live, soon, paused, draft, ended; then more clippers, more clips, more remaining budget (`earn.py` L375-377).
- [ ] **EADM-CAMP-16 Status change errors.** Toast "Set a budget and a rate before going live." (`earn.py` L265-266).
- [ ] **EADM-CAMP-17 Auto-end.** Approving the clip that uses up the budget sets a live campaign to ended (`earn.py` L793-794). The table then shows Ended.

### Create and edit form (FORM)
- [ ] **EADM-FORM-01 Side sheet.** A panel on the right over a dark backdrop. Heading "New campaign" from "+ New campaign", or "Edit campaign" from Edit (L221).
- [ ] **EADM-FORM-02 Header buttons.** "Delete" (red, edit only), "Cancel", and "Save" (primary). Save sits outside the form and submits it through `form="cf"` (L222).
- [ ] **EADM-FORM-03 Closing.** "Cancel" or a click on the backdrop itself. There is no Escape key. Unsaved changes are dropped without a warning (L374).
- [ ] **EADM-FORM-04 "The campaign" section.** Field names and placeholders (L224-230):
  - "Campaign name *" `title`, required, placeholder "GTA 6 Launch"
  - "Creator or brand" `creator_name`
  - "Creator's channel link" `creator_url`, placeholder "https://youtube.com/@creator"
  - "Category" `category`, default "Gaming"
  - "One-line pitch" `tagline`, maxlength 200
  - "Brief" `brief` textarea
- [ ] **EADM-FORM-05 Rules and sources.** Two text areas.
  - Notes:
    - "Rules (one per line)" `rules`. A new campaign starts with 6 default lines (L218): "Hook the viewer in the first 2 seconds, with text on screen" / "Burned-in captions, readable on a phone" / "Credit the creator and link their channel in the caption" / "No in-game radio or copyrighted music" / "No big story spoilers in the hook or thumbnail" / "No botted or bought views".
    - "Streams and footage (one link per line)" `sources`, with hint "Only clippers who joined can see these."
    - Edit mode fills both from `raw_rules` and `raw_sources` (L231-232).
- [ ] **EADM-FORM-06 Platforms.** Section "Where and how clips are checked". "Platforms that pay" checkboxes YouTube, Instagram, X, TikTok; new campaigns start with the first three ticked (L219, L233-234).
- [ ] **EADM-FORM-07 Tag and hold days.** Two fields (L235-236):
  - "Required in the caption" `required_tag`, placeholder "@creatorhandle", hint "Checked automatically on YouTube."
  - "Days before views are counted" `hold_days`, number 0-60, default 7
- [ ] **EADM-FORM-08 "Money" section.** Four number fields (L237-241):
  - "Total budget for clippers (₹) *" `budget`, min 0, step 1, default 45000
  - "Rate per 1,000 views (₹) *" `rate_per_1k`, min 0, step 0.5, default 20
  - "Minimum views for a clip to earn" `min_views`, default 1000
  - "Most one clip can earn (₹, 0 = no limit)" `max_per_clip`, default 0
- [ ] **EADM-FORM-09 Live budget preview.** `#mathPrev` updates on every keystroke in the form.
  - Notes (L242, L254-258, L423):
    - "`This budget pays for about {budget/rate*1000} views. A clip with 50,000 views earns ₹{min(50*rate, cap or no cap)}. The campaign closes by itself when the budget is used up.`"
    - With rate 0: "Set a rate to see what the budget buys."
    - With the defaults it reads "22,50,000" views and "₹1,000".
- [ ] **EADM-FORM-10 "Dates and look".** Dates and status.
  - Notes (L216, L243-247):
    - "Starts" `starts_at` and "Ends" `ends_at`, both `datetime-local` in local time, converted to and from seconds since 1970.
    - "Status" `status` select: Draft (hidden) / Coming soon (shown locked) / Live / Paused / Ended. New campaigns default to Draft.
    - Hint: "Live opens at the start time. Leave Starts empty to open right away."
- [ ] **EADM-FORM-11 Accent colour.** "Accent colour (used when there's no cover)" `accent`, a colour picker, default #3EE0CF (L248).
- [ ] **EADM-FORM-12 Cover field.** "Cover image (16:9)". The behaviour differs for new and edit; see COV (L249).
- [ ] **EADM-FORM-13 What Save sends.** The form fields become a JSON object.
  - Notes (L431-441):
    - `platforms` becomes an array of the ticked values.
    - Dates are seconds since 1970, or null.
    - Numbers are sent as strings.
    - `cover_new` is removed.
    - New: `POST /api/admin/earn/campaigns`. Edit: `PUT …/{id}`.
- [ ] **EADM-FORM-14 Browser checks.** Native validation runs before submit: `required` on the title, and min/max/step on the number fields (e.g. 0-60 days, rate in steps of 0.5).
- [ ] **EADM-FORM-15 Server checks.** Error toasts from `earn.py` L218-276:
  - "Give the campaign a name of at least 3 letters."
  - "Pick at least one platform."
  - "`{Field} must be a number.`" / "`{Field} must be between 0 and {max}.`" (Rate per 1,000 views up to 100000; Most per clip 1e+08; Budget 1e+09; Days before views are counted 60)
  - "The end date must be after the start date."
  - "Unknown status."
  - "Set a budget and a rate before going live."
  - "That campaign doesn't exist."
- [ ] **EADM-FORM-16 Success.** (L443-445)
  - New: toast "Campaign created and live." or "Campaign created. Press Go live when it's ready." (good). The data reloads and the form reopens as Edit for the new campaign.
  - Edit: toast "Saved." and the form closes.
- [ ] **EADM-FORM-17 Delete.** Confirm, then delete the campaign.
  - API: `DELETE /api/admin/earn/campaigns/{id}` · Notes:
    - The browser's own `confirm()`: "Delete this campaign and every clip sent to it? This can't be undone."
    - Afterwards the form closes, toast "Deleted.", and the data reloads.
    - Error: "Clips in this campaign have already been paid, so it can't be deleted. End it instead." (L379, `earn.py` L279-284)
- [ ] **EADM-FORM-18 Server clean-up.** `creator_url` without a scheme gets "https://" in front. An accent that is not `#RRGGBB` is ignored. Text fields are cut to set lengths. The slug comes from the title, e.g. "gta-6-launch", with "-2" etc. when taken (`earn.py` L206-257).

### Cover image (COV)
- [ ] **EADM-COV-01 Cover on a new campaign.** Uploaded after the campaign is saved.
  - Notes: `input[type=file][name=cover_new]` accepts png, jpeg and webp, hint "Uploaded when you press Save.". After the campaign is created it sends `POST …/{id}/cover` as multipart field `file`. On failure it toasts "`Saved, but the cover didn't upload: {msg}`" (L249, L440-442).
- [ ] **EADM-COV-02 Cover on an existing campaign.** Uploaded as soon as a file is picked.
  - Notes: `input[type=file][data-cover={id}]`. On change it uploads, toasts "Cover saved." (good), reloads, and redraws the form from server data (L249, L417-420).
- [ ] **EADM-COV-03 Cover preview.** An `img.cover-prev` below the form, src `/earn/cover/{id}.jpg?v={updated_at}`, when the campaign has a cover (L250).
- [ ] **EADM-COV-04 Cover errors.** Error toasts.
  - Notes: HTTP 413 (gate limit 9 MB, server L113-114) or 502 on any upload: "That file is too big. Use an image under 8 MB." (L166). Server: "That image is too big. The limit is 8 MB.", "Use a PNG, JPG or WEBP image.", "That image is too large.", "That file isn't an image ClipCrest can read. Use a PNG or JPG." (`earn.py` L472-491)

### Review queue (SUBM)
- [ ] **EADM-SUBM-01 Loading.** Text "Loading…" until the queue loads (L297).
- [ ] **EADM-SUBM-02 Status segment.** Buttons Pending (default), Approved, Paid, Rejected, All.
  - API: `GET /api/admin/earn/submissions?status=…&campaign=…&q=…`; All sends `status=` · Notes: each button shows its raw count, counted within the chosen campaign. All has no count. Changing status clears the selection (L300, L355, L381).
- [ ] **EADM-SUBM-03 Campaign filter.** `select.inp[data-act=qcamp]` with "All campaigns" plus every title. Changing it reloads the queue (L301, L412).
- [ ] **EADM-SUBM-04 Search.** `#qsearch`, placeholder "Search clipper or link".
  - Notes: searched on the server (email, display name, URL). Waits 350 ms after typing stops, then puts focus and the caret back at the end (L302, L424).
- [ ] **EADM-SUBM-05 Columns.** [select-all box] / Clipper / Clip / Cross-check / Views / Earns / Proof / Status / (actions) (L304).
- [ ] **EADM-SUBM-06 Row checkbox.** Pending rows only, `input[data-sel={id}]`. Ticking it adds the clip to the selection and redraws (L306, L411).
- [ ] **EADM-SUBM-07 Clipper cell.** (L307)
  - Bold name, else the email prefix
  - The email
  - "`{handle} · {WhatsApp link to wa.me/<digits>}`" or "`… · no WhatsApp`"
- [ ] **EADM-SUBM-08 Clip cell.** (L308)
  - Link "`{YouTube|Instagram|X|TikTok} ↗ {url without https:// and www.}`" in a new tab; any non-http URL becomes `#`
  - "`{campaign} · sent {Nm|Nh|Nd ago}`", plus "` · posted {date}`" when known
  - The clipper's note in quotes, when given
- [ ] **EADM-SUBM-09 Cross-check chips.** (L291-295)
  - Owner: "✓ Owner" (green), "✕ Owner" (red) or "? Owner" (grey), with a tooltip from `owner_detail`
  - Posting time: "✓ On time" or "✕ Early"; nothing when unknown
  - Tag: "✓ Tag" or "✕ No tag"
  - The YouTube video title when known, with a tooltip
- [ ] **EADM-SUBM-10 Views.** Editable while pending.
  - API: `POST /api/admin/earn/submissions/{id}/views {views}` · Notes (L310, L413-416):
    - Pending rows have a number input `.vin[data-views]` (min 0). Changing it saves, toasts "Views saved.", and reloads the queue only.
    - Other rows show the number.
    - Caption under it: "`from YouTube {ago}`", "typed in" or "not counted yet".
- [ ] **EADM-SUBM-11 Earns.** `₹amount` for approved and paid clips. Otherwise "`~₹{estimate}`" (L311).
- [ ] **EADM-SUBM-12 Proof screenshot.** When there is one, a 44px thumbnail links to `/api/earn/proof/{id}` (new tab, lazy-loaded). Otherwise "not needed" for YouTube or "none yet" (L312).
- [ ] **EADM-SUBM-13 Status.** (L313)
  - Pending: chip "Ready", or "Holding" with tooltip "`Views are counted {date}`" when the hold days have not passed yet
  - Others: the status chip
  - The review note in small text below
- [ ] **EADM-SUBM-14 Approve.** Green "Approve" button.
  - API: `POST /api/admin/earn/submissions/{id} {action:"approve", note:"", views:<input>}` · Notes: toast "`Approved: ₹{amount}`" (good). The clip leaves the selection and the data reloads (L314, L382-390).
- [ ] **EADM-SUBM-15 Reject.** Red "Reject" button.
  - Notes: browser `prompt()` "Why isn't it approved? The clipper sees this." with the default answer "Doesn't follow the campaign rules.". Cancel does nothing. Toast "Rejected." (L384, L388)
- [ ] **EADM-SUBM-16 "Back to review".** Shown for approved and rejected clips. Sends `{action:"reopen"}`, toast "Back in review." (L315)
- [ ] **EADM-SUBM-17 Paid clips.** No action buttons (L315).
- [ ] **EADM-SUBM-18 Empty.** Heading "Nothing here".
  - Notes: on Pending: "No clips are waiting for review."; otherwise "No clips match." (L316)
- [ ] **EADM-SUBM-19 Server errors.** Error toasts (`earn.py` L725-804):
  - "This clip has already been paid."
  - "The budget for this campaign is used up. Raise the budget to approve more clips."
  - "Views of an approved clip can't change. Move it back to review first."
  - "Views must be between 0 and 5e+10." (not a typo: the bound is printed with `:g`, so "5e+10")
  - "Views must be a number."
  - "That clip doesn't exist."
  - "Unknown action."
- [ ] **EADM-SUBM-20 Money rules.** The amount is `views/1000*rate`, capped by `max_per_clip` and by the budget left. Under `min_views` it earns ₹0. Approve and reject notify the clipper (`earn.py` L294-300, server L809-832).
- [ ] **EADM-SUBM-21 Limit.** The queue shows at most 1000 rows, newest first (`earn.py` L713).

### Bulk actions (BULK)
- [ ] **EADM-BULK-01 Select all.** The header `input[data-act=selall]` adds or removes every pending row in the current list (L304, L399).
- [ ] **EADM-BULK-02 Bulk bar.** Appears at the bottom while anything is selected. (L317)
  - "`{N} selected`"
  - "Approves with the views shown in each row"
  - Buttons "Approve selected" (green), "Reject selected", "Clear"
- [ ] **EADM-BULK-03 Approve selected.** Saves views, then approves in one request.
  - API: one `POST …/{sid}/views` per selected row that is on screen, then `POST /api/admin/earn/submissions/bulk {ids, action:"approve", note:""}` · Notes: toast "`{done} done`" (good), or "`{done} done. #{id}: {problem}`" (bad). Clears the selection and reloads (L391-397).
- [ ] **EADM-BULK-04 Reject selected.** Browser `prompt()` "Reason shown to the clippers:", default "Doesn't follow the campaign rules.". Cancel does nothing. Typed views are also saved first (L393-394).
- [ ] **EADM-BULK-05 Clear.** Empties the selection (L398).
- [ ] **EADM-BULK-06 When the selection resets.** Cleared on a tab switch, a status change, and after a bulk action. Kept when the campaign filter or search changes. A single approve or reject removes only that clip (L364, L381, L389, L396).
- [ ] **EADM-BULK-07 Server caps.** At most 500 ids and 20 problems per request (server L1795-1801).

### YouTube view refresh (YT)
- [ ] **EADM-YT-01 "Refresh YouTube views".** Asks YouTube for fresh counts.
  - API: `POST /api/admin/earn/refresh {}` · Notes: toast "`{n} YouTube clips updated.`" (good), then the data reloads. With no key: "Add a YouTube API key in Earn settings first." (L177, L400; server L1823-1828)
- [ ] **EADM-YT-02 Background refresh (server only, for information).** About every 20 minutes the server refreshes pending YouTube clips older than 3 h (`earn.py` L737-760, server L902-914). Nothing on the page shows this.

### Clippers (CLIP)
- [ ] **EADM-CLIP-01 Loading.** Text "Loading…" until the list loads (L266).
- [ ] **EADM-CLIP-02 KPI tiles.** "Signed up", "Email confirmed", "Payout profile done" (highlighted), "In a campaign" (L270-273).
- [ ] **EADM-CLIP-03 Search.** `input#cq`, placeholder "Search name, email, UPI, WhatsApp or handle".
  - Notes: searched in the browser, instantly, keeping the caret. Also matches city. Shows "`{n} of {total}`" (L267-268, L275, L426-430).
- [ ] **EADM-CLIP-04 Columns.** Clipper / WhatsApp / UPI / Accounts / Campaigns / Clips / Views / Owed / Paid (L276).
- [ ] **EADM-CLIP-05 Clipper cell.** Bold name or "—". Chips "Email not confirmed" and "No payout profile". Below: "`{email} · {city}`" (L278-279).
- [ ] **EADM-CLIP-06 WhatsApp.** A `wa.me/<digits>` link in a new tab, or "—" (L280).
- [ ] **EADM-CLIP-07 UPI.** The UPI id, or "—" (L281).
- [ ] **EADM-CLIP-08 Accounts.** One link per handle, labelled "YT", "IG", "X" or "TT".
  - Notes: youtube.com/@h, instagram.com/h, x.com/h, tiktok.com/@h, in a new tab. "—" when there are none (L262-264, L282).
- [ ] **EADM-CLIP-09 Campaigns.** Titles of the campaigns they joined, one per line, or "—" (L283).
- [ ] **EADM-CLIP-10 Numbers.** Clips, plus "`{n} to review`" in orange; Views; Owed (₹); Paid (₹) (L284-285).
- [ ] **EADM-CLIP-11 Empty.** "No one yet", then "People who sign up on the Earn page show up here with their payout details and accounts." (L286)
- [ ] **EADM-CLIP-12 Who is listed.** Every account on the site, admins included, newest first, at most 2000 (`earn.py` L416-451). "Payout profile done" needs WhatsApp, UPI and at least one handle.

### Payouts (PAY)
- [ ] **EADM-PAY-01 Loading.** Text "Loading…" until the data loads (L322).
- [ ] **EADM-PAY-02 "Owed now" card.** Table columns: Clipper / UPI ID / WhatsApp / Clips / Views / Amount / (action) (L323).
- [ ] **EADM-PAY-03 UPI cell and Copy.** The UPI shows as code, or "missing". The "Copy" button copies it to the clipboard and toasts "UPI ID copied." (L324-325, L401)
- [ ] **EADM-PAY-04 Other cells.** WhatsApp link or "—"; clips; views; amount in large text (L326-327).
- [ ] **EADM-PAY-05 "Mark paid".** Records a payout after the money is sent.
  - API: `POST /api/admin/earn/payouts {user_id, ref}` · Notes:
    - Browser `prompt()`: "`Send ₹{amt} to {name or email} from your UPI app first.\n\nThen paste the UTR / transaction reference here:`"
    - Cancel does nothing. An empty answer is accepted.
    - Toast "`Recorded ₹{amount} for {clips} clips.`" (good), then the data reloads (L328, L402-406).
- [ ] **EADM-PAY-06 Info note.** Text: "Send the money from your UPI app first, then press **Mark paid** and paste the UTR number. The clipper gets a notification." (L329)
- [ ] **EADM-PAY-07 Nothing owed.** "Nobody is owed anything", then "Approved clips show up here." (L330)
- [ ] **EADM-PAY-08 "Sent" card.** Columns Date / Clipper / UPI / Clips / UTR / reference / Amount. Empty: "No payouts yet" (L331-333).
- [ ] **EADM-PAY-09 Download CSV.** A plain link that downloads `clipcrest-payouts-YYYY-MM-DD.csv`.
  - Notes: header row `Name,Email,WhatsApp,UPI,Clips,Views,Amount (INR)`. Cells starting with `=`, `+`, `-` or `@` get a leading `'` so spreadsheets do not run them (server L1843-1847, `earn.py` L847-861).
- [ ] **EADM-PAY-10 Server rules.** "Nothing is owed to this clipper." The reference is cut to letters, digits, `-`, `/` and spaces, at most 80 characters. The clipper gets a notification (`earn.py` L821-834).

### Settings (SET)
- [ ] **EADM-SET-01 YouTube key card.** Heading "YouTube API key", plus a paragraph explaining what the key does (L339-340).
- [ ] **EADM-SET-02 Key status note.** (L341)
  - Key set: "`A key is set ({…last4}), read from .env. Views refresh by themselves.`" The ", read from .env" part appears only when the key comes from the environment.
  - No key: "No key yet." (warn)
- [ ] **EADM-SET-03 Save the key.** Form `#ytf`: `input[name=key]`, placeholder "AIza…", autocomplete off, button "Save and test".
  - API: `PUT /api/admin/earn/settings {youtube_key}` · Notes: toast "Key works and is saved." (good), then the data reloads (L342, L447).
- [ ] **EADM-SET-04 "Remove".** Shown only when a key is set and it did not come from `.env`. Sends an empty key with no confirmation and toasts "Key removed." (L342, L407)
- [ ] **EADM-SET-05 Key errors.** Error toasts (`earn.py` L74-77, L158-172):
  - "That doesn't look like a YouTube API key. It is about 39 letters and numbers, starting with AIza."
  - "YouTube couldn't be reached. Try again in a minute."
  - "Today's YouTube API quota is used up. It resets at midnight Pacific time."
  - "YouTube refused the API key. Check it in Earn settings."
  - "`YouTube answered with an error ({code}).`"
- [ ] **EADM-SET-06 Setup steps.** A numbered list of 3 steps. The first links to console.cloud.google.com in a new tab (L343-345).
- [ ] **EADM-SET-07 Email card.** Heading "Email confirmation (sign-up codes)", with a paragraph naming the `CLIPCREST_SMTP_*`, `CLIPCREST_MAIL_FROM` and `CLIPCREST_VERIFY_EMAIL` settings.
  - API: `GET /api/public` `.mail` · Notes: the note reads "Email sending is set up." (info) or "Email sending isn't set up yet, so confirmation emails can't go out." (warn) (L346-347, L361).

### Errors, loading, toasts (ERR)
- [ ] **EADM-ERR-01 Loading.** "Loading…" until summary and campaigns arrive (L351-353, L450-451).
- [ ] **EADM-ERR-02 Error text.** Uses the server's `detail`, else "Something went wrong.". This page never redirects on 401 or 404; it just shows "Not Found" or "Please sign in." (L161-169).
- [ ] **EADM-ERR-03 Load failures.** Only a toast. The view stays on "Loading…" or the old data (L364, L451).
- [ ] **EADM-ERR-04 Toasts.** One at a time; a new one replaces the old. Bottom centre, 4 s. Plain is dark, `good` is green, `bad` is red (L107-108, L170).
- [ ] **EADM-ERR-05 Escaping.** All server text goes through `esc()`. URLs go through `safeUrl` (L137, L140).

### Responsive (RSP)
- [ ] **EADM-RSP-01 ≤900px.** The sidebar becomes a wrapping row of tabs. Logo, the "Earn" heading and the foot links are hidden. KPIs in 2 columns, form grids in 1 column, smaller side padding (L113).
- [ ] **EADM-RSP-02 ≤700px.** KPIs in 2 columns, and tables and cards scroll sideways (L114).

## 16. Shared scripts: `gradient-ascii.js` and `ascii.js`

- [ ] **GA-01 GradientASCII.** An animated WebGL2 gradient drawn as ASCII characters, behind the hero on the app's Home, the landing page and Earn.
  - Trigger: `GradientASCII(host, options)` returns a stop function (`web/gradient-ascii.js` L445-470, exported as `window.GradientASCII` at L854) · Notes: used by `index.html` (loaded at L850, started at L1366 with `{colors: ["#c6f432", "#ffffff", "#dcf98a", "#ebfbb8", "#f7fde6"], shape: "horizon", lightMode: true, cellSize: 16, density: 0.8, glyphOpacity: 0.26, gradientOpacity: 0.32, glow: 0.06, grain: 0.06, mouseInteraction: false, clickEffect: "none"}`, stopped when leaving Home), by `landing.html` (L28, L415-416, same options) and by `earn.html` (loaded at L18, started at L1057-1058 on `#ga` with a dark palette: `{colors: ["#c6f432", "#1e1612", "#4e6b00", "#2c221d", "#c6f432"], shape: "horizon", lightMode: false, cellSize: 16, density: 0.7, glyphOpacity: 0.22, gradientOpacity: 0.28, glow: 0.05, grain: 0.05, mouseInteraction: false, clickEffect: "none"}`). It pauses while off screen or while the tab is hidden (L815-827), draws still frames with reduced motion (L551, L763), and quietly draws nothing when WebGL2 is missing (L510-520). Its default font is Inter, which is why the pages load Inter 300. Port note: wrap it in one React component whose clean-up calls the stop function.
- [ ] **GA-02 `ascii.js` is not used by any page.** An older canvas effect ("PeakAscii", 98 lines).
  - Trigger: none · Notes: it is still served at `/assets/ascii.js`, and `tests/test_abuse.py` L70 requests that address as an "open to everyone" check. Deleting the file means changing that test (Q-27).

## 17. Parity test scenarios

Each scenario is one end-to-end test. Together they cover every checklist item; the "Covers" line lists the IDs.
Run them against the old page first (they must pass there, except where a quirk is marked as fixed in the port),
then against the React page.

### 17.1 Set-up shared by all scenarios

**A throwaway server.** Start `python -m studio.server` (or `uv run python -m studio.server`) with an empty temporary
data folder and nothing that reaches the internet, the way `tests/run.py` L23-30 does:

```
CLIPCREST_DATA=<new temp folder>   CLIPCREST_PORT=8799   CLIPCREST_PUBLIC_URL=http://127.0.0.1:8799
CLIPCREST_FETCH_MODEL=0   CLIPCREST_UPDATE_CHECK=0   CLIPCREST_AUTO_RELOAD=0   DATABASE_URL=
CLIPCREST_SMTP_HOST=   CLIPCREST_AI_KEY=   CLIPCREST_AI_KEY_FILE=   CLIPCREST_AI_MODELS=
GOOGLE_CLIENT_ID=   GOOGLE_CLIENT_SECRET=   GOOGLE_CLIENT_FILE=
```

Wait for `GET /healthz`. Variants used below:

| Name | Extra settings | For |
|---|---|---|
| **OFF** | none (sign-in off, the default) | the single-owner app |
| **ON** | `CLIPCREST_ACCOUNTS=1` | sign-in, several users |
| **ON+V** | ON plus `CLIPCREST_VERIFY_EMAIL=1` | email codes |
| **EARN-LOCAL** | OFF plus `CLIPCREST_LOCAL_EARN=1` | Earn links in the app |
| **EARN-ONLY** | ON plus `CLIPCREST_EARN_ONLY=1` | the public Earn website |
| **SMALL** | add `CLIPCREST_UPLOAD_PART_MB=5`, `CLIPCREST_MAX_UPLOAD_MB=64`, `CLIPCREST_MAX_JOBS_PER_USER=2` | upload pieces and batch limits |
| **FULL-DISK** | add `CLIPCREST_MIN_FREE_DISK_GB=100000` | the drive-full banner, for real |

**Test data that needs no network.**
- Accounts: sign up through `POST /api/auth/signup` (send `Origin: <base>`; 8 an hour per address) or in Python
  (`from studio import auth, db; db.init(); auth.signup(email, password, name)`), with the server's settings.
- Admin: `python -m studio.admin grant <email>` with the same `CLIPCREST_DATA`. With sign-in off the owner already
  is the admin.
- Email codes and reset links: with no mail set up, the server prints them to its log as
  `[ClipCrest mail] <subject> for <email>: <link>  (code 123456)` (`studio/mailer.py` L96). Read the newest one.
- A tiny video: `ffmpeg -f lavfi -i testsrc=duration=5:size=640x360:rate=25 -f lavfi -i sine=frequency=440:duration=5 -shortest -c:v libx264 -pix_fmt yuv420p -c:a aac tiny.mp4`.
  For piece uploads any file of the right size works, because the server only checks the name and size before
  joining the pieces (for example `fsutil file createnew big.mp4 12582912` on Windows,
  `head -c 12582912 /dev/urandom > big.mp4` elsewhere).
- A creator without network: `POST /api/creators {"name": "Test"}` with no channel.
- **Fixtures for states the server cannot reach offline.** Finished clips need the speech model and real video, and
  live streams need the internet. For those, answer the page's reads with fixed JSON using Playwright's
  `page.route`: `/api/sync*` (jobs in every state: queued; running at step 2 with `fetching`; running at step 4 with
  clips `rendering`, `done` and `error`; done with clips and posts; done with no clips; failed; a live recording with
  `live` data), `/api/overview`, `/api/usage`, `/api/notifications`, `/api/storage`, and a patched `/api/status`
  (`no_ffmpeg`, `disk_full`, `ai.problem`, `update`, `user.verified`, `user.google`). Answer `/media/**` with a small
  JPG or MP4 from disk. Intercept writes (`DELETE`, `POST`, `PUT`) and assert on the request body instead of letting
  them through, where the real call would need the network. Keep the fixture files under `tests/` so both the old
  and the React page are tested against the same data.

**Browser settings.** Block `fonts.googleapis.com`, `fonts.gstatic.com`, `player.twitch.tv`,
`www.youtube-nocookie.com`, `player.kick.com` and every other outside host with `page.route(..., route.abort())`.
Pin the locale (`en-US`) and the time zone. Use `reducedMotion: 'reduce'` unless the scenario is about motion. Use
`page.clock` for timers (polling, 1.5-second read, 7-second toasts, 20-second refresh). Handle the browser's own
`confirm()` and `prompt()` with `page.on('dialog')`. Grant `clipboard-read` and `clipboard-write` where text is
copied. Prefer role and text selectors (`getByRole('button', {name: 'Make clips'})`, `getByText('No videos yet')`);
fall back to the `data-act` attribute only where the old page has no accessible name.

**Cannot run offline, and what to check instead.**
- Real link previews and video downloads (YouTube, Twitch, Kick): mock `/api/preview` and check the request; a real
  `POST /api/jobs` is accepted offline but the job then fails at download, which is itself the failed-video state.
- Clip making (speech model, ffmpeg) and live recording: use the sync fixtures; check the real upload request only.
- Players: check each iframe's `src` and that it is blocked, not that video plays.
- Posting to YouTube, Instagram, TikTok and connecting accounts (OAuth): check the `/oauth/<p>/start` link and the
  `?connected=` / `?connect_error=` messages (APP-ROUTE-10) by opening those addresses directly.
- The AI: with no key the "not set up" states are real; for "ready" and "answered" states patch `/api/status`,
  `/api/ai` and `/api/ai/test`.
- Real email: read codes and links from the server log.
- Opening a folder window and the folder picker (Storage): check that the button exists on 127.0.0.1 and intercept
  the call.

### 17.2 The app (`index.html`)

- `SCN-01` **First start with sign-in off (OFF).** Open `http://127.0.0.1:<port>/`: it redirects to `/app`. The
  tour starts by itself: check all 8 titles, "N of 8", the progress bar, Back hidden on step 1, ArrowRight and
  ArrowLeft, Tab staying inside the card, the spotlight ring on steps 2 to 7, "Start clipping" on step 8. Close with
  Esc: `PUT /api/settings {"tour_done": true}` is sent once and the link box has focus. Reload: no tour. Open it again
  from the account menu ("Take the tour") while on All videos: it moves to Home first.
  Covers APP-SHELL-02, APP-TOUR-01..07, APP-KEY-04, APP-ROUTE-01.
- `SCN-02` **The shell (OFF).** With `page.clock` set to 09:00, Home shows "Home" and "Good morning. 0 creators.".
  Check the logo, "Home" highlighted with a filled icon, "All videos" with no badge, "Creators", "New creator", the AI
  card "Not set up", the me button "Settings" / "AI key, connected apps", the bell without a badge, no "Owner"
  section, no Earn item. "Star on GitHub" and "Follow me" open in a new tab with the configured addresses (and the
  LinkedIn icon). Scroll the main panel: the top bar gets its line. Collapse the sidebar, reload: still collapsed,
  `localStorage.mini === "1"`; tooltips carry the labels; expand again. Settings and AI usage have no top-bar buttons.
  Covers APP-SHELL-01, APP-SHELL-03, APP-SHELL-04, APP-SHELL-10, APP-NAV-01..04, APP-NAV-06, APP-NAV-08,
  APP-NAV-10..12, APP-NAV-14, APP-TOP-01, APP-TOP-02, APP-TOP-06, APP-TOP-07.
- `SCN-03` **Phone size (OFF, 375×812).** The menu button opens the drawer, the scrim closes it, choosing "All videos"
  closes it; the collapse button is hidden. The Home post-queue table (fixture with posts) shows labelled stacked
  rows; "Make clips" is full width; the clip grid has two columns (fixture). Repeat at 1100, 900, 760 and 560 px
  wide and compare screenshots between the old and the React page.
  Covers APP-NAV-13, APP-SHELL-09, APP-HOME-08 (phone layout).
- `SCN-04` **Banners in priority order (OFF, patched `/api/status`).** With nothing patched: the AI-not-set-up banner
  for the owner ("Add your AI key ...") with "Add AI key" going to `/app/settings/ai`; it is absent on AI usage and the
  button is absent on Settings. Patch, one at a time and then together, `user.verified=false`, `update`
  (`behind: 3`), `ai.problem`, `disk_full`, `no_ffmpeg`: each shows its exact text and the one with the highest
  priority wins. Update: "How to update" opens the dialog (notes list, two "Copy" buttons → "Copied" and the clipboard
  text, GitHub link with a new-tab target); "Later" stores `clipcrest_update_seen` and hides the banner; a newer
  `latest` shows it again; `restart: true` shows "The new version is downloaded ..." and "What's new". Esc closes the
  dialog. Also run once on the FULL-DISK server without patching to see the real drive-full banner and "Open Storage".
  Covers APP-ERR-01..06, APP-UPD-01..03, APP-KEY-05.
- `SCN-05` **Confirm the email (ON+V).** Sign up on `/signup`; `/app` shows the code banner. "Confirm" with "12" shows
  the server's error and selects the field; "Send a new code" says the code went to the server log (no mail set up);
  a fourth resend inside 15 minutes shows the throttle message. Paste a video link (mock `/api/preview`) and press
  Make clips: the row shows "Confirm your email first ...". Enter the newest code from the log and press Enter:
  "Email confirmed. You're ready to clip." and the banner is gone.
  Covers APP-ERR-05, APP-KEY-06, APP-COMP-25.
- `SCN-06` **Addresses (OFF, then ON with a normal user).** Open each address in the routing table directly and check
  the view and tab; `/app/videos/` with a slash works; `/app/nonsense` shows Home; `/app/creators/nope` shows Home.
  Move Home → All videos → a creator → its Setup tab → Settings → AI usage, then Back and Forward through all of
  them (the creator tab changes do not add entries). Open `/app?connected=youtube&name=Chan`, `?connect_error=Boom`,
  `?verified=1`, `?verify_error=Bad` and check each toast and that the query is gone. As a normal user,
  `/app/settings/ai` shows the first tab that user may see (Profile). After leaving Home,
  `window._gaStop` is null. Port note: also check Q-02 and Q-04 are fixed.
  Reloading `/app` after visiting a creator still opens Home (the `view` key is not used).
  Covers APP-ROUTE-01..10, APP-ROUTE-12.
- `SCN-07` **Link from the landing page (ON).** Signed out, paste a YouTube link in the landing page's hero bar and
  press "Get clips": the browser goes to `/signup` and `sessionStorage.clipcrest_link` holds the link. Sign up: `/app`
  shows Home with the link in the box (mocked preview row), the toast "Your link is ready. Press Make clips.", and
  the key is removed.
  Covers LAND-05, AUTH-06, AUTH-07, APP-ROUTE-11.
- `SCN-08` **Recognising links (OFF, SMALL, mocked `/api/preview`).** Type `https://www.twitch.tv/somebody`: the
  channel note. Type `hello there friend`: "Paste a full YouTube, Twitch or Kick video link."; `hello`: no note. Paste
  `https://www.youtube.com/watch?v=dQw4w9WgXcQ`: taken at once, the box empties, a loading row, then a ready row with
  thumbnail, length, title, uploader and "Ready". Type `https://kick.com/a/videos/` slowly: nothing until 900ms after
  the last key; press Enter on another link: taken at once. Paste the same link again: ignored. Fill the batch (2):
  "You can send up to 2 videos at a time. Remove one first.". A preview answering 422 shows a red row with the reason;
  aborting the first preview request but not the retry still gives a ready row; aborting both gives "Couldn't reach
  ClipCrest ...". A preview with `is_live: true` shows "Live now" and no length. ✕ removes rows; the placeholder
  reads "Paste another link" while rows exist; "Add another video" with "1 of 2" focuses the box and shows its toast
  when the box is empty, and opens the file chooser when it is not. Leave Home for All videos and back: Home's rows
  are still there, All videos has its own empty list.
  Covers APP-COMP-01..11, APP-COMP-22, APP-KEY-03.
- `SCN-09` **Options and the creator picker (OFF, one creator "Test" with captions off).** Open "Options": the chip is
  highlighted and `aria-expanded="true"`. Press − on "How many" down to 1 and + on "Longest" up to 180: they stop
  there. Untick "Generate captions": the style tiles are disabled. Pick Hype, Fill screen, 1080p, From 2 To 5. Open
  the creator picker with ArrowDown, move with the arrows, Esc closes and returns focus; pick "Test": captions stay
  as the user set them; reload, pick "Test" first: captions switch off. "New creator" in the picker opens that
  dialog. Press Make clips with an intercepted `POST /api/jobs`: the body has `max_clips: 1`, `max_len: 180`,
  `captions`, `style: "hype"`, `layout: "crop"`, `quality: 1080`, `range_start: 120`, `range_end: 300` and the
  creator id. On the creator's own page the composer has no picker and its defaults come from the creator.
  Covers APP-COMP-12..21, APP-COMP-24, APP-KEY-02.
- `SCN-10` **Starting videos (OFF, mocked preview).** Paste a link whose preview is held back, press Make clips:
  "Finding video…" and the toast "Finding the video first ..."; release the preview: the job request goes out by
  itself. With an intercepted `POST /api/jobs` answering 200: "Your video is being clipped now." and the page moves
  to All videos (to the creator when one was picked). Answering 429 with a detail: the row turns red with it, and
  "Nothing was started. The reason is shown on the video.". Send a real `POST /api/jobs` (no interception): accepted;
  the job appears in All videos and later fails at download, showing its error and "Report this" (APP-VID-09).
  Covers APP-COMP-22, APP-COMP-23, APP-COMP-25, APP-HOME-09.
- `SCN-11` **Upload a small video (OFF).** "Upload video" opens the file chooser; choose `tiny.mp4`: the row shows a
  still, "0:05", "1 MB · uploaded file", "Ready". Choose a `.txt` file: "<name> is not a video file.". Press Make
  clips: one `POST /api/upload` with `file`, `options` and `creator`; the pill counts up and the row leaves the list;
  All videos shows the job with its progress bar and steps, then (no speech model) its error with "Report this".
  While sending, ✕ is hidden and the button reads "Sending…".
  Covers APP-UPL-01, APP-UPL-03, APP-UPL-04, APP-UPL-05, APP-UPL-07, APP-UPL-09, APP-UPL-10, APP-VID-01, APP-VID-04,
  APP-VID-06, APP-VID-07, APP-VID-09.
- `SCN-12` **Upload in pieces (OFF, SMALL).** Choose a 12 MB `big.mp4`: requests are `POST /api/upload/start`, three
  `PUT /api/upload/<id>/<n>` (at most two at once), then `POST .../finish`. Abort one piece once: it is sent again.
  Answer one piece with 400 and a detail: `DELETE /api/upload/<id>` is sent and the row shows the detail in red. Choose
  a 70 MB file: "big.mp4 is over the 64 MB limit.". Answer the start with 401: the browser goes to `/login`.
  Covers APP-UPL-03, APP-UPL-06, APP-UPL-07, APP-UPL-08, APP-ERR-07.
- `SCN-13` **Drag and drop (OFF).** Dispatch `dragover` with a `DataTransfer` holding `tiny.mp4` over the page: the
  composer is highlighted; `dragleave` removes it; `drop` adds the file row.
  Covers APP-UPL-02.
- `SCN-14` **Every video and clip state (OFF, sync fixture).** Check, against the fixture: the "N working" badge;
  queued and running headers; the four steps with done times, the current stage and its clock counting each second;
  "Downloading the video: ..." and "M of N clips made · K being made now · F could not be made"; a finished video's
  thumbnail, length and details line (creator name only on All videos); "Download all", delete and select controls
  only when finished; the AI note; a done-but-empty video's stage text; clip cards with cover, play button, score
  badges (80+, 60+, "Hand"), length, hook ("Untitled clip" when empty), title, the three "not ready" texts, the error
  card, post pills (posted with link, failed with tooltip, scheduled time; cancelled hidden). A live recording on All
  videos shows the live card. The empty states with an empty fixture.
  Walk through every empty state listed in APP-ERR-11 with empty fixtures.
  Covers APP-VID-02..04, APP-VID-06..17, APP-VID-21, APP-NAV-04, APP-SYNC-10, APP-ERR-11, APP-ERR-12.
- `SCN-15` **Clip and video actions (OFF, sync fixture, writes intercepted).** "Copy post text": the clipboard holds
  title, description and hashtags; "Post text copied". Download links end in `?download=1`. Delete a clip: the
  confirm texts, Cancel sends nothing, OK sends `DELETE /api/jobs/<j>/clips/<c>`, "Clip deleted". Delete a video:
  its confirm and "Deleted". Tick two clips and a video: the bar reads "N selected"; ticking the video unticks its
  clips; "Download K clips" navigates to `/api/clips.zip?ids=...` (intercepted); "Select all"; "Delete" shows the
  combined sentence and sends `POST /api/bulk/delete` with `videos` and `clips` pairs; an answer with `skipped: 2`
  adds ". 2 still being made were left alone."; "Cancel" clears. A fixture with 151 done clips: "That is a lot at
  once ...". Selecting only unfinished clips: "None of those clips are ready to download yet.".
  Covers APP-VID-05, APP-VID-17..20, APP-SHELL-05.
- `SCN-16` **Clip dialog (OFF, sync fixture with two accounts, writes intercepted).** Open a done clip: the video
  plays with its poster; the badge "Words N · Reaction M"; the reason; every field holds the clip's values; unticking
  "Generate captions" disables the style. Change the hook and press "Save and re-make clip": the render body has all
  eight fields with numbers as numbers; "Re-making the clip…". "Post now" without accounts ticked: "Tick at least one
  account first."; with one ticked: the confirm, then `POST /api/posts` with `now: true`, "Posting now"; "Add to
  queue": `now: false`. Footer buttons as in the card. Type in Title, then let a sync bump the clip's version: the
  player reloads but the typed title stays. Close with ✕, Esc and a backdrop click. Remove the clip from the next
  sync: the dialog closes. A fixture with no accounts shows "No accounts connected yet. Connect one in Settings.".
  Covers APP-CLIP-01..09.
- `SCN-17` **Creators (OFF; `/api/channel-preview` mocked; channel saves intercepted where they would go online).**
  New creator: type a channel link: the skeleton, then the mocked picture, name and followers, and the Name field
  filled; type a name yourself, change the link: the name stays; an error preview shows red. Create without a channel:
  "Workspace created", the Setup tab. Setup: Connect with an empty field ("Paste their YouTube channel link."); with
  `twitch.tv/x`: the PUT body has `https://twitch.tv/x`. Change "Most live clips per hour": the save bar; "Discard"
  restores it with "Changes discarded"; change it again and "Save changes": the PUT has every field, "Saved". The cost
  hint follows "Check the live stream every". Tick "Record automatically": saved at once. Tick "Post new clips
  automatically": the confirm; Cancel unticks. Account boxes (fixture accounts) save at once. Activity tab: the empty
  text, then (fixture) the log lines with times. Delete the creator: typing the wrong name keeps the button disabled;
  the right name deletes, goes Home, "Creator deleted". The tab counts and the sliding pill follow.
  Covers APP-CRE-01..14, APP-SHELL-06, APP-TOP-04, APP-NAV-07, APP-NAV-08.
- `SCN-18` **Live (OFF opened at `localhost` and at `127.0.0.1`; sync fixture of a creator live on Twitch and Kick;
  writes intercepted).** At `localhost` the player iframe's `src` is the Twitch player with `parent=localhost`; the
  platform buttons switch it to Kick; the details show "Live on Twitch", title, name, "N watching", "live for",
  followers. At `127.0.0.1` the Twitch card shows "Twitch only plays inside sites with a web address" and "Watch on
  Twitch". The sidebar shows "Live", the avatar ring, the badge "Live on Twitch · N watching", the button "Record live
  stream". "Record this stream": "Starting…", the request body has the channel, the job is added, "Recording started.
  ...". Switch to another creator before the answer arrives: "Recording started for <name>.". A creator with no
  channel: "Start recording" opens Setup with "Connect one of their channels first ...". Live card (fixture): the
  stats, meters and decisions; "Clip last 30s" sends `{seconds: 30}`; the frequency drop-down sends `ai_every_min`
  and says "AI checks every 5 min"; "Stop" asks, then shows "Stopped by you" at once and sends the stop. Hide the
  tab for over a minute (page.clock) and show it: the iframe reloads.
  Covers APP-LIVE-01..14, APP-TOP-03, APP-TOP-05, APP-NAV-07.
- `SCN-19` **Home with data (OFF, overview fixture).** Tiles (including " · 2 failed"), the chart's bars and hover
  titles, "Today" label, KPIs, "$" earnings, the AI card for ready and not-ready states, the creators table (status
  pills, auto-post, numbers), the post queue (pills, links, errors, "None", "–"). "Pause all posting" sends
  `{paused: true}` and the subtitle and button change; "Cancel" and "Retry" send their calls and reload the overview.
  With `page.clock`, an unchanged sync after 20 seconds reloads the overview. The empty chart text with a zero
  fixture.
  Covers APP-HOME-01..05, APP-HOME-07, APP-HOME-08, APP-SYNC-05.
- `SCN-20` **Next steps (OFF, real empty server).** All four steps show except auto-record; "Add your first creator"
  opens the dialog; "Make your first clips" focuses the link box; "Connect a posting account" opens Settings (Q-08);
  with a creator, "Turn on auto-record" opens its Setup. With everything done the card is gone.
  Covers APP-HOME-06.
- `SCN-21` **AI settings (OFF).** `/app/settings/ai`: "Not set up", the service list, the key hint with the provider's
  link, the Address field hidden until "custom" is chosen. "Find models" offline shows the server's error; with a
  mocked answer it fills the suggestions and says "N models found ...". "Save and test" sends `PUT /api/ai` then
  `POST /api/ai/test` (fails offline: "Saved, but the test failed. ..."); with the test mocked: "Saved. <model>
  answered, so the AI is ready." and "Test again" appears. Switching to another service clears model and address.
  Covers APP-SET-01..09.
- `SCN-22` **Profile, password, sign-out, delete (ON).** Profile shows name, email, "Confirmed", "Email and
  password", "Standard", the join date. Security: wrong current password shows the server's error; a right one shows
  "Password changed. Other devices were signed out."; "Forgot it?" links to `/reset`. Patch `/api/status` to
  `google: true, has_password: false`: the Google text and "Set password". "Sign out" (Security and the account menu)
  sends the logout and lands on `/`. Delete account: the typed email (any case) enables the button; the account is
  gone and the browser is on `/`.
  Covers APP-SET-10..13, APP-ACCT-04, APP-SHELL-06.
- `SCN-23` **Connected apps (OFF as owner, then ON as a normal user).** Three cards with their texts. Owner: "Set up"
  opens the YouTube panel (`GET /api/apps`) with the steps, the redirect address and "Copy"; Instagram and TikTok show
  the https warning on an http server; type an id and secret and "Save": "Saved. People can connect now." and the card
  now has "Connect" linking to `/oauth/youtube/start`, plus the ⚙ button. A sync fixture with an account shows it
  under its card; "Disconnect" asks and sends `DELETE /api/accounts/<id>`. A normal user sees "Not set up on this
  server" on the other cards and no ⚙.
  Covers APP-SET-14..17.
- `SCN-24` **Storage (OFF at 127.0.0.1, storage fixture).** The path, "Open folder" (call intercepted), the bar and
  numbers; `full: true` shows the warning and a red bar; `pending` shows the note and "Undo" (`PUT {cancel: true}`,
  "Kept the current folder"); `fixed: true` shows the `.env` sentence and no button. "Change folder", "Browse"
  (intercepted answer fills the field), "Use this folder" sends `{path, move: true}` and says "Saved. Close
  ClipCrest ...". Against the real server: the folder shows as fixed, because the throwaway server sets
  `CLIPCREST_DATA`.
  Covers APP-SET-18..23, APP-ERR-02.
- `SCN-25` **AI usage (OFF; real, then usage fixture).** Real: the not-set-up note and zero tiles, "No AI used in the
  last 30 days", "Nothing yet.", "No AI calls yet.". Fixture: tiles, chart labels and hover titles, both bar lists,
  the recent table with "None" for unfiled calls; the sidebar AI card updates from it.
  Covers APP-USE-01..06.
- `SCN-26` **Notifications (OFF, fixtures, `page.clock`).** Status `unread: 12`: the badge reads "9+". Open the bell:
  "Loading…", then the list with one item per kind (icons), times ("just now", "5 min ago", "3 h ago", a date), unread
  dots; after 1.5 s `POST /api/notifications/read` and the badge clears. "Mark all as read" sends the same call.
  Clicking an `/app/...` notification navigates in the page; an `/earn#me` one loads that page. Esc and an outside
  click close the panel. Empty list and error texts. Pop-ups: a fresh browser stores the newest id without showing
  anything; raise `unread` and add three new items: three cards appear with the chime (stub `AudioContext` and count
  calls), clicking one navigates, ✕ closes one, the rest close after 7 s.
  Covers APP-BELL-01..08, APP-NAV-12, APP-KEY-01, APP-TOAST-03, APP-ROUTE-13.
- `SCN-27` **Account menu, feedback and toasts (ON, then a server with `CLIPCREST_REPO_URL=` and
  `CLIPCREST_FOLLOW_URL=`).** The menu shows name and email, "Settings", "AI usage", "Take the tour", "Send feedback",
  "Sign out". "Send feedback" opens `<repo>/issues/new` in a new tab. Make any action fail (intercepted 400): the red
  toast stays 7 s and its "Report" copies the message and opens the issues page. Without links: no "Send feedback",
  and "Report" says "Copy this message and send it to the person who runs this ClipCrest.". With Earn on and no repo
  link, Home shows "₹ Earn money".
  Covers APP-ACCT-01..03, APP-FB-01, APP-FB-02, APP-TOAST-01, APP-TOAST-02, APP-TOP-06, APP-EARN-03.
- `SCN-28` **Earn and admin links (EARN-LOCAL; then ON with an admin).** EARN-LOCAL: the sidebar's "Earn" opens
  `/earn` in a new tab; a done clip's money icon with a posted URL opens `/earn#submit=<url>` in a new tab with
  "Opening Earn to send this clip"; without a post URL the prompt appears and an empty answer does nothing; the
  dialog's "Send to a campaign" does the same. On OFF none of these exist. ON as admin: "Owner", "Admin dashboard" →
  `/admin`, "Earn campaigns" → `/admin/earn`; as a normal user none of them, and none of the admin-only parts listed
  in APP-ADML-03.
  Covers APP-EARN-01..04, APP-ADML-01..03, APP-NAV-05, APP-NAV-09.
- `SCN-29` **Polling (OFF, `page.clock`, counting requests).** Idle: one `/api/sync` every 4 s with the last `v`;
  with a running job in the fixture: every 2 s; with a creator that has a channel but no picture: every 1 s; with the
  page hidden: every 20 s; showing the page or focusing the window asks at once. An unchanged answer (`{v}`) leaves
  the DOM untouched; a changed one redraws. `/api/status` every 15 s. Aborted sync requests show nothing and polling
  continues. Restart the real server on the same data: the page picks up the new token and redraws without a reload.
  Covers APP-SYNC-01..11, APP-ERR-08, APP-ERR-09.
- `SCN-30` **Errors (OFF and ON).** A sync answered 401 sends the page to `/login` (ON). An action answered 500 with a
  detail shows it in red and the button works again. `/api/storage` answered 500: the Settings section shows the
  error. `context.setOffline(true)`: actions show the browser's network error (Q-12), polling is silent; back online
  everything recovers. `/api/status` failing at start: see Q-11.
  Covers APP-ERR-07, APP-ERR-08, APP-ERR-10, APP-ERR-14, APP-SHELL-07, APP-SET-03.
- `SCN-31` **Keyboard only (OFF).** Reach and use the composer, the picker, Options, Make clips, the bell, the account
  menu, a confirm dialog and the tour with the keyboard alone; check every key listed in APP-KEY.
  Covers APP-KEY-01..06.
- `SCN-32` **Earn-only website (EARN-ONLY).** A normal user opening `/app` lands on `/earn#me`; an admin gets the app.
  A normal user's `POST /api/creators` answers 403 with the Earn-only sentence.
  Covers APP-ERR-13.
- `SCN-33` **Reduced motion and visuals (OFF).** With `reducedMotion: 'reduce'` nothing animates (tour, tabs pill,
  attachments); with `no-preference` the tab pill slides and the attachment list grows. Hover a button, nav item and
  chip: only colours change (compare bounding boxes before and after).
  Covers APP-SHELL-08, APP-SHELL-10.

### 17.3 Landing, sign-in, reset and legal pages

- `SCN-34` **Landing page (ON, signed out).** The HTML contains no `{{`; canonical and `og:url` use the public
  address; the three JSON-LD blocks parse. Header links scroll to their sections; the line under the header appears
  when scrolled. Earn pieces are visible (sign-in on always has Earn) and point at `/earn`. Hero text, the link bar,
  "Upload a video" to `/signup`, the three promises, three demo videos with posters and captions and the credit note,
  the platforms strip, Open source with the GitHub link, How it works (the third video plays only when scrolled into
  view), Features, the five "Who it's for" tabs (click each; `aria-selected` follows), the FAQ (first open), the
  closing bar, the footer with this year. At 375 px wide: no header links, no "Sign in", only the middle demo video.
  Every section becomes visible when scrolled to.
  Covers LAND-01..11, LAND-13, LAND-15..19.
- `SCN-35` **Landing in other modes.** OFF: `/` goes to `/app`; `/clip-maker` shows the page with "Open ClipCrest" and
  no Earn pieces; EARN-LOCAL shows them. ON, signed in: "Sign in" gone, "Open ClipCrest" → `/app`, link bars go to
  `/app`. EARN-ONLY: `/` is Earn; `/clip-maker` has "Download free" and "How to install" instead of link bars,
  "Start earning", the changed closing sentence, and "Download" in the header instead of "Who it's for" and
  "Open source".
  Covers LAND-03, LAND-12, LAND-14.
- `SCN-36` **Sign in and sign up (ON).** `/login` and `/signup` show their own title, heading, text, button, fields,
  hint and switch link. No Google button (no keys); with `/api/public` answering `google: true` it appears with
  `next` in its link. The eye button shows and hides the password. Empty submit: "Enter your email and password."
  without a request. A wrong password: the server's message in the red box and the button enabled again. Sign up:
  lands on `/app`. `/login?next=/app/videos` lands there; `?next=//evil.example` lands on `/app`. `?error=google`
  shows its message. Signed in, `/login` redirects to `/app`; on OFF both redirect to `/app`. Below 861 px the side
  panel is replaced by the small logo.
  Covers AUTH-01..09.
- `SCN-37` **Password reset (ON).** `/reset`: empty → "Enter your email."; any email → the "If there's an account ..."
  message (same for an unknown address). Take the link from the server log and open it: "Choose a new password";
  7 characters → "Use at least 8 characters."; different twice → "The two passwords don't match."; a broken token
  → the server's message; a good pair signs in and lands on `/app`. "Back to sign in" goes to `/login`. On OFF,
  `/reset` redirects to `/app`.
  Covers RST-01..04.
- `SCN-38` **Legal pages (ON, with `CLIPCREST_CONTACT_EMAIL`, `CLIPCREST_LEGAL_NAME`, `CLIPCREST_LEGAL_COUNTRY` set,
  then unset).** Each address shows its article, title, canonical address and green tab; no `{{` remains; the
  contact is a `mailto:` link (or the fallback sentence); the name and law follow the settings. Clicking "Privacy"
  in the header switches without a reload (title and address change), Back returns to Terms, Ctrl+click opens
  normally. The footer links and year.
  Covers LEGAL-01..06.
- `SCN-39` **Shared scripts.** Home, the landing page and Earn each get a `.gradient-ascii-container` inside their
  hero background (or nothing and no error when WebGL2 is disabled); leaving Home stops it. `/assets/ascii.js`
  answers 200.
  Covers GA-01, GA-02.

### 17.4 Earn (`earn.html`)

These come from the Earn inventory. IDs in their "Covers" lines drop the `EARN-` prefix. The server recipes below
match section 17.1: Recipe M is ON (with `CLIPCREST_DOWNLOAD_URL=https://example.com/dl.zip`), Recipe V is ON+V,
Recipe E is EARN-ONLY, Recipe L is EARN-LOCAL.

#### Server recipes (all offline, empty data folder)

- **Recipe M (multi-user):** start `python -m studio.server` with the environment from `tests/run.py` L23-30: `CLIPCREST_DATA=<new temp folder>`, `CLIPCREST_PORT=8799`, `CLIPCREST_PUBLIC_URL=http://127.0.0.1:8799`, `CLIPCREST_ACCOUNTS=1`, `CLIPCREST_FETCH_MODEL=0`, `CLIPCREST_UPDATE_CHECK=0`, `CLIPCREST_AUTO_RELOAD=0`, `DATABASE_URL=`, `CLIPCREST_SMTP_HOST=`, `CLIPCREST_AI_KEY=`, `CLIPCREST_VERIFY_EMAIL=0`, `CLIPCREST_DOWNLOAD_URL=https://example.com/dl.zip`. Wait for `/healthz`.
- **Recipe V (email codes):** Recipe M with `CLIPCREST_VERIFY_EMAIL=1` and stdout sent to a log. The code is printed there; read it with `for <email>: \S+  \(code (\d{6})\)` (tests/test_otp.py L29-31).
- **Recipe E (Earn-only):** Recipe M plus `CLIPCREST_EARN_ONLY=1` (as in tests/test_earn_only.py L20-22).
- **Recipe L (sign-in off):** `CLIPCREST_ACCOUNTS=0`, `CLIPCREST_LOCAL_EARN=1`, `CLIPCREST_EARN_URL=`. Open it by `127.0.0.1`. The owner is already an admin.
- **Recipe C:** any recipe plus `CLIPCREST_CONTACT_EMAIL=help@example.com`.

#### Seeding without network (Playwright `request` context or httpx; every write needs `Origin: <BASE>`)

1. **Admin account:** sign up the admin with `POST /api/auth/signup {email:"boss@example.com", password:"test-pass-123", name:"Boss"}`. Then run `python -m studio.admin grant boss@example.com` with the same `CLIPCREST_DATA`. Admin-area calls see the change at once; the Earn page's "Manage campaigns" may take up to 20s. In Recipe L, skip this step: the owner is already an admin.
2. **Campaigns:** create them with `POST /api/admin/earn/campaigns`. Write requests to the admin area must send `Origin` (server L153-156). Examples (t = now in seconds):
   - **Open:** `{"title":"GTA 6 Launch","creator_name":"Mizo","creator_url":"https://example.com/mizo","category":"Gaming","tagline":"Clip the launch","brief":"Clip GTA 6 streams.\nPost fast.","rules":"Hook in 2 seconds\nCredit the creator","sources":"https://youtube.com/@creator/live","platforms":["youtube","x","tiktok","instagram"],"required_tag":"@mizo","rate_per_1k":20,"min_views":1000,"max_per_clip":500,"budget":1000,"hold_days":7,"status":"live","starts_at":t-3600,"ends_at":t+3*86400+3600}`. Its slug is `gta-6-launch`.
   - **Soon:** `{"title":"Secret Drop","status":"soon"}`
   - **Starts later:** `{"title":"Next Week","status":"live","rate_per_1k":10,"budget":500,"starts_at":t+5*86400}`
   - **Paused:** `{"title":"On Hold","status":"paused","rate_per_1k":10,"budget":100}`
   - **Ended:** `{"title":"Old One","status":"ended","rate_per_1k":10,"budget":100}`
   - **Draft:** `{"title":"Secret draft","rate_per_1k":10,"budget":100}` (the default status is draft)
   - **Ready at once:** a second live campaign with `"hold_days":0`, which makes pending clips show "Ready for review".
   - **Full:** approve one clip (₹240), then `PUT /api/admin/earn/campaigns/{id} {"budget":240}`. Approving alone would end the campaign (earn.py L793-794).
   - **Cover:** `POST /api/admin/earn/campaigns/{id}/cover` with a multipart PNG (test_earn.py L41-45, L86).
3. **Clipper:** sign up, then `PUT /api/earn/profile {"upi":"ravi@okaxis","whatsapp":"98765 43210","x":"https://x.com/RaviClips","tiktok":"@ravi.clips","youtube":"youtube.com/@RaviShorts","instagram":"@ravi_ig"}`.
4. **Clips that need no network:**
   - X: `https://x.com/RaviClips/status/<id>` with `id = str(int(t*1000 - 1288834974657) << 22)` (test_earn.py L37-38)
   - TikTok: `https://www.tiktok.com/@ravi.clips/video/<int(t)<<32>`
   - Instagram: `https://www.instagram.com/reel/C1abcDEFgh/`
   - YouTube: `https://youtube.com/shorts/dQw4w9WgXcQ` (no YouTube key is set, so nothing is fetched)
5. **Admin review:**
   - views: `POST /api/admin/earn/submissions/{id}/views {"views":12000}`
   - approve or reject: `POST /api/admin/earn/submissions/{id} {"action":"approve"|"reject","note":"…","views":…}`
   - pay: `POST /api/admin/earn/payouts {"user_id":…, "ref":"UTR123456"}`
6. **States that need YouTube (DB-seeded):** "views from YouTube", "✓ Tag found" / "✕ Tag missing" and "✕ Not your account" only come from YouTube checks, which need a key and network. Seed them directly with the same `CLIPCREST_DATA`: `python -c "from studio import db; db.init(); import sqlalchemy as sa; e=db.earn_submissions; c=db.engine.begin().__enter__(); c.execute(e.update().where(e.c.id==N).values(views_source='api', checks='{\"owner\": false, \"after_start\": false, \"tag\": true}'))"` (or the same in a `with` block).

#### Playwright settings
- Block `fonts.googleapis.com`, `fonts.gstatic.com` and `example.com` with `page.route(..., abort)`.
- Use `reducedMotion: 'reduce'` except in SCN-59.
- Use web-first `expect(...).toHaveText` so count-ups settle.
- Money uses en-IN grouping (₹1,00,000) and dates use `d Mon` (e.g. "24 Nov").
- Selectors:
  - cards: `getByRole('button', {name: /GTA 6 Launch/})`
  - sheet: `getByRole('dialog', {name: 'GTA 6 Launch'})`
  - verify field: `getByLabel('6-digit code')`; sliders: `getByLabel('Views on one clip')`, `getByLabel('Clips a week')`
  - dashboard form labels are not tied to inputs, so use `getByPlaceholder('name@okaxis')` or `#profForm [name=upi]`, `#subForm [name=url]`, `select[name=campaign]`
  - tabs: `getByRole('button', {name: /^My clips/})`

#### Scenarios

- `SCN-40` **Empty site, signed out (M).**
   - Steps: open `/earn`; check the title, nav links and hrefs, Sign in and Start earning hrefs (`/login?next=%2Fearn`, `/signup?next=%2Fearn%23me`), and all four CTAs (`/signup?next=%2Fearn%23me`).
   - Hero: pill "LIVE" + "Paid clipping campaigns are open" → #campaigns; ticker "₹0", "₹0", "0", "0"; `#pot` hidden; chip "₹2,500" / "at ₹25 per 1K views".
   - Lists: campaigns empty text, leaderboard empty text.
   - Calculator: "50K", "5", "₹1,250", "₹26,900", "an example rate of ₹25 per 1,000 views", fine print "An estimate: what you're paid…".
   - Rest: `#me` hidden; `#dlBtn` reads "Open the clip maker" (href /app) and "How to install" is hidden; footer year; FAQ first item open; contact blocks hidden.
   - Covers: META-01..05, HDR-01..03, HERO-01..03, HERO-07, HERO-09..12, HOW-01..03, LIST-01, LIST-12, LB-01, LB-03, CALC-01..08, INFO-01, INFO-02, INFO-04..06, CTA-01, DASH-01, LOAD-01, LOAD-04, ROUTE-01, MODE-03.
- `SCN-41` **Contact shown (M+C).**
   - Steps: the "Still stuck?" box and the footer line show `mailto:help@example.com`.
   - Covers: INFO-03, INFO-06.
- `SCN-42` **Campaign list and hero with real numbers (M + seeded campaigns, cover on the open one).**
   - Order: open campaigns first, then soon, paused, ended (by status, then counts); "Secret draft" is absent.
   - Tags: "LIVE", "🔒 Coming soon", "🔒 Opens <date>", "Paused", "Ended", "Gaming".
   - Art: the open card's `img` src starts with `/earn/cover/`; the paused card shows initials; the soon card shows "Revealing soon"; locked cards have class `locked`.
   - Card text: rate "₹20" "per 1,000 views · up to ₹500 a clip"; "₹1,000 left" "of ₹1,000"; the four platform chip names; foot "0 clippers · 0 clips" and "3d 1h left"; no-rate card reads "Soon".
   - Hero: rate line "₹20 per 1,000 views · Up to ₹500 a clip · Paid to your UPI"; lede ends "100K views = ₹500."; pot "₹1,000" and "100% of the GTA 6 Launch budget still left"; chip "One clip can earn up to" "₹500" "₹20 per 1K views · GTA 6 Launch"; pill "GTA 6 Launch: ₹20 per 1K views" → `#c=gta-6-launch`; notes "Up to ₹500 a clip".
   - Calculator: "the GTA 6 Launch rate", fine print "₹20 per 1,000 views, up to ₹500 a clip, from 1,000 views. …".
   - Second live campaign: pot reads "Across 2 live campaigns".
   - Only a soon campaign: pill reads "SOON" "Coming soon: Secret Drop".
   - Covers: HERO-02, 04, 05, 06, 08, 10, 11, LIST-02..10, CALC-05, CALC-06.
- `SCN-43` **Calculator interaction.**
   - Example rate: views slider to 0 gives "1K", "₹25"; to 100 gives "10 L".
   - With the GTA campaign: views 100 and clips 30 give "₹500" and "₹64,500". A value below min_views (seed min_views 60000) gives "₹0".
   - Covers: CALC-02..04, CALC-07.
- `SCN-44` **Campaign sheet, signed out.**
   - Steps: click the card; check the dialog, URL hash `#c=gta-6-launch`, creator link, brief with line break, "Clip rules", "Required in your caption" "@mizo", locked sources text, "No clips yet. Yours could be first.", aside "₹20", facts (Platforms "YouTube, Instagram, X, TikTok", "Minimum views" "1,000", "Most per clip" "₹500", "7 days after posting", Starts, Ends, Clippers "0"), and "A clip with 50,000 views earns ₹500.".
   - Buttons: "Sign up to join" (`/signup?next=%2Fearn%23c%3Dgta-6-launch`) and "I have an account" (`/login?next=%2Fearn%23c%3Dgta-6-launch`).
   - Close: with the Close button (hash cleared, body overflow back), by clicking the backdrop, and with Escape. Clicking inside the panel does not close it.
   - Deep link `/earn#c=gta-6-launch` opens the sheet on load. `/earn#c=nope` gives a red toast "That campaign doesn't exist.".
   - Other states: soon gives "Sign up now, join when it opens"; starts gives disabled "🔒 Opens <date>"; paused gives "Paused for now"; ended gives "Not taking clips"; full (seeded) gives "Budget used up" plus the "Budget used up" tag.
   - Covers: CAMP-01..15, LIST-11, ROUTE-02, ROUTE-03, ERR-01, TOAST-01.
- `SCN-45` **Sign up and land on the dashboard.**
   - Steps: click "Start earning"; the auth page sends the user back to `/earn#me` (or sign up through the API and reuse the cookie).
   - Dashboard: "Hey <name>"; money cards "₹0", "~₹0", "₹0" "0 payouts", "0" "across 0 clips"; tab "Payout profile ⚠"; Send tab shows the profile warning; "Set it up" opens the Profile tab.
   - Nav and CTAs: nav "My earnings", "Sign out", "Open ClipCrest"; CTAs "Join GTA 6 Launch" with href `#c=gta-6-launch`; the page scrolled to `#me`.
   - Covers: DASH-01..05, HDR-04, CTA-02, ROUTE-04, SUB-01, LOAD-01, MODE-04.
- `SCN-46` **Payout profile.**
   - Errors: a bad UPI gives the UPI message; WhatsApp "123" gives the WhatsApp message; Instagram "bad handle!" gives "Your Instagram handle doesn't look right. Write it like @yourname.". The button is enabled again each time.
   - Save: valid values from the seed give the toast "Profile saved." and the Send tab opens; the ⚠ is gone.
   - Profile tab after saving shows "+919876543210", "@raviclips", "@ravishorts", "ravi@okaxis". The side box text is present.
   - Typing in a field, switching tab and back loses the change.
   - Covers: PROF-01..06, DASH-06, SUB-02 (shows "Join a campaign first. Open one below and press Join." and "See GTA 6 Launch").
- `SCN-47` **Join.**
   - Incomplete profile: the sheet button is "Set up payout profile", which closes the sheet and opens the Profile tab.
   - Complete profile: "Join campaign" gives the toast "You're in. Welcome to GTA 6 Launch."; the sheet shows "↗ https://youtube.com/@creator/live" and "Send a clip"; the card shows "✓ Joined".
   - The nav CTA still reads "Join GTA 6 Launch" until a reload, after which it reads "My earnings" (current behaviour, Q-31).
   - "Send a clip" picks the campaign and focuses the link field.
   - Covers: JOIN-01, JOIN-03, CAMP-09, CAMP-16, CAMP-17, LIST-04, CTA-02.
- `SCN-48` **Sending a clip.**
   - Badge: `foo` gives "That isn't a link."; `youtube.com/@x` gives "Copy the Share link of your Short."; `instagram.com/ravi` gives "Copy the reel's link, not your profile."; `x.com/a` gives "Copy the post's link."; `tiktok.com/@a` gives "Paste the full tiktok.com/@you/video/… link."; `example.com/v` gives "YouTube, Instagram, X and TikTok links only."; `x.com/someone_else/status/1` gives "This is @someone_else, not @raviclips"; a profile without TikTok gives "Add your TikTok handle in your profile"; your own X link gives "✓ X".
   - Send: an own X link gives "Clip sent. Your account is confirmed. Views are counted on <date>." and the My clips tab opens. An Instagram reel gives a toast without "Your account is confirmed.". Hold the route to see "Checking the clip…".
   - Refusals: a duplicate is refused ("That clip has already been sent in for this campaign."); someone else's X ("That clip isn't on the account in your profile (…"); a pre-start X ("…posted before the campaign started…"); example.com ("Links from YouTube, Instagram, X and TikTok are accepted."); a platform the campaign does not pay for ("This campaign doesn't pay for …"). Each time the button goes back to "Send clip for verification".
   - Side box reads "Views are counted 7 days after posting, automatically for YouTube" and "…paid to ravi@okaxis".
   - Covers: SUB-03..09.
- `SCN-49` **`#submit=` from the main app.**
    - (a) Signed out: `/earn#submit=<enc X url>` lands on a URL beginning `/signup?next=%2Fearn%23submit%3D`.
    - (b) Signed in, profile incomplete: Profile tab, toast "Set up your payout profile first, then send the clip.", hash `#me`.
    - (c) Profile complete and joined: Send tab, link field filled and focused, badge "✓ X", hash `#me`.
    - (d) Profile complete, not joined: info note, no toast. Join through "See GTA 6 Launch", then the Send tab shows the filled link.
    - (e) After saving the profile in (b), with a joined campaign, the Send tab shows the filled link.
    - Covers: SUB-10, ROUTE-05, ROUTE-02.
- `SCN-50` **My clips through the whole review cycle.**
    - Rows: X row shows "✓ Your account", "✓ On time", "~₹0", "Counting views · <date>", "Add proof", "Remove". Instagram row shows "Account: by hand". Link text "X · x.com/RaviClips/status/…", small "GTA 6 Launch · sent 1m ago".
    - Hold-days-0 campaign: "Ready for review".
    - Admin actions, then reload: views 12000 gives "12,000" and "~₹240"; approve gives "Approved · owed" and "₹240" with no Remove or Add proof; reject with note "No credit" gives "Not approved", "—", the red note "No credit"; pay gives "Paid".
    - Money cards update (Owed ₹240, then Paid).
    - Remove: dismissing the confirm keeps the row; accepting gives "Clip removed." and the row is gone. Removing a clip that was already reviewed (stale page) gives the server error.
    - Empty state before any clip.
    - DB-seeded row shows "✕ Not your account", "✕ Too early", "✓ Tag found", "· views from YouTube".
    - Covers: CLIPS-01..08, DASH-04.
- `SCN-51` **Proof screenshot.**
    - A PNG through `setInputFiles` on `[data-proof]` gives "Uploading the screenshot…", then "Proof added. A reviewer will check it."; the label becomes "Replace proof"; the "Proof" link has `href=/api/earn/proof/<id>` and `target=_blank`, and GET returns `image/jpeg`.
    - Junk bytes as .png give "That file isn't an image ClipCrest can read. Use a PNG or JPG.". A GIF gives "Use a PNG, JPG or WEBP image.". A body over 9 MB gives "That file is too big. Use an image under 8 MB.".
    - After approval, "Add proof" is gone but "Proof" stays.
    - Covers: PROOF-01..03, ERR-01.
- `SCN-52` **Payouts.**
    - Before: "No payouts yet…".
    - After the admin pays with "UTR123456": the tab badge "1"; the row shows the date (dd/mm/yyyy), the clip count, "ravi@okaxis", "UTR123456" and the amount; the card reads "Paid to you" "1 payout". A payout without a ref shows "—".
    - Covers: PAY-01, PAY-02, DASH-04, DASH-05.
- `SCN-53` **Leaderboard.**
    - With clips: the home table shows a row with the display name or the masked email ("ea•••••" for `earn-clipper@…` without a display name), views via `short`, and earned ₹. The sheet's mini leaderboard shows "1. <name>" "<n> views · ₹…". Rejected clips are left out.
    - At 900px the "Earned" column is hidden; at 375px "Clips" is hidden too.
    - Covers: LB-02, LB-04, CAMP-10.
- `SCN-54` **Email code (V).**
    - Banner text shows the email. "Confirm" with "12" gives "Enter the 6-digit code from the email."; a wrong code gives "That code isn't right…".
    - "Send a new code" gives "A new code is on its way. Check your spam folder too."; the 4th try within 15 min gives the "We've sent a few already…" toast.
    - Join while unconfirmed (complete profile) gives the red "Confirm your email first…".
    - The newest code from the log gives "Email confirmed. You're ready to earn." and the banner is gone. "Send a new code" from a stale tab then gives "Your email is already confirmed.".
    - Covers: VER-01..03, JOIN-02, MODE-07.
- `SCN-55` **Sign out.**
    - From the nav, the mobile menu and the dashboard: `POST /api/auth/logout` is seen and the page is back at `/earn` signed out.
    - Covers: HDR-10, DASH-03.
- `SCN-56` **Phone (375×812) and tablet (900px) layouts.**
    - Menu: the button toggles `aria-expanded` and `#mnav`; clicking "FAQ" closes the menu; signed-out menu buttons are "Sign in" and "Start earning", signed-in ones "My earnings" and "Sign out".
    - Phone bar: `#mbar` gets `.show` after scrolling past the hero, loses it at `#start`, and loses it with the sheet open (then scroll).
    - Tabs read "Send / Clips / Payouts / Profile ⚠". Table cells show `data-l` labels.
    - "Swipe for more →" is visible and the checks scroll sideways. The example chip is hidden.
    - Covers: HDR-07..09, MOB-01..03, CLIPS-09, LB-04, INFO-01.
- `SCN-57` **Earn-only (E).**
    - `/` serves the page ("Earn with ClipCrest").
    - Signed out: `#dlBtn` ("Download free"), `#heroDl`, `#finalDl` and `#mbarDl` have `href=https://example.com/dl.zip` and `target=_blank`. "How to install" is visible; clicking it opens a popup to the download URL (blocked) and shows the install toast.
    - Signed-in clipper: nav "Download clip maker" → #download, "Make clips" → #download, `/app` gives 303 to `/earn#me`.
    - Admin (granted): "Manage campaigns", "Open ClipCrest" → /app, "Make clips" → /app.
    - Covers: HOW-03, HOW-04, MODE-05, MODE-06, DASH-03, HDR-04.
- `SCN-58` **Sign-in off (L).**
    - `/earn` 200 with the dashboard visible at once: "Hey You", "Manage campaigns", nav "My earnings" / "Sign out" / "Open ClipCrest", no verify banner.
    - Download buttons go to the download URL with `target=_blank`, and "How to install" is visible.
    - Campaigns seeded straight through the admin API (Origin header) show the signed-in sheet buttons. A soon campaign shows the disabled "🔒 Coming soon" with the hint.
    - "Sign out" reloads and the user is still signed in.
    - Restart without LOCAL_EARN: `/earn` gives 404. With `CLIPCREST_EARN_URL=https://earn.example.com`: 303 to `https://earn.example.com/earn` (`follow_redirects=false`).
    - Covers: MODE-01, MODE-02, HDR-04, CAMP-15.
- `SCN-59` **Motion and toasts (reducedMotion `no-preference`).**
    - Reveal: below-the-fold `.reveal` items lack `.in` until scrolled into view, then have it.
    - Ticker ends at the overview values.
    - Toasts: a toast disappears after about 4.2s, and a second toast replaces the first.
    - With reducedMotion `reduce`, reveal content is visible at once.
    - Covers: MOT-01..03, MOB-04, TOAST-01.
- `SCN-60` **Failures.**
    - Answer `/api/earn/public/overview` with 500 `{"detail":"Boom"}`: red toast "Boom". A non-JSON 500 gives "Something went wrong. Try again.".
    - Answer `/api/earn/me` with 401 while overview reports a user: the page shows the signed-out view.
    - Covers: LOAD-05, LOAD-01, ERR-01, HDR-05 (the accounts-false variant needs Recipe L with a 401 on `/me`).

#### Cannot run offline, and what to check instead
- Real YouTube views, handle and tag checks: use the DB-seeded `views_source`/`checks` (SCN-50), and check that no request to googleapis is made.
- The real download target (GitHub): check the href and target only.
- Google Fonts: blocked; layout must still render.
- WebGL ASCII background: check only that `#ga` gets a `.gradient-ascii-container` child, or that the page has no console errors when WebGL is missing.
- The signup page itself (auth.html) is outside this page; seed sessions through the API if needed.

### 17.5 Admin dashboard and Earn admin

These come from the admin inventory. In their "Covers" lines an ID without a page prefix continues the prefix before
it (for example "ADM-HDR-01..03, NAV-01" means ADM-NAV-01).

**Common setup (Server A).** Start the server the way `tests/run.py` L22-34 does, on a spare port with a temporary data folder. Settings: `CLIPCREST_DATA=<tmp>`, `CLIPCREST_PORT=8797`, `CLIPCREST_PUBLIC_URL=http://127.0.0.1:8797`, `CLIPCREST_ACCOUNTS=1`, `CLIPCREST_VERIFY_EMAIL=1`, `CLIPCREST_FETCH_MODEL=0`, `CLIPCREST_UPDATE_CHECK=0`, `CLIPCREST_AUTO_RELOAD=0`, `DATABASE_URL=`, and these left empty: `CLIPCREST_SMTP_HOST`, `CLIPCREST_BREVO_API_KEY`, `CLIPCREST_MAIL_FROM`, `GOOGLE_CLIENT_*`, `CLIPCREST_AI_KEY`, `CLIPCREST_YOUTUBE_API_KEY`, `CLIPCREST_EARN_URL`, `CLIPCREST_LOCAL_EARN`. Open the pages at `127.0.0.1`.

**Seeding offline.** Run seeding scripts with the same settings as the server, as `tests/test_earn.py` L33-54 does.
- **Accounts:** sign-up over HTTP is limited to 8 per hour per IP (server L538). Seeding more than about 7 accounts per server run should use `python -c "from studio import auth, db; db.init(); u,_=auth.signup('bob@example.com','test-pass-123','Bob'); print(u.id)"`.
- **Admin:** `python -m studio.admin grant admin@example.com`. It exits 1 with "No account with the email …" when the account does not exist.
- **Verified email:** `auth.mark_verified(id)`.
- **Signing in from Playwright:** `request.post('/api/auth/login', {data:{email,password}, headers:{Origin: BASE}})` through the browser context, or the `/login` page. Login is limited to 8 per email per IP per 10 min.
- **Feedback:** sign in as the user and `POST /api/feedback {kind:"bug"|"idea"|"other", message (3-4000 chars), page, context}` with an Origin header. Limited to 10 per user per hour.
- **AI usage:** insert `db.usage` rows (`user_id, t, tokens_in, tokens_out, purpose`) with a small Python script.
- **Earn clipper:** sign up, mark verified, then as that user:
  - `PUT /api/earn/profile {upi:"ravi@okaxis", whatsapp:"9876543210", x:"@raviclips", tiktok:"@ravi.clips", instagram:"@ravi_ig", youtube:"@ravishorts"}`
  - `POST /api/earn/campaigns/{slug}/join`
  - `POST /api/earn/submissions {campaign, url}` with links built as in `test_earn.py` L37-38, L109-125:
    - X: `https://x.com/RaviClips/status/{x_id(now-60)}`
    - TikTok: `https://www.tiktok.com/@ravi.clips/video/{int(now-100)<<32}`
    - Instagram: `https://www.instagram.com/reel/C1abcDEFgh/`
    - YouTube: `https://youtube.com/shorts/dQw4w9WgXcQ` (accepted when there is no key)
  - Proof: `POST /api/earn/submissions/{id}/proof` with a PNG made in Pillow.
- **Chips that cannot be produced through the API** (✕ Owner, ✕ Early, ✓/✕ Tag, "from YouTube …"): write `earn_submissions.checks` JSON, `views_source='api'` and `views_at` directly with SQLAlchemy.
- **Test environment:** fix the Playwright locale (en-US) and timezone; earn-admin always formats in en-IN. Block `fonts.googleapis.com` and `fonts.gstatic.com` with `page.route` so no network is needed. Handle the browser's `confirm()` and `prompt()` dialogs with `page.on('dialog')`.
- **Selectors:** the old Earn form's labels are not tied to their inputs, so use `[name=title]` style selectors there. Elsewhere use roles and text: `getByRole('link',{name:'Users'})`, `getByRole('button',{name:'Refresh'})`, `getByRole('dialog')` for the native dialog, `getByPlaceholder('Search by name or email')`.

#### Admin scenarios

- `SCN-61` **Access control.** Signed out and as a plain user: GET `/admin`, `/admin/users`, `/admin/earn` return 404 with body `{"detail":"Not Found"}`. As admin they return 200 and the title "ClipCrest Admin". Covers ADM-SRV-01, SRV-02, SRV-03, EADM-SRV-01, SRV-02.
- `SCN-62` **Shell and navigation.** As admin, open `/admin`:
   - Check the "Loading…" state, then the h1 "Overview" and its subtitle, the "Refresh" button, the who block (name and email), and the links "Earn campaigns", "Back to the app", "Sign out".
   - Click Users, Feedback and Activity: the URL becomes `/admin/users` etc. and the title changes. Go back and forward.
   - Open `/admin/activity` directly. Open `/admin/xyz`: Overview shows.
   - The Users badge equals the total account count.
   - Covers ADM-HDR-01..03, 05..07, 09, NAV-01..03, 05, POLL-02, ERR-01.
- `SCN-63` **Overview with data.** Seed 4 users, one disabled through the API and one left unverified, and 5 usage rows on two days with two purposes. Check:
   - all 8 tile labels and small lines, including "1 admin"
   - each chart has `rect` bars and `title` text such as "YYYY-MM-DD: N"
   - "What the AI is used for" rows
   - pills: "No AI key" (red), "Transcription" (red), "Google sign-in" (red), "Email" (red), "sqlite", "GB free", "Has room" or "Near full…", "Processor", "GB memory free", "0 running, 0 waiting"
   - the no-AI-key note text
   - Covers ADM-OVR-01..05, 07..12.
- `SCN-64` **Overview with nothing used.** On a server with no usage rows, the AI usage and AI calls charts read "Nothing in the last 30 days" and the purposes card reads "Nothing yet.". Sign-ups always has the admin's own sign-up. Check the gridline labels and the "DD/MM" x labels. Covers ADM-OVR-06, OVR-07 (empty).
- `SCN-65` **Users list.**
   - Type part of an email: rows filter, the caret stays, and "N of M" updates.
   - Filters: "Email not confirmed" shows the unverified user; "Disabled"; "Admins".
   - Click the AI calls header: rows sort by it and the header colour changes.
   - Search for "zzz": "No accounts match" / "Try another search or filter.".
   - Check the pills, joined date, and "Now" in Last active.
   - Covers ADM-USR-01..07, 09; USR-08 is a code review only (2000-row cap).
- `SCN-66` **Account dialog.**
   - Click a user row: "Loading…", then the name, email and 8 facts. "Signed-in devices" is 1 after that user logged in.
   - The privacy note, purposes, and the Latest AI calls table. For a user with no usage: "No AI calls yet.".
   - An admin row shows no Disable or Delete.
   - "Close" closes it; Escape closes it.
   - While it is open, advance the clock 30 s with `page.clock` and check no overview request is made.
   - Covers ADM-UDLG-01..09.
- `SCN-67` **Disable and enable.** Open a user and click "Disable account". The confirm dialog shows the exact heading and text.
   - "Cancel": no request is made.
   - Again, "Disable account": toast "Account disabled", the "Disabled" pill appears, and that user's next API call gets 401.
   - Enable: "Enable this account?" / "Account enabled".
   - Activity shows "Disabled an account" and "Enabled an account" with the target's email.
   - Refusals through the API: disabling yourself gives "You can't disable your own account.".
   - Covers ADM-ACC-01..04, 07, LOG-02. **Check Q-59 by hand first:** the old page may never send the request.
- `SCN-68` **Delete.** Click "Delete account":
   - The `prompt` message matches. Cancel: nothing happens.
   - Answer "wrong@x": toast "Type the account's email address exactly to confirm.".
   - Answer the email in upper case: toast "Account deleted", and the row is gone.
   - Activity shows "Deleted an account" with a blank Account column and details "account deleted".
   - Covers ADM-ACC-05..07, LOG-02.
- `SCN-69` **Feedback.** Seed 3 items (bug, idea and other; one with page and context) from a named user.
   - Open `/admin/feedback` directly. Segment shows "New · 3". The sidebar badge shows 3.
   - Pills "Bug", "Idea", "Message". Message line breaks kept. The context box shows.
   - The "Reply by email" href is `mailto:…?subject=About%20your%20ClipCrest%20feedback`.
   - "Mark seen": toast "Marked seen", the item leaves New, and "Seen · 1" appears.
   - "Done": toast "Marked done". On Done, "Reopen": toast "Reopened". On All, every item shows.
   - Empty texts on New and on Seen.
   - Covers ADM-FB-01..09, HDR-04, NAV-04. FB-10 through the API (`{status:"bogus"}` gives "Unknown status.").
- `SCN-70` **Activity.** After the `grant` from setup there is a row "Made an admin" with details "set from the server command line". Check the column headers, heading and subtitle. The empty state is on SCN-74's server. Covers ADM-LOG-01..04.
- `SCN-71` **Refresh and polling.**
    - "Refresh" toasts "Up to date" in the bottom-right `role=status` area.
    - With `page.clock`, advance 30 s: one `GET /api/admin/overview`.
    - Hide the page (`visibilityState`): no request.
    - Error toasts last about 7 s, ok toasts about 3.2 s.
    - Covers ADM-HDR-10, POLL-01, ERR-05.
- `SCN-72` **Errors.**
    - Make `/api/admin/overview` return 500 `{"detail":"boom"}` with `page.route`, then Refresh: the view shows "Couldn't load" and "boom".
    - Run `python -m studio.admin revoke admin@example.com`, then Refresh: the browser goes to `/app`, then `/login`.
    - Covers ADM-ERR-02..04.
- `SCN-73` **Sign out.** Click "Sign out": `POST /api/auth/logout` is sent and the page ends on "/" (the landing page). Covers ADM-HDR-08.
- `SCN-74` **Sign-in off (Server B, `CLIPCREST_ACCOUNTS=0`, fresh data).**
    - `/admin` opens without signing in. The who block shows "You" / "you@localhost". There is no "Earn campaigns" link.
    - Users has 1 row with an "Admin" pill. The dialog has only "Close".
    - Activity shows "Nothing yet".
    - "Sign out" ends on `/app`.
    - Restart with `CLIPCREST_LOCAL_EARN=1`: the "Earn campaigns" link appears.
    - Covers ADM-SRV-01 (sign-in off), HDR-06, HDR-08, UDLG-03, LOG-03.
- `SCN-75` **Responsive.** At 1000px wide, tiles are in 2 columns. At 375px: the nav is a sideways-scrolling row, the "Admin" heading and the who block are hidden, there is no sideways page scroll, and the dialog facts are in 2 columns. Emulate `prefers-reduced-motion`. Covers ADM-RSP-01..03.

#### Earn admin scenarios (Server A, one admin and one clipper)

- `SCN-76` **Shell and navigation.**
    - Open `/admin/earn`: "Loading…", then the h1 "Overview" and its subtitle, and "+ New campaign".
    - Click each of the 6 tabs: the URL `/admin/earn/<tab>` and the matching title, subtitle and top-bar action change ("Refresh YouTube views" on Review, a "Download CSV" link on Payouts, nothing on Clippers and Settings).
    - Check the foot links' hrefs and that "Open the Earn page" opens in a new tab.
    - Open `/admin/earn/review` directly. `/admin/earn/zzz` shows Overview.
    - Back and forward between two tabs.
    - Covers EADM-SRV-01..02, HDR-01..06, NAV-01..05, ERR-01.
- `SCN-77` **Empty states.** On fresh data:
    - Overview: the warning note and "Add key", which opens Settings. KPI tiles at ₹0. "No campaigns yet". Clips-by-status counts at 0.
    - Review: "No clips are waiting for review.".
    - Payouts: "Nobody is owed anything" and "No payouts yet".
    - Clippers: the admin is listed. Searching "zzz" shows "No one yet" and "0 of 1".
    - Settings: "No key yet.", and the warn note "Email sending isn't set up yet…".
    - Covers EADM-OVR-01..04, CAMP-02, SUBM-18, PAY-07, PAY-08, CLIP-11, SET-01, 02, 06, 07.
- `SCN-78` **Create a campaign.** Open "+ New campaign".
    - Check every default value and the six rule lines.
    - The preview reads "22,50,000" and "₹1,000". Rate 0 gives "Set a rate to see what the budget buys.".
    - Empty title: the browser blocks the submit. Title "ab": toast "Give the campaign a name of at least 3 letters.".
    - Untick all platforms: "Pick at least one platform.".
    - Ends before Starts: "The end date must be after the start date.".
    - Status Live with budget 0: "Set a budget and a rate before going live.".
    - Valid draft with creator link "youtube.com/@mizo": toast "Campaign created. Press Go live when it's ready.". The sheet becomes "Edit campaign" with Delete.
    - Cancel. The table row shows the title, "Mizo · /earn#c=<slug>", the Draft chip, "₹20/1K", the meter with "₹0 of ₹45,000", and the Go live, End, Edit and View buttons.
    - Covers EADM-FORM-01..16, 18, CAMP-01, 03..08, 15.
- `SCN-79` **Campaign row actions.** Each action and its toast:
    - "Go live": "Live and open. Clippers can join now.".
    - "Pause": "Campaign is now paused.". "End": "Campaign is now ended.", and the End button disappears.
    - Edit, set Starts to tomorrow, set Status Live, Save ("Saved."): the row shows "Not open yet: opens …".
    - Status "Coming soon": the chip "Coming soon" and "Shown locked on the site".
    - The View link href is `/earn#c=slug` with a new-tab target.
    - Clicking the backdrop closes the sheet.
    - Delete with `confirm` dismissed: nothing. Accepted: toast "Deleted.".
    - A campaign with paid clips (after SCN-85): the paid-campaign delete error.
    - Covers EADM-CAMP-05, 10..14, 16, FORM-02, 03, 17.
- `SCN-80` **Covers.**
    - New campaign with a PNG cover: after Save the reopened sheet shows `img.cover-prev`.
    - In Edit, pick a PNG: toast "Cover saved.", and the src has `?v=`.
    - Pick a text file renamed to .png: "That file isn't an image ClipCrest can read. Use a PNG or JPG.".
    - Pick an 8.5 MB file: "That image is too big. The limit is 8 MB.". Pick a file over 9 MB: "That file is too big. Use an image under 8 MB.".
    - Covers EADM-COV-01..04.
- `SCN-81` **Review queue rendering.** Use a live campaign with `required_tag`, start an hour ago, hold days 7. Seed X, TikTok, Instagram (with proof) and YouTube clips.
    - The nav badge shows 4. The segment shows "Pending4".
    - Clipper cell: "Ravi" (or the email prefix), the email, the handle, and a `wa.me/91…` link.
    - Clip link text "X ↗ x.com/RaviClips/status/…", plus "sent 1m ago · posted …".
    - Chips "✓ Owner" and "✓ On time" on the X clip; "? Owner" on Instagram.
    - Views input showing 0 and "not counted yet". "~₹0".
    - Proof: a thumbnail for Instagram, "not needed" for YouTube, "none yet" for TikTok.
    - "Holding" chip with its tooltip. Set the campaign's hold days to 0 and reload: "Ready".
    - Filter by campaign; search "tiktok" (the request goes out after about 350 ms); the "All" button has no count.
    - Seed one row's `checks` and views data in the database to show "✕ Owner", "✕ Early", "✓ Tag", "✕ No tag", the title line, and "from YouTube Nm ago".
    - Covers EADM-SUBM-01..13, 18, 21, HDR-03.
- `SCN-82` **Decisions.**
    - Type 12000 views on the X clip (blur it): toast "Views saved.", "typed in", and the estimate becomes "~₹240".
    - Approve: "Approved: ₹240". It moves to Approved with no checkbox, showing "Back to review" and amount "₹240".
    - Reject TikTok with the prompt answer "Off topic": "Rejected.", the note shows under the chip. "Back to review": "Back in review.".
    - In the API, changing an approved clip's views gives "Views of an approved clip can't change. Move it back to review first.".
    - A paid clip (after SCN-85) has no buttons.
    - Covers EADM-SUBM-10, 14..17, 19, 20.
- `SCN-83` **Budget runs out.**
    - Campaign with budget 300 and rate 20: approve 12000 views (₹240), then another clip with 30000 views. The second earns ₹60 and the campaign shows "Ended".
    - Another live campaign: approve, then edit the budget down to the amount already committed. The row shows "Not open yet: the budget is used up" and "Go live" toasts "Campaign is now live.".
    - Covers EADM-CAMP-17, CAMP-05, CAMP-12 (Q-86).
- `SCN-84` **Bulk.**
    - Tick 2 pending rows: the bar shows "2 selected" and "Approves with the views shown in each row".
    - Type views in one row, then "Approve selected": the views POST goes first, then the bulk POST. Toast "2 done".
    - "Reject selected" with the prompt dismissed: nothing. "Clear" empties the selection.
    - The header checkbox selects all pending rows.
    - Make a problem: set the budget so it is used up, then bulk-approve. Toast "N done. #id: The budget for this campaign is used up…" (bad).
    - "N to review" on the Campaigns tab opens Review on Pending with the campaign selected.
    - Covers EADM-BULK-01..07, CAMP-09.
- `SCN-85` **Clippers and Payouts.**
    - Clippers: KPI counts; the clipper row with WhatsApp link, UPI, the "YT", "IG", "X" and "TT" links (check their hrefs), joined campaign titles, "N to review", Owed in ₹. An unverified, profile-less user shows both chips. Search by UPI: "1 of N".
    - Payouts: the Owed now row. Grant clipboard permissions, then Copy: toast "UPI ID copied.".
    - Clear the clipper's UPI through `/api/earn/profile`: "missing" and no Copy button.
    - "Download CSV": the download is named `clipcrest-payouts-<date>.csv` and starts with the header row.
    - "Mark paid": check the prompt text, answer "UTR123": toast "Recorded ₹X for N clips.". The row moves to Sent with "UTR123". The Payouts badge clears.
    - Through the API, paying again gives "Nothing is owed to this clipper.".
    - Covers EADM-CLIP-01..12, PAY-01..10.
- `SCN-86` **Settings.**
    - "nope", then "Save and test": the format error.
    - A well-formed fake key such as `AIza` plus 35 characters gives "YouTube couldn't be reached. Try again in a minute." offline.
    - Write `<data>/earn/settings.json` = `{"youtube_key":"AIzaFAKEFAKEFAKEFAKEFAKEFAKEFAKE1234"}` and reload: "A key is set (…1234). Views refresh by themselves.", the Overview warning is gone, and Remove shows. "Remove": "Key removed.".
    - Restart with `CLIPCREST_YOUTUBE_API_KEY` set: ", read from .env" and no Remove.
    - Restart with `CLIPCREST_SMTP_HOST=127.0.0.1` and `CLIPCREST_MAIL_FROM=x@example.com`, seeding accounts in Python so no mail is attempted: "Email sending is set up.".
    - Covers EADM-SET-01..07.
- `SCN-87` **YouTube refresh.**
    - With no key: "Refresh YouTube views" gives "Add a YouTube API key in Earn settings first.".
    - With a fake key and no pending YouTube clips: "0 YouTube clips updated.".
    - With a pending YouTube clip: "YouTube couldn't be reached. Try again in a minute.".
    - Covers EADM-YT-01. YT-02 is checked in code only.
- `SCN-88` **Errors and toasts.** Make `/api/admin/earn/summary` return 500 with `page.route`: an error toast, and the view stays on "Loading…". Two quick actions: only one toast is visible, and it lasts about 4 s. After `revoke`, any action toasts "Not Found" with no redirect. Covers EADM-ERR-02..05.
- `SCN-89` **Responsive.** At 375px: the tabs wrap, the logo and foot links are hidden, KPIs are in 2 columns, the form is one column, and tables scroll sideways. Covers EADM-RSP-01..02.
- `SCN-90` **Modes.** On Server B (sign-in off, Earn off): `/admin/earn` works, and "Open the Earn page" leads to a 404. With `LOCAL_EARN=1`, `/earn` serves the page and "View" opens the campaign. Covers EADM-SRV-01, HDR-04, CAMP-14.

#### Cannot be checked offline
- Real YouTube results (views, channel owner, tag match, successful key test): check the offline error texts and database-seeded values instead.
- Clipboard on a plain-http LAN address: check on 127.0.0.1 with permission granted.
- Email (Earn settings only shows the mail status): check that `/api/public.mail` flips with the settings.
- WhatsApp, handle, Google Cloud and mailto links: check their hrefs only.
- Non-zero "Videos processed", clips, recording and in-progress counts need real processed videos (ffmpeg, speech model): check the labels and zero values.

## 18. Known quirks and bugs in the old UI

Nothing here has been fixed in the old pages. For each one the React port should do the sensible thing (usually
the intended behaviour), and the matching checklist item is then ticked in its corrected form. Items marked "dead"
are code or styles that do nothing today; the port can leave them out.

### 18.1 The app, landing, sign-in, reset and legal pages

- `Q-01` **Dead storage key `view`.** `go()` writes `localStorage.view` on every move (index L1354) but nothing reads
  it; `/app` always opens Home. Leave it out of the port (APP-ROUTE-09).
- `Q-02` **`/app/settings` without a tab breaks on reload.** On start-up the address is rewritten with
  `remember(S.view, S.ctab, "replace")` (index L2559). For Settings opened without a tab, `S.ctab` is "clips", so the
  address becomes `/app/settings/clips`, which `fromPath()` does not know (L1339-1342): reloading lands on Home. The
  port should keep `/app/settings` (or write the real first tab).
- `Q-03` **Caption style previews do not match the real clips.** The composer previews (`CAP_LOOK`, index L1416-1421)
  disagree with the renderer (`studio/render.py` L13-21; colours there are ASS `&HBBGGRR`, so `6BD7FF` means
  RGB `#FFD76B`):
  | Style | Preview font / highlight | Real font / highlight |
  |---|---|---|
  | Bounce | Archivo Black / `#FFFF00` | Poppins ExtraBold / `#FFF000` (BGR `00F0FF`) |
  | Hype | Anton / `#FF3C3C` | Anton / `#FF3C3C` (BGR `3C3CFF`); "strong" words `#FFD700` (BGR `00D7FF`), not previewed |
  | Clean | Poppins 800 / `#6BD7FF` (light blue) | Poppins ExtraBold / `#FFD76B` (warm yellow, BGR `6BD7FF` read wrongly as RGB) |

  Upper case (Bounce, Hype) and mixed case (Clean) are right. The port should derive the previews from the real render
  values, ideally sent by the server with `status.styles`.
- `Q-04` **A Settings tab leaks into creator pages.** `go(v, tab)` only resets the creator tab for non-creator views
  (index L1351). After opening Settings with a tab (for example "Add AI key" → `go("settings", "ai")`, or loading
  `/app/settings/apps`), `S.ctab` is "ai"; clicking a creator then shows the Activity content with no tab selected
  and the address `/app/creators/<id>/ai`, which reloads as Home. Settings and creator tabs should be kept apart.
- `Q-05` **Dead actions from an older Settings page.** The click handler still has `ssave`, `plansave` and
  `testalert` (index L2518-2523) and `saveSettings()` (L2175) reading `[data-s]` and `[data-plan]` fields that are
  never drawn; the `change` handler has a branch for `#cform` radio "plans" (L2309). The server's `plans` setting no
  longer exists. Leave them out.
- `Q-06` **"Mark all as read" closes the panel.** It runs `openBell().then(openBell)` (index L2512); the first call
  sees the panel open and closes it, and so does the second. The intent was to refresh the list.
- `Q-07` **Dead "checks only on jumps" texts.** The live card has texts for `every_min` 0 (index L1744), but the
  server turns 0 into 3 (`studio/creators.py` L39-40: "Auto (0) is gone"). Dead.
- `Q-08` **"Connect a posting account" opens the wrong Settings tab for admins.** The step goes to `settings` with no
  tab (index L1964), so admins land on AI. It should open Connected apps.
- `Q-09` **Odd sort for live platforms.** `liveOn()` sorts with a one-argument comparator (index L1139), which is not
  a valid comparison; the order of two non-main live platforms depends on the browser. Intended: the main channel
  first, the rest in a fixed order.
- `Q-10` **Enter in a dialog field cancels.** Dialogs are `<form method="dialog">` with "Cancel" as the first button
  (index L949, L1835, L2365). Pressing Enter in a text field submits with the first submit button, so in the New
  creator dialog and the typed-confirmation dialog Enter closes the dialog as Cancel. The port should make Enter run
  the main action (when it is enabled).
- `Q-11` **A failed first status call leaves the app half drawn.** If `/api/status` fails at start (index L2548), the
  page draws with no user, no caption styles and no layouts, so the composer has no style or layout tiles until the
  view is redrawn; the file size message would read "over the undefined MB limit" (L1493-1497). The 15-second status
  timer fixes the shell but not the composer.
- `Q-12` **Offline shows raw browser errors.** A failed `fetch` throws the browser's own text ("Failed to fetch",
  "NetworkError when attempting to fetch resource.") into red toasts (index L930-934, L2541), and there is no offline
  indicator. Polling errors are silent. The port should say something plain ("Can't reach ClipCrest. Check that it is
  running.").
- `Q-13` **Native `prompt()` for the campaign link.** "Send to a paid campaign" asks with the browser's own prompt
  (index L2396). The port should use an in-page dialog with the same text.
- `Q-14` **Admin pages reachable while their links are hidden.** With sign-in off the owner is an admin, so `/admin`
  and `/admin/earn` open by address, but the sidebar only shows them when sign-in is on (index L1281). Either show
  the links with sign-in off or keep hiding them; decide on purpose.
- `Q-15` **The collapse button's label never changes.** It always says "Collapse sidebar" and has no
  `aria-expanded` (index L830, L2344).
- `Q-16` **Two ways to ask "is this an admin?".** The sidebar checks `user.role === "admin"` (index L1281);
  everything else checks `user.is_admin`. The server sends both with the same meaning (`studio/auth.py` L74-75). Use
  one.
- `Q-17` **Dead styles and lines.** `.ttabs` (index L151-161), `.plans`, `.plan`, `.plans-btn` (L70, L594-602,
  L187), `.side-card` and `.led` (L67-69) are never used. `landing.html` L412 looks for an element `#year` that does
  not exist.
- `Q-18` **Picking a creator in the composer only copies their caption switch.** Their style, layout, clip counts and
  lengths are not copied (index L2285-2289); only the creator's own page uses them as defaults. Decide whether the
  port should copy all of them.
- `Q-19` **Ticking a switch also saves unsaved typing.** In a creator's Setup, switches and account boxes save the
  whole form at once (index L2310-2312), including text the user has not chosen to save; "Discard" can then no longer
  undo it, and the save bar stays up.
- `Q-20` **Server features with no page.** Nothing in `web/` sends `POST /api/feedback` (in-app "Send feedback" goes
  to GitHub instead), so the admin Feedback inbox only fills through the API. The Discord and Telegram alert settings
  and the daily digest hour (`studio/accounts.py` L25-27, `studio/alerts.py`) and `POST /api/alerts/test` have no
  UI. `GET /api/admin/email-preview` and `POST /api/admin/test-email` have no UI. These are not parity items; listing
  them so nobody assumes the port lost them.
- `Q-21` **The legal pages load no web font.** `legal.html` names Geist but has no Google Fonts link, so it shows in
  the system font (L11-14).
- `Q-22` **No menu on the landing page on phones.** At 960 px and below the header's section links are hidden with
  nothing in their place (landing L267), so Earn, FAQ and the rest are only reachable by scrolling.
- `Q-23` **The landing link bar refuses plain text.** Its field is `type="url"` inside a form without `novalidate`
  (landing L302, L393), so the browser blocks "youtube.com/watch?v=..." without `https://`, with the browser's own
  message.
- `Q-24` **"Sign up" stays in the footer when signed in.** The landing and legal footers link to `/signup` always
  (landing L402, legal L239); LAND-12 does not update them.
- `Q-25` **"Who it's for" tabs work with the mouse only.** No arrow keys, no `aria-controls`, and the panel has no
  label (landing L372-373, L436-452).
- `Q-26` **`ascii.js` is only kept for a test.** No page uses it, but `tests/test_abuse.py` L70 fetches
  `/assets/ascii.js` to check open paths. Removing the file means changing that test.
- `Q-27` **Blocked storage stops the app.** `localStorage` is read at the top level (index L1197) and written in
  `go()` (L1354) and `checkNew()` (L1229, L1232) without `try`; in a browser that blocks storage (some private modes,
  strict privacy settings) this throws and the app never starts. The other storage calls are wrapped.

### 18.2 Earn (`earn.html`)

- `Q-28` **Hero pill claims campaigns are open when none are.** With no open or soon campaigns it still shows "LIVE · Paid clipping campaigns are open" (L442, L920-921).
- `Q-29` **Static and computed values disagree.** The calculator month is "₹27,000" in HTML but ₹26,900 once computed (L532 vs L892-894). The fine print changes from "An estimate. What…" to "An estimate: what…" (L533 vs L897). The port should render the computed values.
- `Q-30` **Up to three different "featured" campaigns.** The pill uses `live[0]` (L920). The rate line, lede, pot and the chip's max-per-clip variant use c0, the most `remaining` (L907). The calculator and example chip use `calcCamp()`, the first open campaign with a rate (L884). These can all differ.
- `Q-31` **`refresh()` does not redraw the nav, hero, calculator or CTAs** (L934-938). After joining, the CTAs still say "Join <title>"; ticker and pot numbers stay stale until a reload.
- `Q-32` **"Sign out" does nothing with sign-in off.** `/api/auth/*` answer 404 (server L146-147); the error is swallowed and the page reloads (L986). Verify and resend would toast "Not Found".
- `Q-33` **Malformed `#submit=` or `#c=` hashes throw.** `decodeURIComponent` raises URIError (L942, L950): a "URI malformed" toast on load, an uncaught error on hashchange.
- `Q-34` **Sign-in-off mode sends the owner to the public download page** even though they are already running the app (L930).
- `Q-35` **Download labels do not match in multi-user mode (not Earn-only).** "Download free", "Download the clip maker" and "Download" scroll to a button that says "Open the clip maker" (L931).
- `Q-36` **Client link check is looser and stricter than the server:**
   - It rejects music.youtube.com, fxtwitter.com and vxtwitter.com, which the server accepts (earn.py L116, L134).
   - It accepts any YouTube path with `?v=`; the server needs `/watch`.
   - It does not require "@" or a numeric id for TikTok, and does not check the Instagram code length (L766-778).

   The badge is only advice.
- `Q-37` **The sheet's 50,000-views example ignores `min_views`** (L727). The calculator respects it (L879).
- `Q-38` **"What happens next" may show the wrong hold days.** It uses the first joined campaign's `hold_days`, not the selected one, and does not change with the select (L808).
- `Q-39` **Note text does not match the layout.** It says "Open one below and press Join." but the button is beside the note (L798).
- `Q-40` **Footer "My earnings" (#me) does nothing when signed out** (L597, L789).
- `Q-41` **Campaign cards are `<button>` elements containing div, h3 and p** (L679-689). That is invalid HTML; the port should use a link or article.
- `Q-42` **Dashboard form labels are not tied to inputs** (no `for`/`id`) (L800-803, L829-836). Bad for screen readers and `getByLabel`. The profile "*" fields have no `required` (L831-832).
- `Q-43` **The sheet dialog has no aria-modal, no focus move or trap, and no focus return** (L728-763). Toasts have no `role=status` or aria-live (L630-634). The mobile menu does not close on Escape or outside click (L984).
- `Q-44` **Switching tabs rebuilds the dashboard and drops unsaved edits** (L985).
- `Q-45` **Count-ups ignore reduced motion and run again on every `load()`**, including after confirming the email (L646-650, L960).
- `Q-46` **Countdowns never tick, and dates have no year** (`d Mon`, L641); "Opens 3 Jan" is ambiguous near year end.
- `Q-47` **"Send a new code" shows success even when no mail service is set up** (server returns `sent:false`, L533). The button is not disabled while waiting (L1007).
- `Q-48` **Server wording does not match this page.** The unconfirmed-email error mentions "a link" and "the banner at the top", while the page uses a 6-digit code banner (server L328).
- `Q-49` **`api()` error mapping can mislead.** Any 502 during a proof upload is reported as "too big" (L626). An array `detail` (FastAPI 422) would show "[object Object]" (L627).
- `Q-50` **Proof is offered for YouTube clips** although the copy says only Instagram and X need it (L809, L820).
- `Q-51` **Leaderboards count pending (unreviewed) views** (earn.py L402-413). Earned counts only approved and paid clips.
- `Q-52` **`placeBar()` is not called when the sheet opens or closes** (L966-973, L761-763). The phone bar updates only on the next scroll.
- `Q-53` **`closeSheet` drops any query string** by replacing the URL with `location.pathname` (L763).
- `Q-54` **The hero pill does not reopen a campaign whose hash is already set.** If the hash already equals `#c=<slug>` (sheet opened from a card, which set the hash with replaceState), clicking the pill to the same slug fires no hashchange (L715, L920).
- `Q-55` **Dead code:**
    - `cover(c, big)`: `big` is unused (L653, L730).
    - `#chipBudget` is never shown (L472, L920).
    - The `drawNav` fallback branch (L874-876) is effectively unreachable.
    - Unused CSS: `.stage`, `.stage .ph`, `.chip.c1`, `.chip.c3`, `.chip .bar`, `.chip .ok`, `.stage .ph .credit` (L100-110); `.dl-link` (L191-192); `.badge-new` (L79); `.note.bad` (L280); `.hero .ctas` (L93-94); `.cover .gen .gi` only for initials.
- `Q-56` **Earn-only with sign-in off is inconsistent.** `/` serves earn.html whatever `earn_link()` says (server L350-351), while `/earn` may redirect or 404.
- `Q-57` **Admin rights show late.** The 20-second session cache (auth.py L316-317) means newly granted admin rights take up to 20s to show "Manage campaigns". Tests must wait or sign in again.
- `Q-58` **Port risks:**
    - Keep en-IN number grouping (`toLocaleString("en-IN")`, L611-614) and the exact `short()` rules (K / L / Cr).
    - Keep the `next` encodings `%2Fearn%23me` and `%2Fearn%23c%3D<slug>`.
    - Keep the `#submit=` contract with index.html L2398.
    - Keep `safeUrl` filtering for creator and source links (L616).
    - Earn code never calls `ctx.bump()` (no matches in earn.py), so a React port that polls `/api/sync` would not see Earn changes.

### 18.3 Admin dashboard and Earn admin

#### admin.html
- `Q-59` (likely bug, check in a real browser first): the Disable and Enable flows may never send their request.
  - L403-404 calls `$("#dlg").close()` and then `confirmDialog()` straight away, on the same `<dialog>`.
  - Browsers fire a dialog's `close` event later, not immediately (Chromium waits for the next animation frame; Firefox sends it as a separate event).
  - That late event from closing the account dialog reaches the new `d.onclose` handler while `returnValue` is "no". So the confirm answers "No" by itself, while it still looks open and its buttons then do nothing.
  - The React port should implement the intended flow.
- `Q-60`: any 404 sends the page to /app (L208). That includes "No such account" when opening a user another admin just deleted (L361), and delete/disable answering 404.
- `Q-61`: the Feedback badge appears only after Feedback has been visited or Refresh pressed (L334), and polling never refreshes feedback (L427).
- `Q-62`: the first visit to Feedback sends two identical GETs (L340 and L352: `go()` does not set `fbLoading`).
- `Q-63`: Refresh always says "Up to date", even when a load failed (L394; both loaders swallow their errors).
- `Q-64`: a failed poll replaces the whole view with "Couldn't load", including on the Feedback tab (L348, L427).
- `Q-65`: Activity shows a blank Account column for deleted accounts, and "Removed admin" for any admin not among the newest 2000 users (L307, `admin.py` L45, L66-67).
- `Q-66`: the dialog facts (calls, tokens, videos, clips, email confirmed) come from the list row, not the detail response (L362, L369-372). "Email confirmed" shows "Yes" if the row is missing.
- `Q-67`: Ctrl- or Cmd-clicking a nav link stays in the same tab (L393; earn-admin L368 does the same).
- `Q-68` (accessibility): 
  - User rows are clickable `<tr>`s that cannot be reached by keyboard (L295).
  - The sort headers' inline `all:unset` overrides the `:focus-visible` outline (L287, L292-293).
  - The two different confirmation styles: the native `prompt()` for delete (L413) and a custom dialog for disable.
- `Q-69`: "Sign out" is meaningless with sign-in off. The POST gets 404 and "/" goes back to /app (L418).
- `Q-70`: "Earn campaigns" is hard-coded to the local `/admin/earn`, even when `earn_url` points to a remote Earn site (L336).
- `Q-71`: an unknown `/admin/<x>` shows Overview but keeps the wrong URL (L224).
- `Q-72`: sorting is descending only, and Account cannot be sorted (L283).
- `Q-73`: the users list is cut at 2000 rows, so "N of M" has M ≤ 2000 while the tile counts every account (`admin.py` L45-46).
- `Q-74` (dead code): the `sv.load ? … : ""` check is always true (L273; `load.state()` always returns a dict).
- `Q-75`: the email preview and test email routes (server L1151-1175) have no UI anywhere.

#### earn-admin.html
- `Q-76` (bug): `popstate` does not check the tab name (L365). Open `/admin/earn/foo` (shown as Overview), switch tab, press Back: `S.tab="foo"`, and `nav()` throws on `TABS[S.tab]`. Also, `load()` there has no `.catch` and the selection is not cleared.
- `Q-77`: `go()` pushes a history entry even for the tab already open. The first URL is `/admin/earn`, but the Overview link is `/admin/earn/overview` (L174, L364).
- `Q-78`: the select-all checkbox is redrawn unticked every time (L304, L399), so it can never deselect; clicking it again adds the rows again.
- `Q-79`: the selection survives campaign-filter and search changes (L412, L424). Bulk actions then reach rows that are not shown, the typed views of those rows are not saved, and "N selected" counts them.
- `Q-80`: "Reject selected" also saves the typed views first. Views are saved one request per row, one after another (L394).
- `Q-81`: the bulk toast shows only the first problem (L396).
- `Q-82` (bug): when a cover fails to upload on create, its error toast is replaced at once by the success toast (L442-443, because `toast()` removes the old one), so the admin never sees it.
- `Q-83`: uploading a cover in Edit redraws the form from server data and drops unsaved edits without warning (L417-420).
- `Q-84` (accessibility): 
  - The form sheet has no Escape key, no focus trap, and no `role=dialog` or `aria-modal` (L221, L374).
  - Its labels are not tied to the inputs (L225-249), so `getByLabel` cannot be used on the old page.
  - Toasts have no `aria-live` (L170).
- `Q-85`: "Go live" on a live campaign that is past its end or out of budget toasts "Campaign is now live." even though it is not open (L377).
- `Q-86`: submitting the key form empty removes the key but toasts "Key works and is saved." (L447). "Remove" has no confirmation (L407).
- `Q-87`: a 502 on any file upload is reported as "That file is too big…" (L166).
- `Q-88`: there is no redirect on 401 or 404 (unlike admin.html). After losing access, every action just toasts "Not Found" (L161-169).
- `Q-89` (dead code): the `.mono` class is not defined in the CSS (L281).
- `Q-90`: "No one yet" also shows when a Clippers search matches nothing (L286).
- `Q-91`: on Settings the mail note first shows the warning, then flips once `/api/public` answers. That call happens only on that tab (L347, L361).
- `Q-92`: at ≤900px the foot links are hidden, so a phone has no way back to /admin, /app or /earn (L113).
- `Q-93`: "Edit" with an unknown id opens an empty "New campaign" form (L373).
- `Q-94`: the Copy button needs a secure context. On a plain-http LAN address it toasts a raw TypeError (L401).
- `Q-95`: there is no polling, so badges and the queue go stale while someone else works.
- `Q-96`: the "✕ Owner" and "✕ Early" chips almost never appear. Clips failing those checks are refused when sent (`earn.py` L605-608), so the chips show only for older or hand-seeded data.
- `Q-97`: the budget preview ignores minimum views (L257).
- `Q-98`: earn-admin formats numbers, ₹ amounts and dates in en-IN ("1,00,000") whatever the browser's language (L138-143, L182). admin.html uses the browser's locale (L199-203). The port must keep each page's own behaviour.
- `Q-99`: the tab is read from `split("/")[3]`, so `/admin/earn/review/anything` also opens Review (L158).
- `Q-100` (unused routes): `GET /api/admin/earn/settings` (server L1856) and the admin proof upload `POST /api/admin/earn/submissions/{sid}/proof` (server L1816).

## 19. Counts

| Page | Checklist items | Scenarios | Quirks |
|---|---|---|---|
| `index.html` (APP) | 240 | SCN-01..33 | Q-01..19, Q-27 |
| `landing.html` (LAND) | 19 | SCN-07, SCN-34, SCN-35 | Q-17, Q-22..25 |
| `auth.html` (AUTH) | 9 | SCN-36 | |
| `reset.html` (RST) | 4 | SCN-37 | |
| `legal.html` (LEGAL) | 6 | SCN-38 | Q-21, Q-24 |
| `earn.html` (EARN) | 149 | SCN-40..60 | Q-28..58 |
| `admin.html` (ADM) | 79 | SCN-61..75 | Q-59..75 |
| `earn-admin.html` (EADM) | 122 | SCN-76..90 | Q-76..100 |
| `gradient-ascii.js`, `ascii.js` (GA) | 2 | SCN-39 | Q-26 |
| **Total** | **630** | **90** | **100** |

The app's 240 items by area: COMP 25, SET 23, VID 21, NAV 14, CRE 14, LIVE 14, ERR 14, ROUTE 13, SYNC 11, SHELL 10,
UPL 10, HOME 9, CLIP 9, BELL 8, TOP 7, TOUR 7, USE 6, KEY 6, ACCT 4, EARN 4, UPD 3, ADML 3, TOAST 3, FB 2.

The API table (section 5) lists 87 endpoints that pages call today, plus 11 routes that no page calls.
