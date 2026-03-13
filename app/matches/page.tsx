import { Suspense } from "react"
import MatchesContent from "./matches-content"

export default function MatchesPage() {
  return (
    <Suspense fallback={null}>
      <MatchesContent />
    </Suspense>
  )
}
