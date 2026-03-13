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
import { Save, Users, RefreshCw } from "lucide-react"
import Image from "next/image"

const matchData = {
  homeTeam: "Liverpool",
  homeLogo: "/liverpool-logo.png",
  awayTeam: "Arsenal",
  awayLogo: "/arsenal-logo.png",
  date: "2025-01-28",
  venue: "Anfield",
}

const homeSquad = [
  { id: 1, name: "Alisson", number: 1, position: "GK" },
  { id: 2, name: "Alexander-Arnold", number: 66, position: "RB" },
  { id: 3, name: "Van Dijk", number: 4, position: "CB" },
  { id: 4, name: "Konaté", number: 5, position: "CB" },
  { id: 5, name: "Robertson", number: 26, position: "LB" },
  { id: 6, name: "Mac Allister", number: 10, position: "CM" },
  { id: 7, name: "Gravenberch", number: 38, position: "CM" },
  { id: 8, name: "Szoboszlai", number: 8, position: "CM" },
  { id: 9, name: "Salah", number: 11, position: "RW" },
  { id: 10, name: "Gakpo", number: 18, position: "LW" },
  { id: 11, name: "Diaz", number: 7, position: "ST" },
]

const awaySquad = [
  { id: 1, name: "Raya", number: 22, position: "GK" },
  { id: 2, name: "White", number: 4, position: "RB" },
  { id: 3, name: "Saliba", number: 2, position: "CB" },
  { id: 4, name: "Gabriel", number: 6, position: "CB" },
  { id: 5, name: "Timber", number: 12, position: "LB" },
  { id: 6, name: "Rice", number: 41, position: "DM" },
  { id: 7, name: "Partey", number: 5, position: "CM" },
  { id: 8, name: "Ødegaard", number: 8, position: "CAM" },
  { id: 9, name: "Saka", number: 7, position: "RW" },
  { id: 10, name: "Martinelli", number: 11, position: "LW" },
  { id: 11, name: "Havertz", number: 29, position: "ST" },
]

const formations = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"]

export default function LineupsAdminPage() {
  const [homeFormation, setHomeFormation] = useState("4-3-3")
  const [awayFormation, setAwayFormation] = useState("4-3-3")
  const [selectedHomeLineup, setSelectedHomeLineup] = useState<number[]>(homeSquad.slice(0, 11).map(p => p.id))
  const [selectedAwayLineup, setSelectedAwayLineup] = useState<number[]>(awaySquad.slice(0, 11).map(p => p.id))

  const togglePlayer = (playerId: number, team: "home" | "away") => {
    if (team === "home") {
      if (selectedHomeLineup.includes(playerId)) {
        setSelectedHomeLineup(selectedHomeLineup.filter(id => id !== playerId))
      } else if (selectedHomeLineup.length < 11) {
        setSelectedHomeLineup([...selectedHomeLineup, playerId])
      }
    } else {
      if (selectedAwayLineup.includes(playerId)) {
        setSelectedAwayLineup(selectedAwayLineup.filter(id => id !== playerId))
      } else if (selectedAwayLineup.length < 11) {
        setSelectedAwayLineup([...selectedAwayLineup, playerId])
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Lineup Management</h1>
          <p className="text-muted-foreground">Set starting lineups and formations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Lineups
          </Button>
        </div>
      </div>

      {/* Match Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <Select defaultValue="match1">
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select match" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match1">Liverpool vs Arsenal - Jan 28, 2025</SelectItem>
                <SelectItem value="match2">Man City vs Chelsea - Jan 29, 2025</SelectItem>
                <SelectItem value="match3">Tottenham vs Newcastle - Jan 30, 2025</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
              Scheduled
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Lineups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Home Team */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
                  <Image src={matchData.homeLogo || "/placeholder.svg"} alt={matchData.homeTeam} fill className="object-contain" />
                </div>
                <div>
                  <CardTitle className="text-lg">{matchData.homeTeam}</CardTitle>
                  <CardDescription>Home Team</CardDescription>
                </div>
              </div>
              <Select value={homeFormation} onValueChange={setHomeFormation}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formations.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Starting XI
              </p>
              <Badge variant="secondary">
                {selectedHomeLineup.length}/11 selected
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {homeSquad.map((player) => {
                const isSelected = selectedHomeLineup.includes(player.id)
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player.id, "home")}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-muted-foreground">
                        {player.number}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{player.name}</p>
                        <p className="text-xs text-muted-foreground">{player.position}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Away Team */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
                  <Image src={matchData.awayLogo || "/placeholder.svg"} alt={matchData.awayTeam} fill className="object-contain" />
                </div>
                <div>
                  <CardTitle className="text-lg">{matchData.awayTeam}</CardTitle>
                  <CardDescription>Away Team</CardDescription>
                </div>
              </div>
              <Select value={awayFormation} onValueChange={setAwayFormation}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formations.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Starting XI
              </p>
              <Badge variant="secondary">
                {selectedAwayLineup.length}/11 selected
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {awaySquad.map((player) => {
                const isSelected = selectedAwayLineup.includes(player.id)
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player.id, "away")}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-muted-foreground">
                        {player.number}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{player.name}</p>
                        <p className="text-xs text-muted-foreground">{player.position}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
