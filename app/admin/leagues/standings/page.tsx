"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw, Download, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react"
import Image from "next/image"

const standingsData = [
  { pos: 1, team: "Liverpool", logo: "/liverpool-logo.png", played: 20, won: 15, drawn: 4, lost: 1, gf: 48, ga: 18, gd: 30, points: 49, form: ["W", "W", "D", "W", "W"] },
  { pos: 2, team: "Arsenal", logo: "/arsenal-logo.png", played: 20, won: 13, drawn: 5, lost: 2, gf: 42, ga: 20, gd: 22, points: 44, form: ["W", "D", "W", "W", "D"] },
  { pos: 3, team: "Nottingham Forest", logo: "/nottingham-forest-logo.jpg", played: 20, won: 12, drawn: 5, lost: 3, gf: 35, ga: 21, gd: 14, points: 41, form: ["W", "W", "L", "W", "D"] },
  { pos: 4, team: "Chelsea", logo: "/chelsea-football-club-crest.png", played: 20, won: 11, drawn: 5, lost: 4, gf: 40, ga: 25, gd: 15, points: 38, form: ["L", "W", "W", "D", "W"] },
  { pos: 5, team: "Newcastle", logo: "/newcastle-united-logo.png", played: 20, won: 10, drawn: 6, lost: 4, gf: 35, ga: 22, gd: 13, points: 36, form: ["W", "D", "D", "W", "W"] },
  { pos: 6, team: "Manchester City", logo: "/manchester-city-logo.png", played: 20, won: 10, drawn: 5, lost: 5, gf: 38, ga: 26, gd: 12, points: 35, form: ["L", "W", "D", "L", "W"] },
  { pos: 7, team: "Bournemouth", logo: "/bournemouth-logo.jpg", played: 20, won: 9, drawn: 6, lost: 5, gf: 32, ga: 25, gd: 7, points: 33, form: ["D", "W", "W", "L", "D"] },
  { pos: 8, team: "Aston Villa", logo: "/aston-villa-logo.png", played: 20, won: 9, drawn: 5, lost: 6, gf: 30, ga: 28, gd: 2, points: 32, form: ["W", "L", "W", "D", "L"] },
]

const formColors: Record<string, string> = {
  W: "bg-green-500 text-white",
  D: "bg-yellow-500 text-white",
  L: "bg-red-500 text-white",
}

export default function StandingsAdminPage() {
  const [selectedLeague, setSelectedLeague] = useState("premier-league")
  const [selectedSeason, setSelectedSeason] = useState("2024-25")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => setIsGenerating(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Standings Management</h1>
          <p className="text-muted-foreground">View and generate league standings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Generating..." : "Regenerate"}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedLeague} onValueChange={setSelectedLeague}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Select League" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="premier-league">Premier League</SelectItem>
                <SelectItem value="la-liga">La Liga</SelectItem>
                <SelectItem value="serie-a">Serie A</SelectItem>
                <SelectItem value="bundesliga">Bundesliga</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Select Season" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-25">2024/25</SelectItem>
                <SelectItem value="2023-24">2023/24</SelectItem>
                <SelectItem value="2022-23">2022/23</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Champions League</p>
                <p className="text-xs text-muted-foreground">Position 1-4</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Minus className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Europa League</p>
                <p className="text-xs text-muted-foreground">Position 5-6</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Relegation Zone</p>
                <p className="text-xs text-muted-foreground">Position 18-20</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Standings Table */}
      <Card>
        <CardHeader>
          <CardTitle>League Standings</CardTitle>
          <CardDescription>
            Premier League - Season 2024/25 - Updated {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-center">P</TableHead>
                <TableHead className="text-center">W</TableHead>
                <TableHead className="text-center">D</TableHead>
                <TableHead className="text-center">L</TableHead>
                <TableHead className="text-center">GF</TableHead>
                <TableHead className="text-center">GA</TableHead>
                <TableHead className="text-center">GD</TableHead>
                <TableHead className="text-center">Pts</TableHead>
                <TableHead>Form</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standingsData.map((team) => (
                <TableRow key={team.pos} className={
                  team.pos <= 4 ? "bg-green-500/5" :
                  team.pos <= 6 ? "bg-yellow-500/5" :
                  team.pos >= 18 ? "bg-red-500/5" : ""
                }>
                  <TableCell className="font-bold">{team.pos}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-8 w-8 rounded overflow-hidden bg-muted">
                        <Image
                          src={team.logo || "/placeholder.svg"}
                          alt={team.team}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="font-medium">{team.team}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{team.played}</TableCell>
                  <TableCell className="text-center">{team.won}</TableCell>
                  <TableCell className="text-center">{team.drawn}</TableCell>
                  <TableCell className="text-center">{team.lost}</TableCell>
                  <TableCell className="text-center">{team.gf}</TableCell>
                  <TableCell className="text-center">{team.ga}</TableCell>
                  <TableCell className="text-center font-medium">
                    {team.gd > 0 ? `+${team.gd}` : team.gd}
                  </TableCell>
                  <TableCell className="text-center font-bold">{team.points}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {team.form.map((result, idx) => (
                        <span
                          key={idx}
                          className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${formColors[result]}`}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alert */}
      <Card className="border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium">Auto-Update Enabled</p>
              <p className="text-sm text-muted-foreground">
                Standings are automatically recalculated after each match result is entered. 
                You can also manually regenerate standings using the button above.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
