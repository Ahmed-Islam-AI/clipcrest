// What the server sends to the app. The fields the shell itself uses are listed; every object also allows more
// (the index signature), so a feature can read a field that is not listed yet by narrowing it where it uses it.

export type User = {
  id: string
  email: string
  name: string
  is_admin: boolean
  role: "admin" | "user"
  has_password: boolean
  google: boolean
  created_at: number
  verified: boolean
  photo: number // a stamp for /api/me/photo?v=, 0 when there is no picture
}

/** The AI card numbers (usage.brief() on the server). */
export type AiBrief = {
  ready: boolean
  provider: string
  model: string
  today_calls: number
  today_tokens: number
  problem: string // why the AI is not answering, "" when it is fine
}

/** A newer ClipCrest on GitHub (updates.latest()). Only admins get it, everyone else gets null. */
export type Update = {
  current: string
  latest: string
  behind: number | null
  notes: { title: string; date: string }[]
  url: string
  restart: boolean // the new files are already in place: only a restart is left
}

/** GET /api/status */
export type Status = {
  user: User
  update: Update | null
  accounts: boolean // false: sign-in is off, one built-in owner
  disk_full: boolean
  no_ffmpeg: boolean
  links: { repo: string; follow: string; earn: string | null }
  ai: AiBrief
  unread: number
  tour: boolean // true until the guided tour was closed once
  earn_url: string | null
  earn_only: boolean
  youtube: boolean
  connect: Record<string, boolean>
  max_upload_mb: number
  upload_part_mb: number
  max_batch: number
  styles: Record<string, string>
  layouts: Record<string, string>
  [key: string]: unknown
}

export type JobStatus = "queued" | "running" | "rendering" | "live" | "done" | "error"

export type Clip = {
  id: string
  status: string
  [key: string]: unknown
}

export type Job = {
  id: string
  kind?: string
  status: JobStatus
  creator: string | null
  clips: Clip[]
  [key: string]: unknown
}

/** One platform profile of a creator, filled in by the server's channel look-up. */
export type Profile = {
  channel?: string
  pic?: string
  at?: number
  live?: boolean
  viewers?: number | null
  [key: string]: unknown
}

export type Creator = {
  id: string
  name: string
  channel: string // the main channel
  channels: Record<string, string> // platform → channel address
  profile?: Profile // the main channel's profile
  profiles?: Record<string, Profile>
  live_job: string | null // the recording now running, if any
  log?: unknown[]
  auto_watch?: boolean
  [key: string]: unknown
}

export type Account = {
  id: string
  platform: string
  label: string
  name: string
  added: number
  detail: string
}

/** What /api/sync brought last time, plus when (for clocks that count between syncs). */
export type SyncData = {
  jobs: Job[]
  creators: Creator[]
  accounts: Account[]
  at: number
}

export type Notice = {
  id: number
  t: number
  kind: string
  title: string
  body: string
  link: string
  read: boolean
}
