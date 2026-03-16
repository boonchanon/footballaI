import { Suspense } from "react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { VerifyResetOtpForm } from "@/components/verify-reset-otp-form"

export default function VerifyOtpPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Suspense fallback={null}>
          <VerifyResetOtpForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
