import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Star } from "lucide-react"

interface TeamCardProps {
  name: string
  points: number
  logo?: string
}

export function TeamCard({ name, points }: TeamCardProps) {
  return (
    <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
      <CardHeader className="space-y-2">
        <div className="w-16 h-16 bg-muted rounded-full mx-auto" />
        <CardTitle className="text-center text-base">{name}</CardTitle>
        <div className="flex items-center justify-center gap-2 text-primary">
          <Star className="w-4 h-4 fill-current" />
          <span className="font-bold">{points} คะแนน</span>
        </div>
      </CardHeader>
    </Card>
  )
}
