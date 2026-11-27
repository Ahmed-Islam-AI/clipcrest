import { useEffect, useState, type ReactNode, type SVGProps } from "react"
import { useNavigate } from "react-router"
import { cn } from "cn"
import { ArrowUpRightIcon, SquareIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fmtK, liveOn, PLATFORM_NAMES } from "@/app/creator"
import { YouTubeIcon } from "@/app/shell/brand-icons"
import type { Creator } from "@/app/types"
import { attempt } from "../videos/model"
import { ipHost, PLAT, playerSrc, since, startRecording, stopRecording, type LiveProfile } from "./live"

const svg = (d: string) => (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d={d} /></svg>
)
const ICONS: Record<string, (p: SVGProps<SVGSVGElement>) => ReactNode> = {
  youtube: YouTubeIcon,
  twitch: svg("M11.57 4.71h1.72v5.15h-1.72zm4.72 0H18v5.15h-1.71zM6 0 1.71 4.29v15.42h5.15V24l4.28-4.29h3.43L22.29 12V0zm14.57 11.14-3.43 3.43h-3.43l-3 3v-3H6.86V1.71h13.71z"),
  kick: svg("M1.5 1.5h7v6h2.5V5h2.5V2.5H16v-1h6.5v7H20V11h-2.5v2H20v2.5h2.5v7H16v-1h-2.5V19H11v-2.5H8.5v6h-7z"),
}

/** A platform's logo on its own colour (YouTube red, Twitch purple, Kick black). Size it with `className`. */
export function PlatLogo({ k, className }: { k: string; className?: string }) {
  const Icon = ICONS[k]
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center", className)} style={{ background: PLAT[k]?.bg, color: PLAT[k]?.fg }}>
      {Icon && <Icon className="size-[55%]" />}
    </span>
  )
}

// The platform chosen with the small buttons, per creator, for this visit only (APP-LIVE-02).
const picks = new Map<string, string>()

/**
 * The live player on top of a creator page (APP-LIVE-01..06): their stream playing muted, with its details and a
 * button to record it. Drawn while they are live on one of their channels. `hidden` on Setup and Activity, so the
 * player keeps playing across tabs (APP-CRE-02).
 */
export function Stream({ c, hidden }: { c: Creator; hidden: boolean }) {
  const navigate = useNavigate()
  const [pick, setPick] = useState(() => picks.get(c.id))
  const [starting, setStarting] = useState(false)
  const [gen, setGen] = useState(0) // a new number loads the player again

  // Back on the tab after more than a minute away: reload the player so it is at the live moment again (APP-LIVE-05).
  useEffect(() => {
    let hiddenAt = 0
    const seen = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
        return
      }
      if (hiddenAt && Date.now() - hiddenAt > 60000) setGen((g) => g + 1)
      hiddenAt = 0
    }
    document.addEventListener("visibilitychange", seen)
    return () => document.removeEventListener("visibilitychange", seen)
  }, [])

  const on = liveOn(c) as [string, LiveProfile][]
  if (!on.length) return null
  const [k, p] = on.find(([x]) => x === pick) ?? on[0]
  const name = PLATFORM_NAMES[k] ?? k
  const src = playerSrc(k, p.embed)
  const stats = [
    p.viewers != null ? [fmtK(p.viewers), "watching"] : null,
    p.started ? [since(p.started), "live for"] : null,
    p.followers ? [p.followers.split(" ")[0], p.followers.split(" ").slice(1).join(" ")] : null,
  ].filter((x): x is string[] => !!x)
  const record = () => {
    setStarting(true)
    attempt(() => startRecording(c, navigate, p.channel)).finally(() => setStarting(false))
  }

  return (
    <section
      hidden={hidden}
      aria-label="Live stream"
      className="grid grid-cols-1 gap-3.5 rounded-2xl bg-frame p-3 text-frame-text @min-[960px]/main:grid-cols-[minmax(0,1.65fr)_minmax(250px,1fr)]"
    >
      {k === "twitch" && ipHost() ? (
        // 16:9 at least, taller when the words need it (phones)
        <div className="flex aspect-video min-w-0 flex-col items-center justify-center gap-2 rounded-[10px] bg-frame-2 p-5 text-center">
          <PlatLogo k={k} className="mb-1 size-10 rounded-[10px]" />
          <b className="text-[15px] text-white">Twitch only plays inside sites with a web address</b>
          <span className="max-w-[380px] text-[13px] text-frame-dim">
            It will play here once ClipCrest is on its domain, or open ClipCrest at localhost instead of {location.hostname}.
          </span>
          <Button asChild size="sm" className="mt-1.5">
            <a href={p.channel} target="_blank" rel="noopener">Watch on Twitch<ArrowUpRightIcon /></a>
          </Button>
        </div>
      ) : (
        <div className="relative aspect-video overflow-hidden rounded-[10px] bg-black">
          {src && (
            // the address only changes when the stream does, so a sync never restarts the player (APP-LIVE-04)
            <iframe
              key={gen}
              src={src}
              title={`${name} live stream`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 size-full border-0"
            />
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-3 px-1.5 pt-1.5 pb-1">
        <div className="flex flex-wrap items-center gap-2">
          <PlatLogo k={k} className="size-7 rounded-lg" />
          <Badge variant="live">Live on {name}</Badge>
          {on.length > 1 && (
            <div className="ml-auto flex gap-1">
              {on.map(([x]) => {
                const Icon = ICONS[x]
                return (
                  <button
                    key={x}
                    type="button"
                    aria-pressed={x === k}
                    aria-label={`Watch on ${PLATFORM_NAMES[x] ?? x}`}
                    title={`Watch on ${PLATFORM_NAMES[x] ?? x}`}
                    onClick={() => {
                      picks.set(c.id, x)
                      setPick(x)
                    }}
                    className="grid size-[30px] cursor-pointer place-items-center rounded-lg bg-white/6 text-frame-dim transition-colors outline-none hover:bg-white/12 hover:text-frame-text focus-visible:outline-2 focus-visible:outline-brand-hi aria-pressed:bg-brand/20 aria-pressed:text-brand"
                  >
                    {Icon && <Icon className="size-[15px]" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div>
          <h3 className="line-clamp-3 text-base leading-snug font-semibold break-words text-white">{p.title || "Live now"}</h3>
          <p className="mt-1 text-xs text-frame-dim">{p.name || c.name}</p>
        </div>
        {stats.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(84px,1fr))] gap-2">
            {stats.map(([v, l]) => (
              <div key={l} className="rounded-[10px] bg-white/6 px-3 py-2.5">
                <b className="block text-[17px] font-bold tracking-[-0.01em] text-white tabular-nums">{v}</b>
                <span className="text-[11px] text-frame-dim">{l}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-auto flex flex-col gap-2 pt-1">
          {c.live_job ? (
            <>
              <Button variant="danger" size="lg" className="w-full" onClick={() => attempt(() => stopRecording(c.live_job!))}>
                <SquareIcon />Stop recording
              </Button>
              <small className="text-center text-xs text-frame-dim">Recording now. Clips appear below as they're made.</small>
            </>
          ) : (
            <>
              <Button variant="primary" size="lg" className="w-full" disabled={starting} onClick={record}>
                <span aria-hidden className="size-2.5 rounded-full bg-live" />
                {starting ? "Starting…" : "Record this stream"}
              </Button>
              <small className="text-center text-xs text-frame-dim">ClipCrest watches it and clips the best moments as they happen.</small>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
