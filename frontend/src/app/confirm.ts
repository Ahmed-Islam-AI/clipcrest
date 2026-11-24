import { useSyncExternalStore } from "react"

// "Are you sure?" questions (APP-SHELL-05, APP-SHELL-06). Call ask() or askTyped() from anywhere and await the
// answer; the shell's <ConfirmHost /> draws the dialog.

export type Question = {
  title: string
  text: string
  okLabel: string
  danger: boolean
  mustType?: string // askTyped: the word to type before the button works
  answer: (typed: string | null) => void // null: Cancel, Esc or a click outside
}

let current: Question | null = null
const subs = new Set<() => void>()
const set = (q: Question | null) => {
  current = q
  subs.forEach((f) => f())
}

function put(q: Omit<Question, "answer">) {
  current?.answer(null) // only one question at a time: a new one cancels the old
  return new Promise<string | null>((res) => set({ ...q, answer: (typed) => { set(null); res(typed) } }))
}

/** A title, a sentence, "Cancel" and an action button. The button is red when `danger`. Resolves true on yes. */
export async function ask(title: string, text: string, okLabel = "Confirm", danger = false) {
  return (await put({ title, text, okLabel, danger })) !== null
}

/**
 * For the biggest deletions: the user types `mustType` (ignoring case and outer spaces) before the red button
 * works. Resolves to what they typed, or null.
 */
export function askTyped(title: string, text: string, mustType: string, okLabel: string) {
  return put({ title, text, okLabel, danger: true, mustType })
}

export function useQuestion() {
  return useSyncExternalStore((f) => (subs.add(f), () => void subs.delete(f)), () => current)
}
