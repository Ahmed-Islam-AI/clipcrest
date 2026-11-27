import { useState, type ReactNode } from "react"
import { LogOutIcon, Trash2Icon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, leave, send } from "../../api"
import { askTyped } from "../../confirm"
import { refreshStatus, useStatus } from "../../sync"
import { toast } from "../../toast"
import { Field, Sec } from "./bits"
import { useAction } from "./form"

// Settings, Profile and Security (APP-SET-10..13). Only with sign-in on; the router keeps them out otherwise.

export function ProfileSection() {
  const me = useStatus()?.user
  if (!me) return null
  const joined = me.created_at ? new Date(me.created_at * 1000).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" }) : ""
  const rows: [string, ReactNode][] = [
    ["Email", <>{me.email} {me.verified === false ? <Badge variant="warn">Not confirmed</Badge> : <Badge variant="ok">Confirmed</Badge>}</>],
    ["Sign-in method", me.google ? `Google${me.has_password ? " and password" : ""}` : "Email and password"],
    ["Account type", me.is_admin ? "Admin" : "Standard"],
    ...(joined ? [["Member since", joined] as [string, string]] : []),
  ]
  return (
    <Sec title="Profile" help="This is how you appear in ClipCrest.">
      <div className="mb-5 flex items-center gap-3.5">
        <Avatar className="size-14 after:hidden" aria-hidden>
          {me.photo ? <AvatarImage src={`/api/me/photo?v=${me.photo}`} alt="" /> : null}
          <AvatarFallback className="bg-brand text-[22px] font-bold text-brand-ink">{(me.name || "?")[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <b className="block truncate text-base font-semibold text-brand-ink">{me.name}</b>
          <span className="block truncate text-[13px] text-dim">{me.email}</span>
        </div>
      </div>
      <dl className="mb-3 border-t border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 border-b border-line py-3 sm:grid-cols-[180px_1fr] sm:gap-3">
            <dt className="text-[13px] text-dim">{k}</dt>
            <dd className="flex min-w-0 flex-wrap items-center gap-2 break-words">{v}</dd>
          </div>
        ))}
      </dl>
      {me.google && <p className="text-[13px] text-dim">Your name and picture come from your Google account.</p>}
    </Sec>
  )
}

export function SecuritySection() {
  const me = useStatus()?.user
  const [cur, setCur] = useState("")
  const [pw, setPw] = useState("")
  const pass = useAction()
  const out = useAction()
  const del = useAction()
  if (!me) return null
  const has = me.has_password

  const changePassword = () =>
    pass.run(async () => {
      await send("/api/auth/password", { current: cur, new: pw })
      setCur("")
      setPw("")
      toast("Password changed. Other devices were signed out.", "ok")
      await refreshStatus() // a Google account that just set a password now has one: the form changes to "Change password"
    })

  const signOut = () =>
    out.run(async () => {
      await api("/api/auth/logout", { method: "POST" })
      leave()
    })

  const deleteAccount = () =>
    del.run(async () => {
      const typed = await askTyped(
        "Delete your account?",
        "This removes your account and everything in it for good: creators, recordings, videos, clips, connected accounts and history.",
        me.email,
        "Delete my account",
      )
      if (!typed) return
      await send("/api/account/delete", { confirm: typed })
      leave()
    })

  return (
    <>
      <Sec
        title="Password"
        help={has ? "Change the password you use to sign in. Other devices are signed out when you do." : me.google ? "You sign in with Google. You can also set a password, to sign in with your email." : ""}
      >
        <form
          className="grid max-w-[400px] gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void changePassword()
          }}
        >
          {/* the account's email, for password managers */}
          <input type="email" name="username" autoComplete="username" value={me.email} readOnly hidden />
          {has && (
            <Field id="pw_cur" label="Current password">
              <Input id="pw_cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
            </Field>
          )}
          <Field id="pw_new" label={has ? "New password" : "Password"}>
            <Input id="pw_new" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="primary" disabled={pass.busy}>{has ? "Change password" : "Set password"}</Button>
            {has && <Button asChild variant="ghost"><a href="/reset">Forgot it?</a></Button>}
          </div>
        </form>
      </Sec>
      <Sec title="Sessions" help="Sign out of ClipCrest on this device. Changing your password signs out every other device too.">
        <div><Button onClick={signOut} disabled={out.busy}><LogOutIcon />Sign out</Button></div>
      </Sec>
      <Sec title="Delete account" danger help="Removes your account and everything in it for good: creators, recordings, videos, clips and history.">
        <div><Button variant="danger" onClick={deleteAccount} disabled={del.busy}><Trash2Icon />Delete my account</Button></div>
      </Sec>
    </>
  )
}
