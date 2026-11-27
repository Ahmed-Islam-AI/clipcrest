# The app (`/app`): shell and contract for the views

`src/pages/app/main.tsx` mounts `router.tsx`. The shell (`shell/`) draws the sidebar, the top bar, the banner and
the dialogs every view shares. Each view lives in its own folder under `features/` and is written by one person (or
agent) at a time.

## Routes

The router's basename is `/app`, so inside the app `/` means `/app`. Use the helpers in `paths.ts`, never strings.

| Address | Component | Notes |
|---|---|---|
| `/app` | `features/home` | |
| `/app/videos` | `features/videos` | |
| `/app/usage` | `features/usage` | |
| `/app/settings/:tab` | `features/settings` | `/app/settings` and tabs this user may not see go to the first allowed tab (`settingsTabs()`) |
| `/app/creators/:id` (Clips), `/setup`, `/activity` | `features/creators` | unknown creator → Home; `/clips` is tidied to `/app/creators/:id` |
| anything else | Home | |

History: the sidebar and any `navigate(...)` add an entry; creator tabs replace it (the shell does this). Going to a
new view scrolls to the top and closes the phone drawer.

## The contract for a view

- `features/<area>/index.tsx` has **one default export**, a component with **no props**. Read the address with
  `useParams()` (`tab` for Settings, `id` and `tab` for creators). The router has already checked both.
- Wrap the content in `<PageBody>` from `shell/bits.tsx` (centred, max 1280px, the page spacing). Home may put its
  full-width hero before it.
- Keep every visible text from `web/index.html` and the item in `docs/FEATURES.md`. Tests find things by role and
  text: where the old page had a `<button>`, use a button.
- Two more files are mounted by the shell, once, and stay stubs until their owner fills them in:
  `features/creators/NewCreatorDialog.tsx` (open with `newCreator.open()`) and `features/settings/Tour.tsx` (open
  with `tour.open()`). Both draw nothing while their flag is off: `newCreator.useOpen()`, `tour.useOpen()`.

## The top bar: `usePage()` from `page.ts`

The shell already shows, for each address, the title, the subtitle, the creator's picture and status badge, the
creator tabs with their counts, and "Star on GitHub" / "Follow me" on Home and All videos. A view adds its buttons:

```tsx
usePage({ actions: <Button variant="primary">Start recording</Button> })
```

Call it on every render (it is cheap). It can also replace `title`, `subtitle`, `icon`, `tabs` (a list of
`{ value, label, icon, count, to, replace }`) and `tab`. What it sets is cleared when the view closes. The buttons
are drawn in the top bar, outside the view, so give them what they need through closures, not React context.

## Data: `sync.ts`

| Hook or function | What it gives |
|---|---|
| `useStatus()` | `GET /api/status` (`types.ts` → `Status`), refreshed every 15 s. Undefined only if the first call failed |
| `useSyncData()`, `useJobs()`, `useCreators()`, `useAccounts()`, `useCreator(id)` | the lists from `/api/sync`; `useSyncData().at` is when they arrived (for clocks that count between syncs) |
| `refreshSync()` | ask `/api/sync` now; resolves once the answer is in. Call it after every action that changes something (APP-SYNC-08) |
| `refreshStatus()` | load `/api/status` again (after saving AI settings, confirming an email, ...) |
| `patchSync(d => ...)`, `patchStatus({...})` | change the cached data at once, before the server confirms |
| `useOverview()` | Home's `GET /api/overview`: loaded when Home opens, after every sync that brought changes, and when older than 20 s |
| `useUsage()` | `GET /api/usage`, loaded each time the page opens; also updates the sidebar AI card |
| `keys` | the query keys, for your own `useQuery` calls that should refresh with these |

The sync loop runs on its own (1 s / 2 s / 4 s, 20 s in a hidden tab; at once on return to the tab). After a server
restart every query is loaded again. Queries made with TanStack Query in this app do not retry and do not reload on
window focus, like the old page. Home redraws on the 15-second status refresh because `useStatus()` changes.

## Talking to the server: `api.ts`

- `api<T>(path, init?)` and `send<T>(path, body?, method = "POST")`: JSON in and out, same origin. A 401 sends the
  browser to `/login`; any other failure throws an `ApiError` with the server's `detail` text and `status`; a
  network failure throws "Can't reach ClipCrest. Check that it is running.".
- After ending the session (sign out, delete the account) go away with `leave()`, not `location.href`: a request
  still under way would get a 401 and send the browser to `/login` instead.
- For uploads with `XMLHttpRequest` (to show progress): on a 401 call `signIn()`; turn a failed answer into its
  message with `errorText(xhr.responseText, "Upload failed")`.

## Shared helpers

- `toast(msg, kind)` in `toast.ts`: `""`, `"ok"` or `"bad"` (red, 7 s, with "Report"). `openFeedback(message?)`.
- `ask(title, text, okLabel, danger)` and `askTyped(title, text, mustType, okLabel)` in `confirm.ts`: await the answer.
- `creator.ts`: `liveOn(c)`, `isOnAir(c)`, `avatarUrl(c, platform?)`, `hasPic(c)`, `fmtK(n)`, `PLATFORM_NAMES`.
  `shell/bits.tsx`: `<CreatorAvatar>`, `<CreatorStatus>`, `<PageBody>`.
- `flags.ts`: `drawer` (the phone sidebar), `tour`, `newCreator`.
- The tour's targets: `[data-tour="videos"]`, `[data-tour="new-creator"]`, `[data-tour="ai"]`, `[data-tour="me"]`
  in the sidebar (on phones open `drawer` first, and use the visible match), `#main` is the scrolling panel.
  Home must give its composer form `id="addform"` and its tiles a selector the tour can use.
- Home owns APP-ROUTE-11: the shell moves to Home when `sessionStorage.clipcrest_link` is set; Home's composer takes
  it out, fills the link box, starts recognising it, focuses it and says "Your link is ready. Press Make clips.".
- Wrap every `localStorage` and `sessionStorage` call in `try` (Q-27).
