import { useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { CopyIcon, PlusIcon, SettingsIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, send } from "../../api"
import { ask } from "../../confirm"
import { InstagramIcon, YouTubeIcon } from "../../shell/brand-icons"
import { refreshStatus, refreshSync, useAccounts, useStatus } from "../../sync"
import { toast } from "../../toast"
import type { Account } from "../../types"
import { Field, Sec } from "./bits"
import { useAction } from "./form"

// Settings, Connected apps (APP-SET-14..17): connect and disconnect posting accounts; admins also register this
// server with each platform.

type AppSetup = { ready: boolean; id_label: string; secret_label: string; id_hint: string; redirect: string; https: boolean }

const TikTokIcon = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .59.04.86.13v-3.5a6.37 6.37 0 0 0-.86-.05A6.34 6.34 0 0 0 3.15 15.7a6.34 6.34 0 0 0 10.86 4.43 6.3 6.3 0 0 0 1.81-4.43V8.73a8.2 8.2 0 0 0 4.77 1.52V6.8a4.85 4.85 0 0 1-1-.11z" />
  </svg>
)

// For each platform: its card, and the set-up guide (where to register, the steps, and what to expect until review).
const PLATFORMS: {
  key: string
  name: string
  desc: string
  logo: ReactNode
  bg: string
  site: [string, string]
  steps: ReactNode[]
  after: string
}[] = [
  {
    key: "youtube",
    name: "YouTube",
    desc: "Post clips to your channel as Shorts.",
    logo: <YouTubeIcon className="size-[22px]" />,
    bg: "#FF0000",
    site: ["https://console.cloud.google.com/apis/credentials", "Google Cloud"],
    steps: [
      <>Create a project and turn on <b>YouTube Data API v3</b>.</>,
      <>Create an <b>OAuth client ID</b> of type <b>Web application</b>.</>,
      <>Add the address below under <b>Authorised redirect URIs</b>.</>,
      <>Paste its Client ID and Client secret here.</>,
    ],
    after: "Until Google verifies your app, people see a warning when they connect, and uploads stay private.",
  },
  {
    key: "instagram",
    name: "Instagram",
    desc: "Post clips as Reels. Needs a Creator or Business account.",
    logo: <InstagramIcon className="size-[22px]" />,
    bg: "linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)",
    site: ["https://developers.facebook.com/apps", "Meta for Developers"],
    steps: [
      <>Create a <b>Business</b> app and add <b>Instagram</b> (API setup with Instagram login).</>,
      <>Under <b>Business login settings</b>, add the address below as a redirect URL.</>,
      <>Paste the <b>Instagram app ID</b> and <b>Instagram app secret</b> here.</>,
    ],
    after: "Works with Creator and Business Instagram accounts. Until Meta reviews your app, only accounts you add as testers can connect.",
  },
  {
    key: "tiktok",
    name: "TikTok",
    desc: "Post clips straight to your TikTok.",
    logo: <TikTokIcon className="size-[22px]" />,
    bg: "#000",
    site: ["https://developers.tiktok.com/apps", "TikTok for Developers"],
    steps: [
      <>Create an app and add <b>Login Kit</b> and <b>Content Posting API</b> with Direct Post turned on.</>,
      <>Add the address below as a redirect URI, with the scopes <b>user.info.basic</b> and <b>video.publish</b>.</>,
      <>Paste the Client key and Client secret here.</>,
    ],
    after: "Until TikTok reviews your app, clips are posted as private: only the account owner sees them.",
  },
]

export function AppsSection() {
  const status = useStatus()
  const accounts = useAccounts()
  const admin = !!status?.user?.is_admin
  // Admins see how each platform is set up. A failed load just leaves the set-up panels closed, as before.
  const setup = useQuery({
    queryKey: ["settings", "apps"],
    queryFn: () => api<Record<string, AppSetup>>("/api/apps").catch(() => null),
    enabled: admin,
  })
  const [open, setOpen] = useState("") // the platform whose set-up panel is open; one at a time
  const ok = status?.connect ?? {}

  return (
    <Sec
      title="Connected apps"
      help="Connect the accounts ClipCrest posts clips to: press Connect, sign in on the platform's own page, and you're back here. ClipCrest never sees your passwords. Then pick which accounts each creator posts to, in that creator's Setup."
    >
      <div className="flex flex-col gap-3">
        {PLATFORMS.map((p) => (
          <AppCard
            key={p.key}
            p={p}
            ready={!!ok[p.key]}
            admin={admin}
            accounts={accounts.filter((a) => (a.platform || a.label || "").toLowerCase().includes(p.key))}
            setup={open === p.key ? setup.data?.[p.key] : undefined}
            toggle={(on) => setOpen(on ? p.key : "")}
            saved={async () => {
              setOpen("")
              await Promise.all([refreshStatus(), setup.refetch()])
            }}
          />
        ))}
      </div>
    </Sec>
  )
}

function AppCard({ p, ready, admin, accounts, setup, toggle, saved }: {
  p: (typeof PLATFORMS)[number]
  ready: boolean
  admin: boolean
  accounts: Account[]
  setup?: AppSetup
  toggle: (on: boolean) => void
  saved: () => Promise<void>
}) {
  const disconnect = async (a: Account) => {
    if (!(await ask("Disconnect this account?", "Posts still waiting for it will fail.", "Disconnect", true))) return
    try {
      await api(`/api/accounts/${encodeURIComponent(a.id)}`, { method: "DELETE" })
      await refreshSync()
    } catch (e) {
      toast((e as Error).message, "bad")
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-3.5 rounded-lg border border-line px-4 py-3.5">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[10px] text-white" style={{ background: p.bg }}>{p.logo}</span>
      <div className="flex min-w-0 flex-1 basis-48 flex-col">
        <b className="text-sm font-semibold text-foreground">{p.name}</b>
        <span className="text-[13px] text-dim">{p.desc}</span>
        {accounts.length > 0 && (
          <ul className="mt-2.5 flex flex-col gap-1.5" aria-label={`Connected ${p.name} accounts`}>
            {accounts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge variant="ok">Connected</Badge>
                <b className="text-[13px] font-semibold">{a.name}</b>
                {a.detail && <span className="text-xs text-dim">{a.detail}</span>}
                <Button size="sm" variant="ghost" onClick={() => void disconnect(a)}>Disconnect</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {ready ? (
          <Button asChild size="sm" variant="primary">
            <a href={`/oauth/${p.key}/start`}><PlusIcon />{accounts.length ? "Add another" : "Connect"}</a>
          </Button>
        ) : admin ? (
          <Button size="sm" variant="primary" onClick={() => toggle(!setup)} aria-expanded={!!setup}><SettingsIcon />Set up</Button>
        ) : (
          <Badge>Not set up on this server</Badge>
        )}
        {ready && admin && (
          <Button size="icon-sm" variant="ghost" onClick={() => toggle(!setup)} aria-expanded={!!setup} title={`Change this server's ${p.name} app`} aria-label={`Change this server's ${p.name} app`}>
            <SettingsIcon />
          </Button>
        )}
      </div>
      {setup && <SetupPanel p={p} st={setup} close={() => toggle(false)} saved={saved} />}
    </div>
  )
}

function SetupPanel({ p, st, close, saved }: { p: (typeof PLATFORMS)[number]; st: AppSetup; close: () => void; saved: () => Promise<void> }) {
  const [id, setId] = useState("")
  const [secret, setSecret] = useState("")
  const save = useAction()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(st.redirect)
      toast("Copied", "ok")
    } catch (e) {
      toast((e as Error).message, "bad")
    }
  }

  return (
    <div className="flex basis-full flex-col gap-3.5 border-t border-line pt-3.5 text-sm">
      <p className="text-[13px] text-dim">
        To let people connect {p.name}, register this server once with{" "}
        <a href={p.site[0]} target="_blank" rel="noopener" className="font-medium text-brand-deep underline-offset-4 hover:underline">{p.site[1]}</a>. It takes about five minutes.
      </p>
      <ol className="flex list-decimal flex-col gap-1 pl-5 marker:text-faint [&_b]:font-semibold">
        {p.steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 rounded-md bg-muted px-2.5 py-1.5 font-mono text-[13px] break-all">{st.redirect}</code>
        <Button size="sm" onClick={() => void copy()}><CopyIcon />Copy</Button>
      </div>
      {!st.https && p.key !== "youtube" && (
        <p className="text-[13px] font-medium text-warn">
          {p.name} only accepts https addresses. Put ClipCrest on a domain with https (or a tunnel) and set CLIPCREST_PUBLIC_URL to it first.
        </p>
      )}
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void save.run(async () => {
            await send("/api/apps", { platform: p.key, client_id: id, client_secret: secret }, "PUT")
            toast("Saved. People can connect now.", "ok")
            await saved()
          })
        }}
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field id={`${p.key}_id`} label={st.id_label}>
            <Input id={`${p.key}_id`} autoComplete="off" spellCheck={false} value={id} onChange={(e) => setId(e.target.value)} placeholder={st.ready ? `Saved: ${st.id_hint}. Paste a new one to replace it` : ""} />
          </Field>
          <Field id={`${p.key}_secret`} label={st.secret_label}>
            <Input id={`${p.key}_secret`} type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={st.ready ? "Saved. Paste a new one to replace it" : ""} />
          </Field>
        </div>
        <p className="text-[13px] text-dim">{p.after}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={save.busy}>Save</Button>
          <Button type="button" variant="ghost" onClick={close}>Close</Button>
        </div>
      </form>
    </div>
  )
}
