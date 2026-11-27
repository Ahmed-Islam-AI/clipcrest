import { useEffect, useRef, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, send } from "@/app/api"
import { newCreator } from "@/app/flags"
import { paths } from "@/app/paths"
import { refreshSync } from "@/app/sync"
import { toast } from "@/app/toast"
import type { Creator } from "@/app/types"

// The New creator dialog (APP-CRE-01). The shell mounts it once; newCreator.open() opens it (sidebar, Home, the
// composer's creator picker).

type Preview = { platform: string; name: string; followers: string; pic: string }

export default function NewCreatorDialog() {
  const open = newCreator.useOpen()
  return (
    <Dialog open={open} onOpenChange={newCreator.set}>
      <DialogContent>
        <NewCreatorForm />
      </DialogContent>
    </Dialog>
  )
}

/** Drawn afresh each time the dialog opens, so it always starts empty. */
function NewCreatorForm() {
  const navigate = useNavigate()
  const [chan, setChan] = useState("")
  const [name, setName] = useState("")
  const [prev, setPrev] = useState<null | "wait" | { error: string } | Preview>(null)
  const [busy, setBusy] = useState(false)
  const typedName = useRef("") // the Name box, for the look-up that answers later
  const auto = useRef("") // the name the last look-up filled in
  const seq = useRef(0)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  const changeName = (v: string) => {
    typedName.current = v
    setName(v)
  }
  // Who the channel is, 400ms after typing stops. Only the newest answer counts.
  const changeChan = (v: string) => {
    setChan(v)
    clearTimeout(timer.current)
    const u = v.trim(), me = ++seq.current
    if (!u) return setPrev(null)
    setPrev("wait")
    timer.current = window.setTimeout(async () => {
      try {
        const p = await api<Preview>("/api/channel-preview?url=" + encodeURIComponent(u))
        if (me !== seq.current) return
        setPrev(p)
        // the name follows the channel, unless the person typed a different one
        if (!typedName.current.trim() || typedName.current === auto.current) changeName((auto.current = p.name))
      } catch (e) {
        if (me === seq.current) setPrev({ error: (e as Error).message })
      }
    }, 400)
  }

  // Enter in either box creates the workspace (Q-10: it used to cancel). The browser checks that Name is filled in.
  const create = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const c = await send<Creator>("/api/creators", { name, channel: chan })
      await refreshSync()
      newCreator.close()
      navigate(paths.creator(c.id, c.channel ? "clips" : "setup"))
      toast("Workspace created", "ok")
    } catch (err) {
      toast((err as Error).message, "bad")
      setBusy(false)
    }
  }

  return (
    <form onSubmit={create} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>New creator</DialogTitle>
        <DialogDescription>Each creator gets their own workspace, folder, settings and accounts.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="nc_chan">Channel link</Label>
        <Input
          id="nc_chan"
          value={chan}
          onChange={(e) => changeChan(e.target.value)}
          placeholder="https://www.youtube.com/@name, twitch.tv/name or kick.com/name"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      {prev === "wait" ? (
        <div aria-busy className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5">
          <span className="size-11 shrink-0 animate-pulse rounded-full bg-line motion-reduce:animate-none" />
          <span className="flex flex-col gap-2">
            <span className="h-2.5 w-[120px] animate-pulse rounded-full bg-line motion-reduce:animate-none" />
            <span className="h-2.5 w-20 animate-pulse rounded-full bg-line motion-reduce:animate-none" />
          </span>
        </div>
      ) : prev && "error" in prev ? (
        <div role="alert" className="rounded-xl bg-bad-soft px-3 py-2.5 text-[13px] text-bad">{prev.error}</div>
      ) : prev ? (
        <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5 animate-in fade-in-0 motion-reduce:animate-none">
          {prev.pic ? <img src={prev.pic} alt="" className="size-11 shrink-0 rounded-full object-cover" /> : <span className="size-11 shrink-0 rounded-full bg-line" />}
          <div className="min-w-0">
            <b className="block truncate text-sm font-semibold text-foreground">{prev.name}</b>
            <span className="text-xs text-dim">{[prev.platform, prev.followers].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="nc_name">Name</Label>
        <Input id="nc_name" value={name} onChange={(e) => changeName(e.target.value)} placeholder="Filled in from the channel, or type one" required autoComplete="off" />
      </div>
      <DialogFooter className="mt-2">
        <DialogClose asChild>
          <Button type="button">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="primary" disabled={busy}>Create workspace</Button>
      </DialogFooter>
    </form>
  )
}
