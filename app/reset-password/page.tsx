import { Suspense } from "react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { ResetPasswordForm } from "@/components/reset-password-form"

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
