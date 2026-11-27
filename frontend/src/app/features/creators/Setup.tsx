import { useRef, useState, type ChangeEvent, type ReactNode } from "react"
import { useNavigate } from "react-router"
import { cn } from "cn"
import { CheckIcon, SettingsIcon, Trash2Icon, TriangleAlertIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, send } from "@/app/api"
import { ask, askTyped } from "@/app/confirm"
import { avatarUrl, fmtK, PLATFORM_NAMES } from "@/app/creator"
import { paths } from "@/app/paths"
import { patchSync, refreshSync, useAccounts, useJobs, useStatus } from "@/app/sync"
import { toast } from "@/app/toast"
import type { Creator } from "@/app/types"
import { Field, Sec } from "../settings/bits"
import { selectClass } from "../settings/form"
import { CaptionPreview, LayoutPreview } from "../videos/Composer"
import { attempt } from "../videos/model"
import { PLAT, type LiveProfile } from "./live"
import { PlatLogo } from "./Stream"

// A creator's Setup tab (APP-CRE-04..11): their channels, how the AI judges their streams, how their clips look,
// where they are posted, and deleting them.
//
// The fields are drawn once, when Setup opens, and again only on Discard or after saving, so polling never
// overwrites what is being typed (APP-CRE-13). Text, number and drop-down fields wait for "Save changes"; switches and
// account boxes save at once, each on its own (Q-19: they used to send the whole form, unsaved typing included).

// The fields the save bar covers. They are kept, and sent, as the text in the box, as before: the server turns them
// into numbers and keeps them in range.
const FIELDS = [
  "ai_every_min", "live_per_hour", "decide_mode", "min_score", "must_clip_min", "min_gap_min", "trigger_words",
  "style", "layout", "game", "min_len", "max_len", "max_clips", "buffer_min",
  "post_min_score", "post_gap_min", "daily_cap", "privacy", "rate_per_1k", "post_footer",
] as const
type Key = (typeof FIELDS)[number]
type Form = Record<Key, string>
const formOf = (c: Creator) => Object.fromEntries(FIELDS.map((k) => [k, String((k === "ai_every_min" ? c[k] || 3 : c[k]) ?? "")])) as Form

type Flags = { auto_watch: boolean; captions: boolean; autopost: boolean; accounts: string[] }
const flagsOf = (c: Creator): Flags => ({
  auto_watch: !!c.auto_watch,
  captions: c.captions !== false,
  autopost: !!c.autopost,
  accounts: Array.isArray(c.accounts) ? (c.accounts as string[]) : [],
})

const EVERY = { 1: "1 minute", 2: "2 minutes", 3: "3 minutes", 5: "5 minutes", 10: "10 minutes" }
const DECIDE = { both: "Both judges say yes", either: "Both say yes, or the words judge is very sure (90+)" }
const MUST = { 0: "Off", 15: "15 minutes", 30: "30 minutes", 60: "1 hour", 120: "2 hours" }
const PRIVACY = { public: "Public", unlisted: "Unlisted", private: "Private" }
const opts = (map: Record<string, string>) => Object.entries(map).map(([k, v]) => <option key={k} value={k}>{v}</option>)

function costHint(every: string) {
  const e = Number(every) || 3
  return `About ${Math.round((60 / e) * 2)} AI calls per live hour at most. Each check covers everything since the last one, so slower checks don't miss moments; they find them later.`
}

const GRID = "grid gap-x-5 gap-y-4 @min-[640px]/main:grid-cols-2"

// A real checkbox (it saves at once, and tests and screen readers know it as one), drawn as a switch.
const SWITCH =
  "relative mt-px h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line-2 transition-colors outline-none before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-white before:transition-transform hover:bg-faint/60 checked:bg-brand-deep checked:before:translate-x-4 checked:hover:bg-brand-deep/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:before:transition-none"

function Toggle({ label, hint, checked, onChange, className }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={cn("flex w-fit cursor-pointer items-start gap-3", className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className={SWITCH} />
      <span className="flex flex-col gap-0.5 text-sm font-medium text-foreground">
        {label}
        {hint && <small className="text-xs font-normal text-dim">{hint}</small>}
      </span>
    </label>
  )
}

export function Setup({ c }: { c: Creator }) {
  const navigate = useNavigate()
  const status = useStatus()
  const accounts = useAccounts()
  const nJobs = useJobs().filter((j) => j.creator === c.id).length
  const [base, setBase] = useState(() => formOf(c)) // what the fields showed when drawn or last saved
  const [form, setForm] = useState(base)
  const [flags, setFlags] = useState(() => flagsOf(c))
  const [saving, setSaving] = useState(false)
  const dirty = FIELDS.some((k) => form[k] !== base[k])
  const url = `/api/creators/${encodeURIComponent(c.id)}`

  const bind = (k: Key, hint?: boolean) => ({
    id: "c_" + k,
    value: form[k],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value })),
    "aria-describedby": hint ? `c_${k}-hint` : undefined,
  })
  const box = (k: Key, label: string, control: ReactNode, o: { hint?: ReactNode; wide?: boolean } = {}) => (
    <Field id={"c_" + k} label={label} hint={o.hint} className={o.wide ? "col-span-full" : undefined}>{control}</Field>
  )

  /** A switch or account box: shown at once, saved on its own, put back if the save fails. */
  const flip = async <K extends keyof Flags>(k: K, v: Flags[K]) => {
    const was = flags[k]
    setFlags((f) => ({ ...f, [k]: v }))
    if (k === "autopost" && v && !(await ask("Turn on auto-posting?", "Clips that score high enough will be posted to the ticked accounts without you seeing them first.", "Turn on"))) {
      setFlags((f) => ({ ...f, [k]: was }))
      return
    }
    try {
      await send(url, { [k]: v }, "PUT")
      await refreshSync()
    } catch (e) {
      setFlags((f) => ({ ...f, [k]: was }))
      toast((e as Error).message, "bad")
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const saved = await send<Creator>(url, { ...form, ...flags }, "PUT")
      const f = formOf(saved) // as the server kept it (numbers brought into range)
      setBase(f)
      setForm(f)
      toast("Saved", "ok")
      await refreshSync()
    } catch (e) {
      toast((e as Error).message, "bad")
    } finally {
      setSaving(false)
    }
  }
  const discard = () => {
    const f = formOf(c)
    setBase(f)
    setForm(f)
    toast("Changes discarded")
  }
  const remove = () =>
    attempt(async () => {
      const what = nJobs ? `, and their ${nJobs} video${nJobs === 1 ? "" : "s"} with all the clips` : ""
      if (!(await askTyped(`Delete ${c.name}?`, `This removes the creator, their settings${what} for good. It cannot be undone.`, c.name, "Delete creator"))) return
      await api(url, { method: "DELETE" })
      navigate(paths.home)
      patchSync((d) => ({ ...d, creators: d.creators.filter((x) => x.id !== c.id), jobs: d.jobs.filter((j) => j.creator !== c.id) }))
      toast("Creator deleted", "ok")
      await refreshSync()
    })

  return (
    <div className="flex max-w-[880px] flex-col">
      <Sec title="Their stream" help="Where to record from, and whether to start by itself.">
        <Channels c={c} />
        <Toggle
          className="mt-5"
          label="Record automatically when they go live"
          hint="Checks straight away, then every two minutes."
          checked={flags.auto_watch}
          onChange={(v) => flip("auto_watch", v)}
        />
      </Sec>

      <Sec
        title="How the AI decides"
        help="Two separate AI checks. The words judge reads only what was said. The reaction judge sees only how loud the streamer got and how busy chat was, never the words."
      >
        <div className={GRID}>
          {box("ai_every_min", "Check the live stream every", <select className={selectClass} {...bind("ai_every_min", true)}>{opts(EVERY)}</select>, { hint: costHint(form.ai_every_min) })}
          <p className="col-span-full text-sm text-dim">
            On top of that, the AI always looks straight away when the stream suddenly gets louder or chat gets busier, and when someone says "clip" or "clip it".
          </p>
          {box("live_per_hour", "Most live clips per hour", <Input type="number" min={1} max={60} {...bind("live_per_hour")} />)}
          {box("decide_mode", "Make a clip when", <select className={selectClass} {...bind("decide_mode")}>{opts(DECIDE)}</select>)}
          {box("min_score", "Words judge must score at least", <Input type="number" min={0} max={100} {...bind("min_score")} />)}
          {box("must_clip_min", "Make sure there's a live clip at least every", <select className={selectClass} {...bind("must_clip_min")}>{opts(MUST)}</select>)}
          {box("min_gap_min", "Minimum gap between live clips (minutes)", <Input type="number" min={0} max={60} {...bind("min_gap_min")} />)}
          {box("trigger_words", "Always clip the last 30 seconds when someone says", <Input placeholder="clip that, clip it" {...bind("trigger_words", true)} />, {
            hint: "Separate phrases with commas. Matched on the transcript, so it needs no AI call.",
            wide: true,
          })}
        </div>
      </Sec>

      <Sec title="Clips" help="How this creator's clips look.">
        <div className={GRID}>
          <Toggle className="col-span-full" label="Generate captions" checked={flags.captions} onChange={(v) => flip("captions", v)} />
          {box("style", "Caption style", <>
            <select className={selectClass} disabled={!flags.captions} {...bind("style")}>{opts(status?.styles ?? {})}</select>
            <CaptionPreview style={form.style} />
          </>)}
          {box("layout", "Layout", <>
            <select className={selectClass} {...bind("layout")}>{opts(status?.layouts ?? {})}</select>
            <LayoutPreview layout={form.layout} />
          </>)}
          {box("game", "Game", <Input placeholder="Read from the title" {...bind("game", true)} />, {
            hint: "Left empty, the game is read from the stream's title. Set it for a streamer whose title says nothing: GTA 6, Fortnite, Elden Ring.",
          })}
          {box("min_len", "Shortest clip (seconds)", <Input type="number" {...bind("min_len")} />)}
          {box("max_len", "Longest clip (seconds)", <Input type="number" {...bind("max_len")} />)}
          {box("max_clips", "Clips per video", <Input type="number" {...bind("max_clips")} />)}
          {box("buffer_min", "Minutes of live stream to keep", <Input type="number" {...bind("buffer_min")} />)}
        </div>
      </Sec>

      <Sec
        title="Posting"
        help={accounts.length ? "Choose the accounts this creator's clips go to. One account can be shared by several creators." : "No accounts are connected yet. Connect one in Settings, then come back."}
      >
        {accounts.length ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {accounts.map((a) => (
              <label
                key={a.id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line-2 px-3 py-2 text-sm transition-colors hover:bg-muted has-checked:border-brand-deep has-checked:bg-brand-soft has-focus-visible:outline-2 has-focus-visible:outline-ring"
              >
                <input
                  type="checkbox"
                  checked={flags.accounts.includes(a.id)}
                  onChange={(e) => flip("accounts", e.target.checked ? [...flags.accounts, a.id] : flags.accounts.filter((x) => x !== a.id))}
                  className="size-4 accent-brand-deep outline-none"
                />
                {a.label} · {a.name}
              </label>
            ))}
          </div>
        ) : (
          // straight to Connected apps (the old button opened the first Settings tab, which is AI for admins: Q-08)
          <Button className="mb-5 w-fit" onClick={() => navigate(paths.settings("apps"))}><SettingsIcon />Open Settings</Button>
        )}
        <div className={GRID}>
          <Toggle
            className="col-span-full"
            label="Post new clips automatically"
            hint="Clips that score high enough go out without you approving them."
            checked={flags.autopost}
            onChange={(v) => flip("autopost", v)}
          />
          {box("post_min_score", "Only auto-post clips scoring at least", <Input type="number" min={0} max={100} {...bind("post_min_score")} />)}
          {box("post_gap_min", "Minutes between posts on one account", <Input type="number" {...bind("post_gap_min")} />)}
          {box("daily_cap", "Most posts per account per day", <Input type="number" {...bind("daily_cap")} />)}
          {box("privacy", "Who can see posts (YouTube, TikTok)", <select className={selectClass} {...bind("privacy")}>{opts(PRIVACY)}</select>)}
          {box("rate_per_1k", "Campaign pay per 1,000 views ($)", <Input type="number" step="0.1" min={0} {...bind("rate_per_1k")} />)}
          {box("post_footer", "Line added to every post (credit, campaign tag)", <Input placeholder="Clipped from @streamer" {...bind("post_footer")} />, { wide: true })}
        </div>
      </Sec>

      <Sec danger title="Delete this creator" help={`Removes ${c.name}, their settings and every video and clip filed under them. This cannot be undone.`}>
        <Button variant="danger" className="w-fit" onClick={remove}><Trash2Icon />Delete creator</Button>
      </Sec>

      {dirty && (
        <div className="sticky bottom-4 z-[4] mt-6 flex flex-wrap items-center gap-2.5 rounded-xl bg-frame py-2.5 pr-2.5 pl-4 text-frame-text animate-in fade-in-0 slide-in-from-bottom-3 motion-reduce:animate-none">
          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
            <TriangleAlertIcon aria-hidden className="size-4 shrink-0 text-brand" />
            You have unsaved changes
          </span>
          <Button variant="ghost" className="text-frame-text hover:bg-white/10 hover:text-white" onClick={discard}>Discard</Button>
          <Button variant="primary" disabled={saving} onClick={save}><CheckIcon />Save changes</Button>
        </div>
      )}
    </div>
  )
}

/**
 * "Their stream": one row per platform (APP-CRE-04, APP-CRE-05). An empty platform has a link box and "Connect"; a
 * connected one shows who it is, Live or Offline once checked, "Record from" when there are several, and ✕. These
 * rows follow the synced creator, so a channel's name and picture appear as soon as the look-up finishes.
 */
function Channels({ c }: { c: Creator }) {
  const chs = c.channels ?? {}
  const many = Object.keys(chs).length > 1
  const [typed, setTyped] = useState<Record<string, string>>({})
  const [main, setMain] = useState<string | null>(null) // the "Record from" choice while it is being saved
  const boxes = useRef<Record<string, HTMLInputElement | null>>({})

  const save = (channels: Record<string, string>, main?: string, done?: () => void) =>
    attempt(async () => {
      await send(`/api/creators/${encodeURIComponent(c.id)}`, main ? { channels, channel: main } : { channels }, "PUT")
      done?.()
      await refreshSync()
    })
  const connect = (k: string) => {
    const v = (typed[k] ?? "").trim()
    if (!v) {
      boxes.current[k]?.focus()
      return toast(`Paste their ${PLATFORM_NAMES[k]} channel link.`, "bad")
    }
    save({ ...chs, [k]: /^https?:\/\//.test(v) ? v : "https://" + v }, undefined, () => setTyped((t) => ({ ...t, [k]: "" })))
  }
  const row = "flex min-h-16 items-center gap-3 rounded-xl bg-muted px-3 py-2.5"

  return (
    <div className="flex flex-col gap-2">
      {Object.keys(PLAT).map((k) => {
        const name = PLATFORM_NAMES[k], link = chs[k]
        if (!link)
          return (
            <form
              key={k}
              className={row}
              onSubmit={(e) => {
                e.preventDefault()
                connect(k)
              }}
            >
              <PlatLogo k={k} className="size-9 rounded-[10px]" />
              <Input
                ref={(el) => {
                  boxes.current[k] = el
                }}
                value={typed[k] ?? ""}
                onChange={(e) => setTyped((t) => ({ ...t, [k]: e.target.value }))}
                placeholder={PLAT[k].hint}
                aria-label={`${name} channel link`}
                spellCheck={false}
                autoComplete="off"
                className="flex-1"
              />
              <Button type="submit" size="sm">Connect</Button>
            </form>
          )
        const pr = c.profiles?.[k] as LiveProfile | undefined
        const ok = !!pr && pr.channel === link
        return (
          <div key={k} className={cn(row, "max-[640px]:flex-wrap")}>
            <PlatLogo k={k} className="size-9 rounded-[10px]" />
            {ok && pr.pic && <img src={avatarUrl(c, k)} alt="" className="size-10 shrink-0 rounded-full bg-line object-cover" />}
            <div className="min-w-0 flex-1">
              <b className="block truncate text-sm font-semibold text-foreground">{ok && pr.name ? pr.name : link}</b>
              <span className="text-xs text-dim">{[name, ok ? pr.followers : "Looking it up…"].filter(Boolean).join(" · ")}</span>
            </div>
            {ok && pr.live_at ? (
              pr.live ? (
                <Badge variant="bad">
                  <span aria-hidden className="size-1.5 animate-live rounded-full bg-current motion-reduce:animate-none" />
                  Live{pr.viewers ? " · " + fmtK(pr.viewers) : ""}
                </Badge>
              ) : (
                <Badge>Offline</Badge>
              )
            ) : null}
            {many && (
              <label
                title="Start recording uses this channel unless another one is live"
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-dim max-[640px]:order-last"
              >
                <input
                  type="radio"
                  name={"main-" + c.id}
                  checked={(main ?? c.channel) === link}
                  onChange={() => {
                    setMain(link)
                    save(chs, link).finally(() => setMain(null))
                  }}
                  className="size-[15px] accent-brand-deep"
                />
                Record from
              </label>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              title="Remove"
              aria-label={`Remove ${name} channel`}
              onClick={() => {
                const next = { ...chs }
                delete next[k]
                save(next)
              }}
            >
              <XIcon />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
