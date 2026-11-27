import { Navigate, useParams } from "react-router"
import Creators from "./features/creators"
import Settings from "./features/settings"
import { CREATOR_TABS, paths, settingsTabs } from "./paths"
import { useCreator, useStatus } from "./sync"

// Checks for the addresses with a part that can be wrong (APP-ROUTE-06, -07). The shell draws a view only once the first status and sync answers are
// in, so these checks already know the user and their creators.

/** /settings and /settings/<tab>: a tab this user may not see, or none, opens the first one they may (Q-02, APP-ROUTE-07). */
export function SettingsRoute() {
  const { tab } = useParams()
  const tabs = settingsTabs(useStatus())
  if (!tabs.some((t) => t.key === tab)) return <Navigate to={paths.settings(tabs[0].key)} replace />
  return <Settings />
}

/** /creators/<id>[/clips|setup|activity]: a creator that is not yours, or was just deleted, goes Home (APP-ROUTE-06). */
export function CreatorRoute() {
  const { id, tab } = useParams()
  const c = useCreator(id)
  if (!c || (tab !== undefined && !(CREATOR_TABS as readonly string[]).includes(tab))) return <Navigate to={paths.home} replace />
  if (tab === "clips") return <Navigate to={paths.creator(c.id)} replace /> // the Clips tab is left out of the address
  return <Creators />
}
