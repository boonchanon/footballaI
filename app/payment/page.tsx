import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { SubscriptionPage } from "@/components/subscription/subscription-page"

type PaymentPageProps = {
  searchParams?: Promise<{
    pack?: string
  }>
}

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const params = (await searchParams) ?? {}

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <SubscriptionPage selectedPackCode={params.pack} />
      <Footer />
    </div>
  )
}
