import { useSyncExternalStore } from "react"

// Small on/off switches that one part of the app opens and another part draws. Each is a plain module value, so
// any code can flip it (`newCreator.open()`) and any component can follow it (`newCreator.useOpen()`).
function flag() {
  let on = false
  const subs = new Set<() => void>()
  const set = (v: boolean) => {
    on = v
    subs.forEach((f) => f())
  }
  const subscribe = (f: () => void) => {
    subs.add(f)
    return () => void subs.delete(f)
  }
  return {
    open: () => set(true),
    close: () => set(false),
    set,
    get: () => on,
    useOpen: () => useSyncExternalStore(subscribe, () => on),
  }
}

/** The guided tour (APP-TOUR). Opened from the account menu; drawn by features/settings/Tour.tsx. */
export const tour = flag()
/** The New creator dialog (APP-CRE-01). Opened from the sidebar and Home; drawn by features/creators/NewCreatorDialog.tsx. */
export const newCreator = flag()
/** The sidebar drawer on phones (APP-NAV-13). The tour opens it for its sidebar steps. */
export const drawer = flag()
