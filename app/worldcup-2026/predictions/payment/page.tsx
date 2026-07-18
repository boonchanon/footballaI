import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { WorldcupPredictionPaymentPage } from "@/components/worldcup-prediction-payment-page"
import { WorldcupSubnav } from "@/components/worldcup-subnav"

type PaymentRoutePageProps = {
  searchParams?: Promise<{
    round?: string
    fixtureId?: string
    home?: string
    away?: string
  }>
}

export default async function WorldCupPredictionPaymentRoute({ searchParams }: PaymentRoutePageProps) {
  const params = (await searchParams) ?? {}

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(184,255,0,0.12),transparent_24%),linear-gradient(180deg,#07111f_0%,#091425_38%,#050914_100%)] text-foreground">
      <Navigation />
      <main>
        <div className="container mx-auto px-4 pt-8">
          <WorldcupSubnav />
        </div>
        <WorldcupPredictionPaymentPage
          round={params.round}
          fixtureId={params.fixtureId}
          home={params.home}
          away={params.away}
        />
      </main>
      <Footer />
    </div>
  )
}
