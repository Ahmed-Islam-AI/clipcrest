import { toast as sonner } from "sonner"
import { getStatus } from "./sync"

/**
 * A short message in the bottom right (APP-TOAST). "" plain, "ok" good news, "bad" a problem: problems stay 7
 * seconds instead of 3.2 and have a "Report" button that copies the message and opens the feedback page.
 * An empty message shows nothing.
 */
export function toast(msg: string | null | undefined, kind: "" | "ok" | "bad" = "") {
  if (!msg) return
  if (kind === "bad") sonner.error(msg, { duration: 7000, action: { label: "Report", onClick: () => void openFeedback(msg) } })
  else if (kind === "ok") sonner.success(msg, { duration: 3200 })
  else sonner(msg, { duration: 3200 })
}

/**
 * Feedback (APP-FB): a new issue on the project's GitHub page, or the maker's profile when there is no GitHub
 * page. A problem's message (`context`) is copied first, so it can be pasted there.
 */
export async function openFeedback(context = "") {
  const L = getStatus()?.links
  const url = L?.repo ? L.repo.replace(/\/+$/, "") + "/issues/new" : L?.follow
  if (!url) return toast(context ? "Copy this message and send it to the person who runs this ClipCrest." : "There's no feedback link on this server.")
  if (context) {
    try {
      await navigator.clipboard.writeText(context)
      toast("The problem is copied. Paste it in your message.", "ok")
    } catch {
      /* no clipboard: open the page anyway */
    }
  }
  window.open(url, "_blank", "noopener")
}
