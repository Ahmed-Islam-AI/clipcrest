// Keeping the page in step with the server (APP-SYNC), the same way the old page did:
//
// - /api/sync?v=<token> answers {v} when nothing of this user's changed, or {v, jobs, creators, accounts, ai, unread}.
//   The token is "<server start id>.<user's change counter>.<queue epoch>", so after a server restart the next
//   answer brings everything again. Asked every 1s while a channel is being looked up or a recording just started,
//   2s while anything is being made, 4s otherwise, 20s while the tab is hidden; each wait starts after the answer.
//   Showing the tab again or focusing the window asks at once.
// - /api/status is asked once at start and then every 15 seconds.
// - Failures are silent: polling just carries on.
//
// Everything lands in TanStack Query, so components read it with the hooks below and redraw when it changes.

import { useEffect, useState } from "react"
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { api } from "./api"
import type { Account, AiBrief, Creator, Job, Status, SyncData } from "./types"

export const keys = {
  status: ["status"],
  sync: ["sync"],
  overview: ["overview"],
  usage: ["usage"],
} as const

const EMPTY: SyncData = { jobs: [], creators: [], accounts: [], at: 0 }

let qc: QueryClient | null = null
let token = "" // the last sync token
let chain: Promise<void> = Promise.resolve()

const statusQuery = {
  queryKey: keys.status,
  queryFn: () => api<Status>("/api/status"),
  retry: false,
  refetchOnWindowFocus: false,
  staleTime: Infinity, // refreshed by the 15-second timer and by refreshStatus(), never just because a part mounted
}

type SyncAnswer = { v: string; jobs?: Job[]; creators?: Creator[]; accounts?: Account[]; ai?: AiBrief; unread?: number }

async function pull() {
  if (!qc) return
  const got = await api<SyncAnswer>("/api/sync?v=" + encodeURIComponent(token))
  const restarted = token && got.v.split(".")[0] !== token.split(".")[0]
  token = got.v
  if (!got.jobs) {
    // Nothing of ours changed. Home data older than 20 seconds is loaded again anyway (posting times, views).
    await qc.refetchQueries({ queryKey: keys.overview, type: "active", predicate: (q) => Date.now() - q.state.dataUpdatedAt > 20000 })
    return
  }
  const creators = got.creators ?? []
  // a server from before multi-channel support sends only `channel`: show it as that platform's channel
  for (const c of creators) {
    if (!c.channels) {
      const u = c.channel || "", k = /youtu/i.test(u) ? "youtube" : /twitch/i.test(u) ? "twitch" : /kick/i.test(u) ? "kick" : ""
      c.channels = k ? { [k]: u } : {}
    }
  }
  qc.setQueryData<SyncData>(keys.sync, { jobs: got.jobs, creators, accounts: got.accounts ?? [], at: Date.now() })
  if (got.ai || got.unread != null) {
    patchStatus({ ...(got.ai ? { ai: got.ai } : {}), ...(got.unread != null ? { unread: got.unread } : {}) })
  }
  // The server started again: everything it told us may be out of date, so every query loads again.
  if (restarted) await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== keys.sync[0] })
  else await qc.invalidateQueries({ queryKey: keys.overview })
}

/** Ask the server now instead of waiting for the timer (APP-SYNC-08). Resolves when the answer is in the cache. */
export function refreshSync() {
  chain = chain.then(() => pull().catch(() => {}))
  return chain
}

/** Load /api/status again, for example after confirming an email or saving the AI settings. */
export function refreshStatus() {
  return qc?.refetchQueries({ queryKey: keys.status }) ?? Promise.resolve()
}

/** Change a few status fields in place (the bell count, the AI card) without asking the server. */
export function patchStatus(patch: Partial<Status>) {
  qc?.setQueryData<Status>(keys.status, (s) => (s ? { ...s, ...patch } : s))
}

/** Change the synced lists in place, for example to drop a deleted clip before the next sync confirms it. */
export function patchSync(fn: (d: SyncData) => SyncData) {
  qc?.setQueryData<SyncData>(keys.sync, (d) => fn(d ?? EMPTY))
}

/** The last status, for code outside components (feedback links, toasts). */
export function getStatus() {
  return qc?.getQueryData<Status>(keys.status)
}

function nextWait() {
  if (document.hidden) return 20000
  const { jobs, creators } = qc?.getQueryData<SyncData>(keys.sync) ?? EMPTY
  const waiting = creators.some((c) => (Object.keys(c.channels ?? {}).length && !c.profile?.pic) || (c.live_job && !jobs.some((j) => j.id === c.live_job)))
  const active = jobs.some((j) => ["queued", "running", "live"].includes(j.status) || j.clips.some((c) => c.status === "queued" || c.status === "rendering"))
  return waiting ? 1000 : active ? 2000 : 4000
}

/**
 * Starts the polling. Called once, by the app shell. Returns true once the first status and sync answers are in
 * (or failed): views are drawn only then, as the old page did, so a creator's page knows whether the creator exists.
 */
export function useSyncEngine() {
  const client = useQueryClient()
  const [synced, setSynced] = useState(false)
  const status = useQuery({ ...statusQuery, refetchInterval: 15000, refetchIntervalInBackground: true })

  useEffect(() => {
    qc = client
    // Like the old page: no quiet retries, no reloading on window focus (sync does that itself).
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false, refetchOnWindowFocus: false } })
    let stopped = false, timer = 0
    const loop = () => {
      timer = window.setTimeout(async () => {
        await refreshSync()
        if (!stopped) loop()
      }, nextWait())
    }
    refreshSync().then(() => {
      if (stopped) return
      setSynced(true)
      loop()
    })
    const now = () => {
      if (!document.hidden) refreshSync()
    }
    document.addEventListener("visibilitychange", now)
    window.addEventListener("focus", now)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", now)
      window.removeEventListener("focus", now)
    }
  }, [client])

  return synced && status.isFetched
}

/** GET /api/status, kept fresh. Undefined only when the very first call failed. */
export function useStatus() {
  return useQuery(statusQuery).data
}

/** Videos, creators and connected accounts from the last sync, plus `at` (when it arrived). */
export function useSyncData() {
  return useQuery({ queryKey: keys.sync, queryFn: () => EMPTY, staleTime: Infinity, enabled: false, initialData: EMPTY }).data
}

export const useJobs = () => useSyncData().jobs
export const useCreators = () => useSyncData().creators
export const useAccounts = () => useSyncData().accounts
export const useCreator = (id: string | undefined) => useSyncData().creators.find((c) => c.id === id)

/**
 * Home's data (GET /api/overview). Loaded each time Home opens, again after every sync that brought changes, and
 * when it is older than 20 seconds on a quiet sync. A failed load keeps what was there.
 */
export function useOverview<T = Record<string, unknown>>() {
  return useQuery({ queryKey: keys.overview, queryFn: () => api<T>("/api/overview"), refetchOnMount: "always" })
}

/** The AI usage page's data (GET /api/usage), loaded each time the page opens. Also refreshes the sidebar AI card. */
export function useUsage<T extends Partial<AiBrief> = Partial<AiBrief> & Record<string, unknown>>() {
  return useQuery({
    queryKey: keys.usage,
    refetchOnMount: "always",
    queryFn: async () => {
      const u = await api<T>("/api/usage")
      const s = getStatus()
      if (s) {
        const { ready, provider, model, today_calls, today_tokens } = u
        patchStatus({ ai: { ...s.ai, ready: !!ready, provider: provider ?? "", model: model ?? "", today_calls: today_calls ?? 0, today_tokens: today_tokens ?? 0 } })
      }
      return u
    },
  })
}
