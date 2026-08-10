"use client"

import { createContext, useContext, useMemo } from "react"
import { usePathname } from "next/navigation"

import { Navigation } from "@/components/navigation"

const SiteNavigationContext = createContext(false)

export function useSiteNavigationEnabled() {
  return useContext(SiteNavigationContext)
}

export function SiteNavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const shouldUseGlobalNavigation = useMemo(() => {
    if (!pathname) return true
    return !pathname.startsWith("/admin")
  }, [pathname])

  return (
    <SiteNavigationContext.Provider value={shouldUseGlobalNavigation}>
      {shouldUseGlobalNavigation ? <Navigation variant="global" /> : null}
      {children}
    </SiteNavigationContext.Provider>
  )
}
