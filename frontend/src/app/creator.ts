import type { Creator, Profile } from "./types"

// Small creator facts the sidebar, the top bar and the creator pages all need.

export const PLATFORM_NAMES: Record<string, string> = { youtube: "YouTube", twitch: "Twitch", kick: "Kick" }

/**
 * The creator's platforms that are live right now, on the channels they follow there. The main channel first, the
 * rest in the server's order (Q-09: the old one-argument sort left that order to the browser).
 */
export function liveOn(c: Creator): [string, Profile][] {
  const main = ([, p]: [string, Profile]) => (p.channel === c.channel ? 0 : 1)
  return Object.entries(c.profiles ?? {})
    .filter(([k, p]) => p.live && c.channels?.[k] === p.channel)
    .sort((a, b) => main(a) - main(b))
}

/** Recording now, or live somewhere: the avatar gets a red ring. */
export const isOnAir = (c: Creator) => !!c.live_job || liveOn(c).length > 0

/** The creator's picture: their main channel's, or one platform's (`platform`). Changes address when it changes. */
export function avatarUrl(c: Creator, platform?: string) {
  const at = (platform ? c.profiles?.[platform] : c.profile)?.at ?? 0
  return `/api/creators/${encodeURIComponent(c.id)}/avatar?${platform ? `p=${platform}&` : ""}v=${Math.round(at)}`
}

/** A picture only when the main channel's profile has one. */
export const hasPic = (c: Creator) => !!c.profile?.pic && c.profile.channel === c.channel

/** 1234 → "1.2K", 2000000 → "2M". */
export function fmtK(n: unknown) {
  const v = Number(n) || 0
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M"
  if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, "") + "K"
  return String(v)
}
