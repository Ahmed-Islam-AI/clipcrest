import { createBrowserRouter, Navigate } from "react-router"
import Home from "./features/home"
import Usage from "./features/usage"
import Videos from "./features/videos"
import { CreatorRoute, SettingsRoute } from "./guards"
import { paths } from "./paths"
import { AppShell } from "./shell/AppShell"

// Every address of the app (APP-ROUTE-01), under /app. See README.md for the table.
export const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { index: true, element: <Home /> },
        { path: "videos", element: <Videos /> },
        { path: "usage", element: <Usage /> },
        { path: "settings/:tab?", element: <SettingsRoute /> },
        { path: "creators/:id/:tab?", element: <CreatorRoute /> },
        { path: "*", element: <Navigate to={paths.home} replace /> }, // anything else under /app opens Home
      ],
    },
  ],
  { basename: "/app" },
)
