// The one way the app talks to the server. Same rules as the old page's api() and send():
// - a 401 means the session is gone: the browser goes to /login;
// - any other failure throws the server's "detail" text (or the status text, or "Something went wrong");
// - a network failure says so plainly (Q-12: the old page showed the browser's own "Failed to fetch").

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Signed out while using the app (APP-ERR-07). Upload code that uses XMLHttpRequest calls this on a 401 too. */
export function signIn() {
  location.href = "/login"
}

/** The readable message in a failed answer's body. For upload code that reads XMLHttpRequest.responseText. */
export function errorText(body: string, fallback: string) {
  let d: unknown = fallback
  try {
    d = (JSON.parse(body) as { detail?: unknown }).detail || fallback
  } catch {
    /* not JSON: keep the fallback */
  }
  return typeof d === "string" && d ? d : "Something went wrong"
}

export const OFFLINE = "Can't reach ClipCrest. Check that it is running."

export async function api<T = unknown>(path: string, opt?: RequestInit): Promise<T> {
  let r: Response
  try {
    r = await fetch(path, { credentials: "same-origin", ...opt })
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e
    throw new ApiError(OFFLINE, 0)
  }
  if (r.status === 401) {
    signIn()
    throw new ApiError("Please sign in.", 401)
  }
  if (!r.ok) throw new ApiError(errorText(await r.text().catch(() => ""), r.statusText), r.status)
  return r.json() as Promise<T>
}

/** JSON in, JSON out. POST unless another method is given. */
export function send<T = unknown>(path: string, body?: unknown, method = "POST") {
  return api<T>(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) })
}
