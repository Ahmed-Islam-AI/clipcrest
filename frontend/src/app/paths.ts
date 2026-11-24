import type { Status } from "./types"

// App addresses, relative to the router's basename "/app" (so "/" is /app). See the route table in README.md.

export const CREATOR_TABS = ["clips", "setup", "activity"] as const
export type CreatorTab = (typeof CREATOR_TABS)[number]

export const paths = {
  home: "/",
  videos: "/videos",
  usage: "/usage",
  /** The Clips tab is left out of the address, as before. */
  creator: (id: string, tab?: string) => `/creators/${encodeURIComponent(id)}${tab && tab !== "clips" ? "/" + tab : ""}`,
  settings: (tab?: string) => "/settings" + (tab ? "/" + tab : ""),
}

/**
 * The Settings sections this user may see, in order (APP-SET-02): AI (admins), Profile and Security (sign-in on),
 * Connected apps (everyone), Storage (admins).
 */
export function settingsTabs(s: Status | undefined) {
  const admin = !!s?.user?.is_admin
  return [
    ...(admin ? [{ key: "ai", label: "AI", hint: "Your AI service, model and key" }] : []),
    ...(s?.accounts === false ? [] : [
      { key: "profile", label: "Profile", hint: "Your name, email and how you sign in" },
      { key: "security", label: "Security", hint: "Password and signing out" },
    ]),
    { key: "apps", label: "Connected apps", hint: "Where your clips get posted" },
    ...(admin ? [{ key: "storage", label: "Storage", hint: "Where videos and clips are kept" }] : []),
  ]
}

/** The old page's name for a view ("overview", "library", "settings", "usage", "c:<id>"), from an app address. */
export function viewOf(pathname: string) {
  const [, a, b] = pathname.split("/")
  if (a === "creators" && b) {
    try {
      return "c:" + decodeURIComponent(b)
    } catch {
      return "c:" + b
    }
  }
  return ({ "": "overview", videos: "library", settings: "settings", usage: "usage" } as Record<string, string>)[a ?? ""] ?? "overview"
}
