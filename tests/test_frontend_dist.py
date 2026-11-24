"""Pages built with React (web/dist) are served when they exist; until then the old pages in web/ are served.
Runs against the code directly, with its own empty data folder and its own throwaway dist folder: the project's
web/dist is never created."""
import os
import shutil
import sys
import tempfile
from pathlib import Path

os.environ["CLIPCREST_DATA"] = tempfile.mkdtemp(prefix="pc-dist-")
os.environ.update(DATABASE_URL="", CLIPCREST_ACCOUNTS="0", CLIPCREST_PUBLIC_URL="http://127.0.0.1:8765",
                  CLIPCREST_DOWNLOAD_URL="https://download.example.com/clipcrest", CLIPCREST_LEGAL_NAME="Test Business",
                  CLIPCREST_EARN_URL="", CLIPCREST_LOCAL_EARN="", CLIPCREST_CONTACT_EMAIL="")
sys.path.insert(0, ".")
from fastapi.testclient import TestClient  # noqa: E402

from studio import config, db, server  # noqa: E402

db.init()
fails = []
BASE = "http://127.0.0.1:8765"
c = TestClient(server.app, base_url=BASE, follow_redirects=False)
REAL_DIST = server.DIST
TMP = Path(tempfile.mkdtemp(prefix="pc-dist-web-"))
DIST = TMP / "dist"
server.DIST = DIST                   # the throwaway dist folder; it does not exist yet


def check(name, got, want=True):
    ok = want(got) if callable(want) else got == want
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"   got {got!r}"))
    ok or fails.append(name)


def write(name, text):
    (DIST / name).parent.mkdir(parents=True, exist_ok=True)
    (DIST / name).write_bytes(text.encode())


# ---- (a) no dist folder: the old pages, as before
old_landing = (server.WEB / "landing.html").read_text(encoding="utf-8")
check("with nothing built, /app is the old app page", c.get("/app").content, (server.WEB / "index.html").read_bytes())
check("...and /clip-maker the old landing page, filled in", c.get("/clip-maker").text,
      old_landing.replace("{{SITE}}", config.PUBLIC_URL).replace("{{DOWNLOAD}}", config.DOWNLOAD_URL))
r = c.get("/privacy")
check("...and /privacy the old legal page, filled in", (r.status_code, "Privacy Policy | ClipCrest" in r.text, "{{" in r.text), (200, True, False))
config.ACCOUNTS = True               # the sign-in page only shows when sign-in is on
check("...and /login the old sign-in page", c.get("/login").content, (server.WEB / "auth.html").read_bytes())
config.ACCOUNTS = False

# ---- (b) built pages win
APP = '<!doctype html><html><head><title>ClipCrest</title><script type="module" src="/static/app-abc123.js"></script></head><body></body></html>'
write("index.html", APP)
write("landing.html", "<title>Built landing</title><a href='{{SITE}}/x'>site</a><a href='{{DOWNLOAD}}'>get it</a>")
write("legal.html", "<title>Built legal</title><p>Run by {{NAME}}</p>")
r = c.get("/app")
check("a built app page is served at /app", (r.status_code, r.text), (200, APP))
check("...and at every app address", c.get("/app/videos/x").text, APP)
r = c.get("/clip-maker")
check("a built landing page is served with its blanks filled in",
      r.text, f"<title>Built landing</title><a href='{config.PUBLIC_URL}/x'>site</a><a href='{config.DOWNLOAD_URL}'>get it</a>")
check("a built legal page is served with its blanks filled in", c.get("/privacy").text, "<title>Built legal</title><p>Run by Test Business</p>")
(DIST / "landing.html").unlink()
check("taking a built page away brings the old one back", "Built landing" in c.get("/clip-maker").text, False)

# ---- (c) the built pages' files
write("static/app-abc123.js", "console.log('hi');\n" * 100)
write("static/x.css", "body{color:red}")
write("static/geist-abc.woff2", "w" * 2000)
r = c.get("/static/app-abc123.js")
check("a script is sent as a script", (r.status_code, r.headers["content-type"].startswith("text/javascript")), (200, True))
check("...and kept by the browser for a year", r.headers.get("cache-control"), "public, max-age=31536000, immutable")
check("...and compressed", r.headers.get("content-encoding"), "gzip")
check("...and not sent again when the browser already has it",
      c.get("/static/app-abc123.js", headers={"If-None-Match": r.headers["etag"]}).status_code, 304)
check("a style sheet is sent as one", c.get("/static/x.css").headers["content-type"].startswith("text/css"), True)
r = c.get("/static/geist-abc.woff2")
check("a font is sent as one, and not compressed again", (r.headers["content-type"], r.headers.get("content-encoding")), ("font/woff2", None))
config.ACCOUNTS = True
check("signed out, the app itself needs sign-in", c.get("/app").headers.get("location"), "/login")
check("...but its files load, so the sign-in page can use them", c.get("/static/app-abc123.js").status_code, 200)
config.ACCOUNTS = False

# ---- (d) nothing outside web/dist/static, and nothing but the allowed kinds of file
write("server.py", "secret")
write("config.py", "secret")
write("static/a/b.js", "x")
write("static/evil.exe", "x")
for bad in ("/static/../server.py", "/static/%2e%2e%2fconfig.py", "/static/a/b.js", "/static/evil.exe", "/static/nope.js"):
    check(f"{bad} is not found", c.get(bad).status_code, 404)
try:
    server.static_file("../config.py")
    check("a name with a folder in it is refused even when asked directly", False)
except server.HTTPException as e:
    check("a name with a folder in it is refused even when asked directly", e.status_code, 404)

# ---- (e) a built page still carries the security headers
h = c.get("/app").headers
check("a built page keeps its security headers", (h.get("content-security-policy") == server.CSP, h.get("x-content-type-options")), (True, "nosniff"))

server.DIST = REAL_DIST
print("ALL PASSED" if not fails else f"{len(fails)} failed")
db.engine.dispose()
shutil.rmtree(TMP, ignore_errors=True)
shutil.rmtree(os.environ["CLIPCREST_DATA"], ignore_errors=True)
sys.exit(1 if fails else 0)
