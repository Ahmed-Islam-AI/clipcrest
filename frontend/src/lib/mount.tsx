import "@/styles/theme.css"
import { StrictMode, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

const queryClient = new QueryClient()

/** Starts a page. Every src/pages/<page>/main.tsx calls this once with the page's root component. */
export function mount(page: ReactNode) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          {page}
          {/* expand: toasts are listed one above the other, as on the old pages, never stacked on top of each other */}
          <Toaster position="bottom-right" expand />
        </TooltipProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}
