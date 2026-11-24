import { useLayoutEffect, useSyncExternalStore, type ComponentType, type ReactNode } from "react"

// How a view puts things in the top bar. The shell already fills in the title, the subtitle, the creator's
// picture and the creator tabs for every route (APP-TOP-01..04), and the GitHub/Follow buttons on Home and All
// videos (APP-TOP-06). A view adds its own buttons, and may replace any of the rest:
//
//   usePage({ actions: <Button variant="primary">Start recording</Button> })

export type TopTab = {
  value: string
  label: string
  icon?: ComponentType<{ className?: string }>
  count?: number // shown when above 0; above 99 shows "99+"
  to: string // the app address the tab opens
  replace?: boolean // true: switching tabs replaces the history entry instead of adding one
}

export type PageHeader = {
  title?: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode // in front of the title, 42px
  tabs?: TopTab[]
  tab?: string // which tab is on; defaults to the one whose address is open
  actions?: ReactNode // buttons at the right end
}

let current: PageHeader = {}
const subs = new Set<() => void>()
const set = (h: PageHeader) => {
  current = h
  subs.forEach((f) => f())
}

/** Call in a view's component, on every render. What it gives stays in the top bar until the view closes. */
export function usePage(header: PageHeader) {
  useLayoutEffect(() => set(header))
  useLayoutEffect(() => () => set({}), [])
}

/** For the shell's top bar. */
export function usePageHeader() {
  return useSyncExternalStore((f) => (subs.add(f), () => void subs.delete(f)), () => current)
}
