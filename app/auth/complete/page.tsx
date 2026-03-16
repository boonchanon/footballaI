import { Suspense } from "react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { OauthComplete } from "@/components/oauth-complete"

export default function AuthCompletePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Suspense fallback={null}>
          <OauthComplete />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
