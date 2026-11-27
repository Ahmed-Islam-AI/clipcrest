// Home (APP-HOME): the hero with the composer, the four tiles, the activity chart, the AI card, the next steps, the
// creators table and the post queue.
import type { ReactNode } from "react"
import { useNavigate } from "react-router"
import { cn } from "cn"
import { ArrowRightIcon, ClockIcon, PauseIcon, PlayIcon, PlusIcon, RadioIcon, ScissorsIcon, SendIcon, TriangleAlertIcon } from "lucide-react"
import { StatusBadge } from "@/components/brand/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api, send } from "@/app/api"
import { fmtK } from "@/app/creator"
import { newCreator } from "@/app/flags"
import { paths } from "@/app/paths"
import { PageBody } from "@/app/shell/bits"
import { refreshSync, useOverview, useStatus, useSyncData } from "@/app/sync"
import { Composer } from "../videos/Composer"
import { Empty } from "../videos/JobList"
import { attempt, clock } from "../videos/model"
import { GradientAscii } from "@/components/brand/GradientAscii"

type Row = {
  id: string; name: string; state: "recording" | "waiting" | "idle"; autopost: boolean; clips_today: number; clips_total: number
  posted_today: number; posted_total: number; queued: number; failed: number; views: number; earnings: number
}
type QPost = { id: string; status: string; title: string; url?: string; error?: string; creator_name?: string; account_name: string; views?: number | null; due_at: number }
type Overview = { paused: boolean; recording: number; creators: Row[]; posts: QPost[]; daily: { day: string; clips: number; posted: number; views: number }[] }

export default function Home() {
  const o = useOverview<Overview>()
  return (
    <>
      <section className="relative px-4 pt-11 pb-13 text-center @min-[640px]/main:px-7 max-[560px]:pt-10 max-[560px]:pb-7">
        <GradientAscii className="pointer-events-none absolute inset-x-0 top-6 -bottom-10 z-0 select-none [mask-image:linear-gradient(to_bottom,transparent_0%,black_14%,black_70%,transparent_100%)]" />
        <div className="relative z-[2]">{/* above the dashboard below, so the composer's pop-up lists are not covered */}
          <h2 className="text-[clamp(21px,5.2vw,28px)] leading-tight font-bold tracking-[-0.03em] text-balance text-foreground">What do you want to clip today?</h2>
          <p className="mx-auto mt-2 mb-5.5 max-w-[520px] text-[15px] text-dim max-[560px]:text-sm">Paste a link or drop in videos. You get captioned shorts back.</p>
          <Composer hero />
        </div>
      </section>
      {/* a failed load shows nothing until a later one works (APP-HOME-02) */}
      <PageBody className="relative z-[1] pt-0! gap-4">{o.data && <Dashboard o={o.data} reload={() => o.refetch()} />}</PageBody>
    </>
  )
}

function Card({ title, sub, action, className, children }: { title: string; sub?: ReactNode; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-card p-5 max-[560px]:p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          {sub && <p className="mt-0.5 text-[13px] text-dim">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Dashboard({ o, reload }: { o: Overview; reload: () => Promise<unknown> }) {
  const status = useStatus()
  const { jobs, creators, accounts } = useSyncData()
  const navigate = useNavigate()
  const sum = (k: keyof Row) => o.creators.reduce((a, r) => a + Number(r[k] || 0), 0)
  const d14 = (k: "clips" | "posted") => (o.daily || []).reduce((a, d) => a + d[k], 0)
  const failed = sum("failed")
  const act = (fn: () => Promise<unknown>) =>
    attempt(async () => {
      await fn()
      await reload()
      await refreshSync()
    })

  // Set-up steps still open (APP-HOME-06)
  const steps: [string, string, () => void][] = []
  if (!creators.length) steps.push(["Add your first creator", "Give each streamer their own workspace, settings and folder.", newCreator.open])
  if (!jobs.length) steps.push(["Make your first clips", "Paste a video link in the box above.", () => document.getElementById("url")?.focus()])
  if (!accounts.length) steps.push(["Connect a posting account", "YouTube, Instagram or TikTok, in one click.", () => navigate(paths.settings("apps"))]) // Q-08: straight to Connected apps
  if (creators.length && !creators.some((c) => c.auto_watch)) steps.push(["Turn on auto-record", "Record by itself whenever a creator goes live.", () => navigate(paths.creator(creators[0].id, "setup"))])

  const ai = status?.ai
  const num = "px-3 py-2.5 text-right tabular-nums"

  return (
    <>
      <div data-tour="tiles" className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[560px]:gap-2.5">
        <Tile icon={<RadioIcon />} value={o.recording}>Recording now</Tile>
        <Tile icon={<ScissorsIcon />} value={sum("clips_today")}>Clips today</Tile>
        <Tile icon={<SendIcon />} value={sum("posted_today")}>Posted today</Tile>
        <Tile icon={failed ? <TriangleAlertIcon /> : <ClockIcon />} value={sum("queued")}>
          Waiting to post{failed ? <> · <span className="text-bad">{failed} failed</span></> : ""}
        </Tile>
      </div>

      <div className="grid grid-cols-[minmax(0,1.9fr)_minmax(300px,1fr)] gap-4 max-[1100px]:grid-cols-1">
        <Card
          title="Activity"
          sub="Last 14 days"
          action={
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Kpi value={d14("clips")}>Clips made</Kpi>
              <Kpi value={d14("posted")}>Posted</Kpi>
              <Kpi value={sum("views").toLocaleString()}>Views</Kpi>
              <Kpi value={"$" + sum("earnings").toFixed(2)}>Est. earnings</Kpi>
            </div>
          }
        >
          <div className="mt-auto flex flex-col gap-2">
            <div className="flex gap-4 text-xs text-dim">
              <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-brand" />Clips made</span>
              <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-frame" />Posted</span>
            </div>
            <BarChart daily={o.daily || []} />
          </div>
        </Card>
        {ai && (
          <Card title="AI">
            <div>
              <div className="text-[22px] font-bold tracking-[-0.02em] text-foreground">{ai.ready ? ai.provider || "Ready" : "Not set up"}</div>
              <p className="mt-0.5 text-[13px] text-dim">{ai.ready ? ai.model || "" : "Clips are picked by loudness until an AI key is added."}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted px-3 py-2.5"><b className="block text-lg font-bold tabular-nums">{(ai.today_calls || 0).toLocaleString()}</b><span className="text-xs text-dim">AI calls today</span></div>
              <div className="rounded-lg bg-muted px-3 py-2.5"><b className="block text-lg font-bold tabular-nums">{fmtK(ai.today_tokens)}</b><span className="text-xs text-dim">Tokens today</span></div>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              {!ai.ready && status?.user?.is_admin && <Button variant="primary" onClick={() => navigate(paths.settings("ai"))}><PlusIcon />Add AI key</Button>}
              <Button onClick={() => navigate(paths.usage)}>View usage <ArrowRightIcon /></Button>
            </div>
          </Card>
        )}
      </div>

      {steps.length > 0 && (
        <Card title="Next steps" sub="Finish setting up ClipCrest">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-2">
            {steps.map(([t, d, go], i) => (
              <button key={t} type="button" onClick={go} className="group flex cursor-pointer items-center gap-3 rounded-lg border border-line p-3 text-left transition-colors outline-none hover:border-brand-line hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-ring">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-bold text-brand-deep group-hover:bg-brand">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm font-semibold text-foreground">{t}</b>
                  <span className="block text-[13px] text-dim">{d}</span>
                </span>
                <ArrowRightIcon className="size-4 shrink-0 text-faint group-hover:text-brand-deep" aria-hidden />
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card title="Creators" sub="Each creator's status and results">
        {o.creators.length ? (
          <div className="-mx-5 overflow-x-auto max-[560px]:-mx-4">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs text-dim">
                <tr className="border-b border-line">
                  <th className="px-3 py-2 font-medium first:pl-5">Creator</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Auto-post</th>
                  <th className={num + " font-medium"}>Clips today</th><th className={num + " font-medium"}>Posted today</th><th className={num + " font-medium"}>Waiting</th>
                  <th className={num + " font-medium"}>Failed</th><th className={num + " font-medium"}>Views</th><th className={num + " font-medium last:pr-5"}>Est. $</th>
                </tr>
              </thead>
              <tbody>
                {o.creators.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2.5 pl-5">
                      <a href={"/app" + paths.creator(r.id)} onClick={(e) => { e.preventDefault(); navigate(paths.creator(r.id)) }} className="font-semibold text-brand-deep underline-offset-2 hover:underline">{r.name}</a>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge state={r.state} /></td>
                    <td className="px-3 py-2.5">{r.autopost ? <Badge variant="ok">On</Badge> : <Badge>Off</Badge>}</td>
                    <td className={num}>{r.clips_today} <span className="text-dim">/ {r.clips_total}</span></td>
                    <td className={num}>{r.posted_today} <span className="text-dim">/ {r.posted_total}</span></td>
                    <td className={num}>{r.queued}</td>
                    <td className={num}>{r.failed}</td>
                    <td className={num}>{r.views.toLocaleString()}</td>
                    <td className={num + " pr-5"}>{r.earnings.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No creators yet">Add one to give each streamer their own workspace.</Empty>
        )}
      </Card>

      <Card
        title="Post queue"
        sub={o.paused ? "Paused. Recording and clipping carry on; nothing is posted." : "Queued clips go out at their scheduled time."}
        action={
          <Button variant={o.paused ? "primary" : "secondary"} onClick={() => act(() => send("/api/settings", { paused: !o.paused }, "PUT"))}>
            {o.paused ? <PlayIcon /> : <PauseIcon />}
            {o.paused ? "Resume posting" : "Pause all posting"}
          </Button>
        }
      >
        {o.posts.length ? (
          <div className="-mx-5 max-[560px]:-mx-4 min-[641px]:overflow-x-auto">
            {/* on phones each row stacks, with its labels (APP-HOME-08) */}
            <table className="w-full text-sm max-[640px]:block">
              <thead className="text-left text-xs text-dim max-[640px]:hidden">
                <tr className="border-b border-line">
                  <th className="px-3 py-2 pl-5 font-medium">When</th><th className="px-3 py-2 font-medium">Clip</th><th className="px-3 py-2 font-medium">Creator</th>
                  <th className="px-3 py-2 font-medium">Account</th><th className={num + " font-medium"}>Views</th><th className="px-3 py-2 pr-5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="max-[640px]:block">
                {o.posts.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0 max-[640px]:grid max-[640px]:grid-cols-[88px_1fr] max-[640px]:gap-x-3 max-[640px]:gap-y-1.5 max-[640px]:px-4 max-[640px]:py-3 max-[640px]:[&>td]:contents max-[640px]:[&>td]:before:text-xs max-[640px]:[&>td]:before:text-dim max-[640px]:[&>td]:before:content-[attr(data-l)]">
                    <td data-l="Status" className="px-3 py-2.5 pl-5">
                      <span>{p.status === "scheduled" ? <StatusBadge state="waiting" label={clock(p.due_at)} /> : <StatusBadge state={p.status} />}</span>
                    </td>
                    <td data-l="Clip" className="px-3 py-2.5">
                      <span className="min-w-0">
                        {p.url ? <a href={p.url} target="_blank" rel="noopener" className="font-medium text-brand-deep underline-offset-2 hover:underline">{p.title}</a> : <span className="font-medium">{p.title}</span>}
                        {p.error && <span className="mt-0.5 block text-xs text-bad">{p.error}</span>}
                      </span>
                    </td>
                    <td data-l="Creator" className="px-3 py-2.5"><span>{p.creator_name || "None"}</span></td>
                    <td data-l="Account" className="px-3 py-2.5"><span>{p.account_name}</span></td>
                    <td data-l="Views" className={num + " max-[640px]:text-left"}><span>{p.views ?? "–"}</span></td>
                    <td data-l="" className="px-3 py-2.5 pr-5 text-right max-[640px]:before:hidden">
                      <span className="max-[640px]:col-span-2">
                        {p.status === "scheduled" ? (
                          <Button size="sm" onClick={() => act(() => api(`/api/posts/${encodeURIComponent(p.id)}/cancel`, { method: "POST" }))}>Cancel</Button>
                        ) : p.status === "failed" ? (
                          <Button size="sm" onClick={() => act(() => api(`/api/posts/${encodeURIComponent(p.id)}/retry`, { method: "POST" }))}>Retry</Button>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-dim">Nothing queued or posted yet.</p>
        )}
      </Card>
    </>
  )
}

function Tile({ icon, value, children }: { icon: ReactNode; value: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-card p-4.5 max-[560px]:p-3.5">
      <i aria-hidden className="mb-2 grid size-8 place-items-center rounded-lg bg-brand-soft text-brand-deep not-italic [&_svg]:size-4">{icon}</i>
      <b className="text-2xl font-bold tracking-[-0.02em] text-foreground tabular-nums">{value}</b>
      <span className="text-[13px] text-dim">{children}</span>
    </div>
  )
}

function Kpi({ value, children }: { value: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <b className="text-lg font-bold text-foreground tabular-nums">{value}</b>
      <span className="text-xs text-dim">{children}</span>
    </div>
  )
}

/** Two bars a day, clips made and posted; hovering a day says its numbers (APP-HOME-04). */
function BarChart({ daily }: { daily: Overview["daily"] }) {
  const W = 720, H = 230, pl = 30, pb = 28, pt = 12, n = Math.max(1, daily.length), ch = H - pt - pb
  const peak = Math.max(1, ...daily.map((d) => Math.max(d.clips, d.posted)))
  const step = Math.max(1, Math.ceil(peak / 4)), top = step * 4, cw = (W - pl) / n, bw = Math.min(14, (cw - 10) / 2)
  const y = (v: number) => pt + ch * (1 - v / top)
  const label = (day: string) => new Date(day + "T12:00").toLocaleDateString([], { day: "numeric", month: "short" })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Clips made and posted per day, last 14 days" className="block h-auto w-full text-[11px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line x1={pl} x2={W} y1={y(i * step)} y2={y(i * step)} className="stroke-line" />
          <text x={pl - 8} y={y(i * step) + 4} textAnchor="end" className="fill-faint">{i * step}</text>
        </g>
      ))}
      {daily.map((d, i) => {
        const cx = pl + i * cw + cw / 2, lab = label(d.day)
        return (
          <g key={d.day}>
            <g>
              <title>{`${lab}: ${d.clips} clips made, ${d.posted} posted${d.views ? ", " + d.views.toLocaleString() + " views" : ""}`}</title>
              <rect x={cx - bw - 1} y={y(d.clips)} width={bw} height={Math.max(0, (ch * d.clips) / top)} rx={3} className="fill-brand" />
              <rect x={cx + 1} y={y(d.posted)} width={bw} height={Math.max(0, (ch * d.posted) / top)} rx={3} className="fill-frame" />
              <rect x={pl + i * cw} y={pt} width={cw} height={ch} fill="transparent" />
            </g>
            {i % 2 === (n - 1) % 2 && <text x={cx} y={H - 8} textAnchor="middle" className="fill-faint">{i === n - 1 ? "Today" : lab}</text>}
          </g>
        )
      })}
      {daily.every((d) => !d.clips && !d.posted) && (
        <text x={(W + pl) / 2} y={pt + ch / 2} textAnchor="middle" className="fill-dim text-[13px]">No clips in the last 14 days yet</text>
      )}
    </svg>
  )
}
