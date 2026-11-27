// A creator's page (APP-CRE, APP-LIVE): the live player on top while they are live, then the Clips, Setup or
// Activity tab, and the Record / Stop button in the top bar (APP-TOP-05). The router has already checked that the
// creator exists; the shell draws the title, picture, status badge and tabs.
import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { SquareIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { liveOn } from "@/app/creator"
import { usePage } from "@/app/page"
import { PageBody } from "@/app/shell/bits"
import { useCreator } from "@/app/sync"
import type { Creator } from "@/app/types"
import { Composer } from "../videos/Composer"
import { Empty, JobList } from "../videos/JobList"
import { LiveCard } from "../videos/LiveCard"
import { attempt, useVJobs } from "../videos/model"
import { startRecording, stopRecording } from "./live"
import { Setup } from "./Setup"
import { Stream } from "./Stream"

export default function Creators() {
  const { id, tab = "clips" } = useParams()
  const c = useCreator(id)
  const navigate = useNavigate()
  const jobs = useVJobs()
  const [starting, setStarting] = useState<string | null>(null) // the creator whose recording is being started

  const record = (x: Creator) => {
    setStarting(x.id)
    attempt(() => startRecording(x, navigate)).finally(() => setStarting((s) => (s === x.id ? null : s)))
  }
  usePage({
    actions: !c ? null : c.live_job ? (
      <Button variant="danger" onClick={() => attempt(() => stopRecording(c.live_job!))}>
        <SquareIcon />Stop recording
      </Button>
    ) : (
      // at 560px and below only the red dot shows; the words stay for screen readers
      <Button variant="primary" disabled={starting === c.id} onClick={() => record(c)} className="max-[560px]:w-[38px] max-[560px]:px-0">
        <span aria-hidden className="size-2.5 rounded-full bg-live max-[560px]:size-3" />
        <span className="max-[560px]:sr-only">{starting === c.id ? "Starting…" : liveOn(c).length ? "Record live stream" : "Start recording"}</span>
      </Button>
    ),
  })
  if (!c) return null
  const live = tab === "clips" && jobs.find((j) => j.creator === c.id && j.status === "live")

  return (
    <PageBody>
      <Stream key={"stream:" + c.id} c={c} hidden={tab !== "clips"} />
      {tab === "clips" ? (
        <>
          {live && <LiveCard job={live} />}
          <Composer creator={c} />
          <JobList creatorId={c.id} />
        </>
      ) : tab === "setup" ? (
        <Setup key={"setup:" + c.id} c={c} />
      ) : (
        <Activity c={c} />
      )}
    </PageBody>
  )
}

const when = (t: number) => new Date(t * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

/** What happened for this creator, newest first: the server sends the last 30 lines (APP-CRE-12). */
function Activity({ c }: { c: Creator }) {
  const log = (c.log ?? []) as { t: number; msg: string }[]
  if (!log.length) return <Empty title="Nothing has happened yet">Recordings, clips and posts for this creator will be listed here.</Empty>
  return (
    <ol className="rounded-xl border border-line px-5" aria-label="Activity">
      {log.map((l, i) => (
        <li key={i} className="flex gap-3.5 border-line py-3 text-[13px] not-first:border-t max-[480px]:flex-col max-[480px]:gap-0.5">
          <time dateTime={new Date(l.t * 1000).toISOString()} className="w-[118px] shrink-0 whitespace-nowrap text-dim">{when(l.t)}</time>
          <span className="min-w-0 break-words text-foreground">{l.msg}</span>
        </li>
      ))}
    </ol>
  )
}
