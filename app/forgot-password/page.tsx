import { Footer } from "@/components/footer"
import { ForgotPasswordForm } from "@/components/forgot-password-form"
import { Navigation } from "@/components/navigation"

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <ForgotPasswordForm />
      </main>
      <Footer />
    </div>
  )
}
