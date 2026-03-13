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
import { RefreshCw, Download, TrendingUp, TrendingDown, Target, Shield } from "lucide-react"
import Image from "next/image"

const teamStats = {
  general: {
    played: 20,
    won: 15,
    drawn: 4,
    lost: 1,
    goalsFor: 48,
    goalsAgainst: 18,
    cleanSheets: 10,
    points: 49,
  },
  attacking: {
    totalShots: 289,
    shotsOnTarget: 128,
    bigChances: 45,
    xG: 42.5,
    penaltiesScored: 3,
  },
  defending: {
    tackles: 340,
    interceptions: 189,
    blocks: 78,
    clearances: 245,
    xGA: 21.3,
  },
  passing: {
    totalPasses: 12456,
    passAccuracy: 87.3,
    keyPasses: 178,
    crosses: 234,
    throughBalls: 45,
  },
}

export default function TeamStatsAdminPage() {
  const [selectedTeam, setSelectedTeam] = useState("liverpool")
  const [selectedSeason, setSelectedSeason] = useState("2024-25")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Team Statistics</h1>
          <p className="text-muted-foreground">View and manage team performance data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Syncing..." : "Sync Data"}
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
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="liverpool">Liverpool</SelectItem>
                <SelectItem value="arsenal">Arsenal</SelectItem>
                <SelectItem value="man-city">Manchester City</SelectItem>
                <SelectItem value="chelsea">Chelsea</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Season" />
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

      {/* Team Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 rounded overflow-hidden bg-muted">
              <Image src="/liverpool-logo.png" alt="Liverpool" fill className="object-contain" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Liverpool FC</h2>
              <p className="text-muted-foreground">Premier League - Season 2024/25</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  1st Place
                </Badge>
                <Badge variant="secondary">49 Points</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{teamStats.general.played}</p>
            <p className="text-xs text-muted-foreground">Played</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{teamStats.general.won}</p>
            <p className="text-xs text-muted-foreground">Won</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{teamStats.general.drawn}</p>
            <p className="text-xs text-muted-foreground">Drawn</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{teamStats.general.lost}</p>
            <p className="text-xs text-muted-foreground">Lost</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{teamStats.general.goalsFor}</p>
            <p className="text-xs text-muted-foreground">Goals For</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{teamStats.general.goalsAgainst}</p>
            <p className="text-xs text-muted-foreground">Goals Against</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{teamStats.general.cleanSheets}</p>
            <p className="text-xs text-muted-foreground">Clean Sheets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{teamStats.general.points}</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Attacking Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              Attacking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Shots</span>
              <span className="font-medium">{teamStats.attacking.totalShots}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shots on Target</span>
              <span className="font-medium">{teamStats.attacking.shotsOnTarget}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Big Chances</span>
              <span className="font-medium">{teamStats.attacking.bigChances}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Goals (xG)</span>
              <span className="font-medium">{teamStats.attacking.xG}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Penalties Scored</span>
              <span className="font-medium">{teamStats.attacking.penaltiesScored}</span>
            </div>
          </CardContent>
        </Card>

        {/* Defending Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Defending
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tackles</span>
              <span className="font-medium">{teamStats.defending.tackles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Interceptions</span>
              <span className="font-medium">{teamStats.defending.interceptions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Blocks</span>
              <span className="font-medium">{teamStats.defending.blocks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Clearances</span>
              <span className="font-medium">{teamStats.defending.clearances}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Goals Against (xGA)</span>
              <span className="font-medium">{teamStats.defending.xGA}</span>
            </div>
          </CardContent>
        </Card>

        {/* Passing Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Passing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Passes</span>
              <span className="font-medium">{teamStats.passing.totalPasses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pass Accuracy</span>
              <span className="font-medium">{teamStats.passing.passAccuracy}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Key Passes</span>
              <span className="font-medium">{teamStats.passing.keyPasses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Crosses</span>
              <span className="font-medium">{teamStats.passing.crosses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Through Balls</span>
              <span className="font-medium">{teamStats.passing.throughBalls}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Stats Update</CardTitle>
          <CardDescription>
            Use this section to manually update team statistics if needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">Edit General Stats</Button>
            <Button variant="outline">Edit Attacking Stats</Button>
            <Button variant="outline">Edit Defending Stats</Button>
            <Button variant="outline">Edit Passing Stats</Button>
            <Button variant="outline">Recalculate All</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
