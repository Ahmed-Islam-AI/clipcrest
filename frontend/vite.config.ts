import { renameSync } from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

const root = import.meta.dirname
const outDir = path.resolve(root, "../web/dist")

// The pages that are built into web/dist, as { name in web/dist: HTML file in frontend/ }.
// Each page is frontend/<page>.html plus its script, src/pages/<page>/main.tsx.
// To add a page: create those two files, then add one line here.
// gallery.html is left out on purpose: it is the design-system preview, for `npm run dev` only.
const pages: Record<string, string> = {
  "index.html": "app.html", // the signed-in app, served by the Python server at /app
  "landing.html": "landing.html", // / and /clip-maker
  "auth.html": "auth.html", // /login and /signup
  "reset.html": "reset.html", // /reset
  "legal.html": "legal.html", // /terms, /privacy and /acceptable-use
  "earn.html": "earn.html", // /earn
  "admin.html": "admin.html", // /admin/...
  "earn-admin.html": "earn-admin.html", // /admin/earn/...
}

// Vite names an HTML page after its source file. This gives each page its name from the list above.
function renamePages(): Plugin {
  return {
    name: "clipcrest-rename-pages",
    apply: "build",
    writeBundle({ dir = outDir }, bundle) {
      for (const [name, file] of Object.entries(pages)) {
        if (name !== file && bundle[file]) renameSync(path.join(dir, file), path.join(dir, name))
      }
    },
  }
}

// In dev, each address opens the same page as on the Python server. The first match wins, so /admin/earn comes
// before /admin. Only page addresses are matched: /api/admin/... still goes to Python.
const devPages: [RegExp, string][] = [
  [/^\/app(\/.*)?$/, "/app.html"],
  [/^\/(clip-maker)?$/, "/landing.html"],
  [/^\/(login|signup)$/, "/auth.html"],
  [/^\/reset$/, "/reset.html"],
  [/^\/(terms|privacy|acceptable-use)$/, "/legal.html"],
  [/^\/earn$/, "/earn.html"],
  [/^\/admin\/earn(\/.*)?$/, "/earn-admin.html"],
  [/^\/admin(\/.*)?$/, "/admin.html"],
]

function devPageAddresses(): Plugin {
  return {
    name: "clipcrest-dev-page-addresses",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? ""
        const p = url.split("?")[0]
        const page = devPages.find(([re]) => re.test(p))?.[1]
        if (page) req.url = page + url.slice(p.length) // keeps the query string
        next()
      })
    },
  }
}

// Everything the Python server answers. The Host header is left as the dev server's own (changeOrigin: false),
// so the server's same-origin check sees an Origin and a Host that match. Paths end in "/" where the server's
// routes are always nested, so a future page such as auth.html or publish.html is not sent to Python by mistake.
const api = `http://127.0.0.1:${process.env.CLIPCREST_DEV_API_PORT || 8765}`
const proxied = ["/api/", "/media/", "/brand/", "/assets/", "/auth/", "/oauth/", "/pub/", "/earn/cover/", "/healthz", "/favicon.ico"]

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss(), renamePages(), devPageAddresses()],
  resolve: { alias: { "@": path.resolve(root, "src") } },
  server: {
    proxy: Object.fromEntries(proxied.map((p) => [p, { target: api, changeOrigin: false }])),
  },
  build: {
    outDir,
    emptyOutDir: true,
    assetsDir: "static",
    rollupOptions: {
      input: Object.values(pages).map((file) => path.resolve(root, file)),
    },
  },
})
