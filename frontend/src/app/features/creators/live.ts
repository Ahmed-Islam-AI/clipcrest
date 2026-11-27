// Recording a creator's live stream, and the small facts the live player and Setup need (APP-LIVE, APP-TOP-05).
import type { NavigateFunction } from "react-router"
import { send } from "@/app/api"
import { paths, viewOf } from "@/app/paths"
import { patchSync, refreshSync } from "@/app/sync"
import { toast } from "@/app/toast"
import type { Creator, Job, Profile } from "@/app/types"

/** Each platform's logo colours and the shape of its channel link (the field's placeholder). Names: PLATFORM_NAMES. */
export const PLAT: Record<string, { bg: string; fg: string; hint: string }> = {
  youtube: { bg: "#FF0000", fg: "#fff", hint: "https://www.youtube.com/@name" },
  twitch: { bg: "#9146FF", fg: "#fff", hint: "https://www.twitch.tv/name" },
  kick: { bg: "#0B0E0F", fg: "#53FC18", hint: "https://kick.com/name" },
}

/** What the server's channel look-up knows about one platform (studio/profiles.py). */
export type LiveProfile = Profile & { name?: string; title?: string; followers?: string; embed?: string; started?: number | null; live_at?: number }

/**
 * The embedded player for a live stream. Only these three hosts are allowed by the server (CSP frame-src in
 * studio/server.py). Twitch plays only inside the site named in `parent`, so it gets this page's host name.
 */
export function playerSrc(k: string, e?: string) {
  if (!e) return ""
  const id = encodeURIComponent(e)
  if (k === "twitch") return `https://player.twitch.tv/?channel=${id}&parent=${location.hostname}&muted=true&autoplay=true`
  if (k === "youtube") return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1`
  if (k === "kick") return `https://player.kick.com/${id}?muted=true&autoplay=true`
  return ""
}

/** Opened at an IP address (127.0.0.1, [::1]): Twitch refuses to play there (APP-LIVE-03). */
export const ipHost = () => /^[\d.]+$|^\[/.test(location.hostname)

/** How long since `ts`: "2h 5m", or "12m" under an hour. */
export function since(ts: number) {
  const m = Math.max(0, Math.round((Date.now() / 1000 - ts) / 60))
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

/** The creator whose page is open now. Starting takes a few seconds and the person may have moved on meanwhile. */
function openCreator() {
  const v = viewOf(location.pathname.replace(/^\/app(?=\/|$)/, ""))
  return v.startsWith("c:") ? v.slice(2) : null
}

/**
 * Start recording (APP-LIVE-07). `channel`: the platform playing in the live player; without it the server records
 * a live channel, else the main one. No channel at all: Setup opens and says why. The new recording shows at once.
 * Throws the server's message.
 */
export async function startRecording(c: Creator, navigate: NavigateFunction, channel?: string) {
  if (!c.channel) {
    navigate(paths.creator(c.id, "setup"), { replace: true })
    toast("Connect one of their channels first, then press Start recording.", "bad")
    return
  }
  const j = await send<Job>(`/api/creators/${encodeURIComponent(c.id)}/live`, channel ? { channel } : {})
  if (j?.id)
    patchSync((d) => ({
      ...d,
      creators: d.creators.map((x) => (x.id === c.id ? { ...x, live_job: j.id } : x)),
      jobs: d.jobs.some((x) => x.id === j.id) ? d.jobs : [j, ...d.jobs],
    }))
  const still = openCreator() === c.id
  toast(still ? "Recording started. Clips appear below as they're made." : `Recording started for ${c.name || "that creator"}.`, "ok")
  if (still) navigate(paths.creator(c.id), { replace: true })
  await refreshSync()
}

// one copy, shared with the live card
export { stopRecording } from "../videos/model"
