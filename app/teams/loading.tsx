import { Navigation } from "@/components/navigation"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pb-16">
        <section className="border-b border-border">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                <div className="h-28 w-28 animate-pulse rounded-[28px] bg-muted" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 w-36 animate-pulse rounded-full bg-muted" />
                  <div className="h-14 w-80 animate-pulse rounded-2xl bg-muted" />
                  <div className="h-4 w-48 animate-pulse rounded-full bg-muted" />
                  <div className="h-20 w-full max-w-2xl animate-pulse rounded-3xl bg-muted" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-24 animate-pulse rounded-3xl bg-muted" />
                <div className="h-24 animate-pulse rounded-3xl bg-muted" />
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pt-8">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pt-8">
          <div className="h-12 w-full max-w-[720px] animate-pulse rounded-2xl bg-muted" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="h-80 animate-pulse rounded-3xl bg-muted" />
            <div className="h-80 animate-pulse rounded-3xl bg-muted" />
          </div>
        </section>
      </main>
    </div>
  )
}
