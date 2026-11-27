import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { CheckIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, send } from "../../api"
import { fmtK } from "../../creator"
import { paths } from "../../paths"
import { refreshStatus, useStatus } from "../../sync"
import { toast } from "../../toast"
import { Field, Loaded, Sec } from "./bits"
import { selectClass, useAction } from "./form"

// Settings, AI (APP-SET-04..09). Admins only; the router keeps everyone else out.

type Provider = { id: string; label: string; address: string; needs_key: boolean; key_url: string; example: string }
type AiConf = {
  provider: string
  models: string[]
  base_url: string
  has_key: boolean
  key_hint: string
  ready: boolean
  label: string
  providers: Provider[]
}

export function AiSection() {
  const q = useQuery({ queryKey: ["settings", "ai"], queryFn: () => api<AiConf>("/api/ai") })
  const [v, setV] = useState(0) // a new number draws the form again from what the server now says
  return (
    <Loaded q={q}>
      {(k) => (
        <AiForm
          key={v}
          k={k}
          reload={async () => {
            await q.refetch()
            setV((n) => n + 1)
          }}
        />
      )}
    </Loaded>
  )
}

function AiForm({ k, reload }: { k: AiConf; reload: () => Promise<void> }) {
  const ai = useStatus()?.ai
  const [provider, setProvider] = useState(k.providers.some((x) => x.id === k.provider) ? k.provider : k.providers[0]?.id ?? "")
  const [model, setModel] = useState(k.models.join(", "))
  const [base, setBase] = useState(k.base_url || "")
  const [key, setKey] = useState("")
  const [found, setFound] = useState<string[]>([])
  const [finding, setFinding] = useState(false)
  const modelBox = useRef<HTMLInputElement>(null)
  const save = useAction()

  const pv = k.providers.find((x) => x.id === provider) ?? k.providers[0]
  const same = pv.id === k.provider
  const showBase = pv.id === "custom" || (same && !!k.base_url)

  // Another service than the saved one starts empty: its models and address are not the saved ones (APP-SET-05).
  const pick = (id: string) => {
    setFound([])
    setProvider(id)
    if (id !== k.provider) {
      setModel("")
      setBase("")
    }
  }

  const findModels = async () => {
    setFinding(true)
    try {
      const r = await send<{ models: string[] }>("/api/ai/models", { provider, base_url: base, key })
      setFound(r.models)
      toast(r.models.length ? `${r.models.length} models found. Click the model box to pick one.` : "The service listed no models. Type the model yourself.", r.models.length ? "ok" : "")
      if (r.models.length) modelBox.current?.focus()
    } catch (e) {
      toast((e as Error).message, "bad")
    } finally {
      setFinding(false)
    }
  }

  // Save (unless only testing), ask the AI to answer once, then show what the server now says (APP-SET-09).
  const saveAndTest = (put: boolean) =>
    save.run(async () => {
      if (put) await send("/api/ai", { provider, models: model, base_url: base, key }, "PUT")
      let ok: { model: string } | null = null
      let why = ""
      try {
        ok = await send<{ model: string }>("/api/ai/test")
      } catch (e) {
        why = (e as Error).message
      }
      await refreshStatus()
      await reload()
      if (ok) toast(`Saved. ${ok.model} answered, so the AI is ready.`, "ok")
      else toast(`Saved, but the test failed. ${why}`, "bad")
    })

  return (
    <Sec
      title="AI"
      help="ClipCrest uses an AI model to pick the moments worth clipping and to write hooks, titles and captions. Use your own key from any of these services. You pay that service directly. Without a key, clips are picked by loudness."
    >
      <div className="mb-5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-dim">
        {k.ready ? (
          <>
            <Badge variant="ok"><CheckIcon />Ready</Badge>
            <span>{k.label} · {k.models[0] || ""}</span>
          </>
        ) : (
          <>
            <Badge variant="warn">Not set up</Badge>
            <span>Choose a service, paste your key and pick a model.</span>
          </>
        )}
        {k.ready && ai && (
          <span className="basis-full sm:ml-auto sm:basis-auto">
            {(ai.today_calls || 0).toLocaleString()} AI calls today · {fmtK(ai.today_tokens)} tokens today ·{" "}
            <Link to={paths.usage} className="font-medium text-brand-deep underline-offset-4 hover:underline">View usage</Link>
          </span>
        )}
      </div>

      <div className="grid max-w-[560px] gap-4">
        <Field id="ai_provider" label="AI service">
          <select id="ai_provider" className={selectClass} value={provider} onChange={(e) => pick(e.target.value)}>
            {k.providers.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </Field>
        <Field
          id="ai_key"
          label="Key"
          hint={
            pv.key_url ? (
              <>
                {pv.needs_key ? "Get a key at" : "Set it up at"}{" "}
                <a href={pv.key_url} target="_blank" rel="noopener">{pv.key_url.replace("https://", "")}</a>. The key stays on this server and is never shown again.
              </>
            ) : (
              "The key stays on this server and is never shown again."
            )
          }
        >
          <Input
            id="ai_key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={same && k.has_key ? `Saved${k.key_hint ? ", ends in " + k.key_hint : ""}. Paste a new key to replace it` : pv.needs_key ? "Paste your key" : "Not needed"}
            aria-describedby="ai_key-hint"
          />
        </Field>
        {showBase && (
          <Field id="ai_base" label="Address" hint="Where the service answers. Only needed for a custom service.">
            <Input
              id="ai_base"
              spellCheck={false}
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder={pv.address || "http://127.0.0.1:1234/v1"}
              aria-describedby="ai_base-hint"
            />
          </Field>
        )}
        <Field id="ai_model" label="Model" hint="A fast, inexpensive model is the right choice. Add a second one after a comma to fall back on.">
          <div className="flex gap-2">
            <Input
              id="ai_model"
              ref={modelBox}
              list="ai_models"
              spellCheck={false}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={pv.example ? "For example " + pv.example : "The model id, exactly as the service names it"}
              aria-describedby="ai_model-hint"
            />
            <Button type="button" onClick={findModels} disabled={finding}>Find models</Button>
          </div>
          <datalist id="ai_models">
            {found.map((m) => <option key={m} value={m} />)}
          </datalist>
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => saveAndTest(true)} disabled={save.busy}>Save and test</Button>
        {k.ready && <Button onClick={() => saveAndTest(false)} disabled={save.busy}>Test again</Button>}
      </div>
    </Sec>
  )
}
