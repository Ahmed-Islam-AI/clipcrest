import { renameSync } from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

const root = import.meta.dirname
const outDir = path.resolve(root, "../web/dist")

// The pages that are built into web/dist, as { name in web/dist: HTML file in frontend/ }.
// Each page is frontend/<page>.html plus its script, src/pages/<page>/main.tsx.
// To add a page in Phase 3: create those two files, then add one line here.
// gallery.html is left out on purpose: it is the design-system preview, for `npm run dev` only.
const pages: Record<string, string> = {
  "index.html": "app.html", // the signed-in app, served by the Python server at /app
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

// In dev, /app and every /app/... address opens the app page, as the Python server does.
function devPageAddresses(): Plugin {
  return {
    name: "clipcrest-dev-page-addresses",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const p = (req.url ?? "").split("?")[0]
        if (p === "/app" || p.startsWith("/app/")) req.url = "/app.html"
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
