import type { Metadata } from "next"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { SubscriptionPage } from "@/components/subscription/subscription-page"

export const metadata: Metadata = {
  title: "Subscription - FootballAI",
  description: "แพ็กเกจ FootballAI Pro สำหรับ AI Prediction และเครื่องมือวิเคราะห์ฟุตบอล",
}

export default function SubscriptionRoutePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <SubscriptionPage />
      <Footer />
    </div>
  )
}
