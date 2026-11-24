/* Runs once before the tests: makes the test videos, and clears away data folders left by old runs. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VIDEOS } from "./fixtures";

export default function globalSetup() {
  fs.mkdirSync(path.dirname(VIDEOS.tiny), { recursive: true });
  const make = (file: string, extra: string[]) => {
    if (fs.existsSync(file)) return;
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=25",
      "-f", "lavfi", "-i", "sine=frequency=440", "-t", "6", ...extra, "-shortest", file]);
  };
  make(VIDEOS.tiny, []);                                     // about 100 KB: sent in one request
  // a steady 10 Mbit/s, so about 7.5 MB: more than the 5 MB pieces the test servers use, so it goes up in pieces
  make(VIDEOS.big, ["-c:v", "libx264", "-preset", "ultrafast", "-b:v", "10M", "-minrate", "10M", "-maxrate", "10M",
    "-bufsize", "2M", "-x264-params", "nal-hrd=cbr"]);
  if (fs.statSync(VIDEOS.big).size < 6 * 1024 * 1024) throw new Error(`${VIDEOS.big} came out smaller than 6 MB`);

  // The servers' data folders can only be deleted once the servers have stopped, which is after the tests. So each
  // run deletes the ones older than a day instead.
  for (const name of fs.readdirSync(os.tmpdir())) {
    const dir = path.join(os.tmpdir(), name);
    try {
      if (name.startsWith("clipcrest-e2e-") && Date.now() - fs.statSync(dir).mtimeMs > 86_400_000)
        fs.rmSync(dir, { recursive: true, force: true });
    } catch { /* still in use: next time */ }
  }
}
