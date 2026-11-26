# ClipCrest front end

The pages, written in React, TypeScript, Tailwind CSS and shadcn/ui. Node is only needed to work on them: the
finished pages are built into `web/dist`, which is committed, so people who run ClipCrest never need Node.

## Work on the pages

1. Start the Python server as usual, from the project folder: `python -m studio.server` (port 8765).
2. In this folder, the first time: `npm ci`. Then: `npm run dev`.
3. Open <http://localhost:5173/gallery.html> for the design system, <http://localhost:5173/app> for the app, or any
   other page by its usual address (`/`, `/login`, `/reset`, `/terms`, `/earn`, `/admin`, `/admin/earn` ...).

The dev server sends `/api/`, `/media/`, `/brand/`, `/assets/`, `/auth/`, `/oauth/`, `/pub/`, `/earn/cover/`,
`/healthz` and `/favicon.ico` on to the Python server, so the pages talk to real data. If the Python server runs on
another port, start the dev server with `CLIPCREST_DEV_API_PORT=8781 npm run dev`.

### Why the proxy keeps the Host header

The proxy passes requests on with the browser's own Host (`localhost:5173`), not the Python server's. Two checks in
`studio/server.py` depend on that:

- **Same origin.** Every change (POST, PUT, DELETE) must come from ClipCrest's own page. The browser says so
  itself (`Sec-Fetch-Site: same-origin`), and the server also compares the page's Origin with the Host. Both read
  `localhost:5173`, so they match.
- **Own address.** With sign-in off, the server only answers to an address it recognises: a number such as
  127.0.0.1, `localhost`, any `*.localhost` name, or the host in `CLIPCREST_PUBLIC_URL`. `localhost:5173` passes.

So open the dev server as `localhost`. A made-up name (`http://devbox:5173`) is refused, first by Vite and then by
the server ("Open ClipCrest by its own address"). If you need one, add it to `server.allowedHosts` in
`vite.config.ts` and set `CLIPCREST_PUBLIC_URL` to that address when you start the Python server.

## Build

`npm run build` checks the types, then writes the pages to `../web/dist` (scripts, styles and fonts go in
`web/dist/static/`). **`web/dist` is committed: rebuild and commit it after every change here**, or people get the
old pages.

Also: `npm run typecheck`, `npm run lint`, `npm run preview`.

## Colours and fonts

Everything lives in `src/styles/theme.css`. To change the palette, edit only the values in its first block (the app
tokens, such as `--brand` and `--frame`); the shadcn names and the Tailwind classes (`bg-brand`, `text-dim`,
`border-line` ...) follow from them. Fonts are files from `@fontsource`, never Google Fonts.

The rules: no shadows, hover changes colour only, visible focus rings, radii from the tokens.

## Add a page

1. Create `<page>.html` in this folder (copy `app.html`) and point its script at `src/pages/<page>/main.tsx`.
2. Create `src/pages/<page>/main.tsx`; it calls `mount(<YourPage />)` from `src/lib/mount.tsx`.
3. Add the page to the `pages` list in `vite.config.ts`.

HTML files may contain the server's fill-ins such as `{{SITE}}` and `{{DOWNLOAD}}`; the build leaves them as they
are. The server only fills them in HTML, so a script that needs one reads it from the page, for example from
`<meta name="download" content="{{DOWNLOAD}}">`.

`gallery.html` is for development only and is never built.
