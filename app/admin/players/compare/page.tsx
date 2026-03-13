"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowRight, Download, RefreshCw } from "lucide-react"
import Image from "next/image"

const players = {
  salah: {
    name: "Mohamed Salah",
    image: "/mohamed-salah-action.png",
    team: "Liverpool",
    position: "RW",
    stats: { goals: 18, assists: 12, shots: 89, xG: 15.2, passes: 845, rating: 8.2 },
  },
  haaland: {
    name: "Erling Haaland",
    image: "/erling-haaland-celebration.png",
    team: "Man City",
    position: "ST",
    stats: { goals: 16, assists: 4, shots: 78, xG: 14.8, passes: 412, rating: 7.9 },
  },
  palmer: {
    name: "Cole Palmer",
    image: "/players/palmer.webp",
    team: "Chelsea",
    position: "AM",
    stats: { goals: 14, assists: 8, shots: 65, xG: 11.5, passes: 980, rating: 8.0 },
  },
  saka: {
    name: "Bukayo Saka",
    image: "/players/saka.webp",
    team: "Arsenal",
    position: "RW",
    stats: { goals: 11, assists: 10, shots: 58, xG: 9.2, passes: 1120, rating: 7.8 },
  },
}

type PlayerKey = keyof typeof players

export default function PlayerCompareAdminPage() {
  const [player1, setPlayer1] = useState<PlayerKey>("salah")
  const [player2, setPlayer2] = useState<PlayerKey>("haaland")

  const p1 = players[player1]
  const p2 = players[player2]

  const compareStats = [
    { label: "Goals", key: "goals", p1: p1.stats.goals, p2: p2.stats.goals },
    { label: "Assists", key: "assists", p1: p1.stats.assists, p2: p2.stats.assists },
    { label: "Shots", key: "shots", p1: p1.stats.shots, p2: p2.stats.shots },
    { label: "xG", key: "xG", p1: p1.stats.xG, p2: p2.stats.xG },
    { label: "Passes", key: "passes", p1: p1.stats.passes, p2: p2.stats.passes },
    { label: "Rating", key: "rating", p1: p1.stats.rating, p2: p2.stats.rating },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Player Comparison</h1>
          <p className="text-muted-foreground">Compare statistics between two players</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Player Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-4 justify-center">
            <Select value={player1} onValueChange={(v) => setPlayer1(v as PlayerKey)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salah">Mohamed Salah</SelectItem>
                <SelectItem value="haaland">Erling Haaland</SelectItem>
                <SelectItem value="palmer">Cole Palmer</SelectItem>
                <SelectItem value="saka">Bukayo Saka</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">vs</span>
              <ArrowRight className="h-5 w-5 text-muted-foreground rotate-180" />
            </div>

            <Select value={player2} onValueChange={(v) => setPlayer2(v as PlayerKey)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salah">Mohamed Salah</SelectItem>
                <SelectItem value="haaland">Erling Haaland</SelectItem>
                <SelectItem value="palmer">Cole Palmer</SelectItem>
                <SelectItem value="saka">Bukayo Saka</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Player Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Player 1 */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="relative h-32 w-32 rounded-full overflow-hidden bg-muted mx-auto mb-4">
              <Image src={p1.image || "/placeholder.svg"} alt={p1.name} fill className="object-cover" />
            </div>
            <h2 className="text-xl font-bold">{p1.name}</h2>
            <p className="text-muted-foreground">{p1.team}</p>
            <Badge variant="secondary" className="mt-2">{p1.position}</Badge>
          </CardContent>
        </Card>

        {/* Player 2 */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="relative h-32 w-32 rounded-full overflow-hidden bg-muted mx-auto mb-4">
              <Image src={p2.image || "/placeholder.svg"} alt={p2.name} fill className="object-cover" />
            </div>
            <h2 className="text-xl font-bold">{p2.name}</h2>
            <p className="text-muted-foreground">{p2.team}</p>
            <Badge variant="secondary" className="mt-2">{p2.position}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Stats Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Statistics Comparison</CardTitle>
          <CardDescription>Season 2024/25</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {compareStats.map((stat) => {
            const p1Higher = stat.p1 > stat.p2
            const p2Higher = stat.p2 > stat.p1
            const maxValue = Math.max(stat.p1, stat.p2)
            
            return (
              <div key={stat.key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${p1Higher ? "text-green-500" : ""}`}>
                    {stat.p1}
                  </span>
                  <span className="text-muted-foreground">{stat.label}</span>
                  <span className={`font-medium ${p2Higher ? "text-green-500" : ""}`}>
                    {stat.p2}
                  </span>
                </div>
                <div className="flex gap-1">
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${p1Higher ? "bg-green-500" : "bg-primary"} rounded-full transition-all`}
                        style={{ width: `${(stat.p1 / maxValue) * 100}%`, marginLeft: "auto" }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${p2Higher ? "bg-green-500" : "bg-primary"} rounded-full transition-all`}
                        style={{ width: `${(stat.p2 / maxValue) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Comparison Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-green-500">
                {compareStats.filter(s => s.p1 > s.p2).length}
              </p>
              <p className="text-sm text-muted-foreground">{p1.name} Wins</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-yellow-500">
                {compareStats.filter(s => s.p1 === s.p2).length}
              </p>
              <p className="text-sm text-muted-foreground">Draws</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-500">
                {compareStats.filter(s => s.p2 > s.p1).length}
              </p>
              <p className="text-sm text-muted-foreground">{p2.name} Wins</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
