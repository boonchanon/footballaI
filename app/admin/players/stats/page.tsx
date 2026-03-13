"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Save, RefreshCw, Search } from "lucide-react"
import Image from "next/image"

const playerStats = {
  player: {
    name: "Mohamed Salah",
    image: "/mohamed-salah-action.png",
    team: "Liverpool",
    position: "RW",
    number: 11,
  },
  attacking: {
    goals: 18,
    assists: 12,
    shots: 89,
    shotsOnTarget: 45,
    xG: 15.2,
    xA: 9.8,
    bigChances: 22,
    bigChancesMissed: 8,
    penaltyGoals: 2,
  },
  passing: {
    totalPasses: 845,
    passAccuracy: 81.5,
    keyPasses: 56,
    throughBalls: 12,
    longBalls: 34,
    crossesCompleted: 28,
  },
  defending: {
    tackles: 24,
    tacklesWon: 16,
    interceptions: 18,
    blocksShots: 4,
    clearances: 8,
    aerialDuelsWon: 12,
  },
  physical: {
    minutesPlayed: 1620,
    appearances: 20,
    starts: 19,
    distanceCovered: 198.5,
    sprints: 412,
    foulsDrawn: 34,
    foulsConceded: 12,
  },
}

export default function PlayerStatsAdminPage() {
  const [selectedPlayer, setSelectedPlayer] = useState("salah")
  const [searchQuery, setSearchQuery] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      setIsEditing(false)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Player Statistics</h1>
          <p className="text-muted-foreground">View and edit detailed player stats</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Edit Stats
            </Button>
          )}
        </div>
      </div>

      {/* Player Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search player..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger className="w-full md:w-48">
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

      {/* Player Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted">
              <Image src={playerStats.player.image || "/placeholder.svg"} alt={playerStats.player.name} fill className="object-cover" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{playerStats.player.name}</h2>
              <p className="text-muted-foreground">{playerStats.player.team} - #{playerStats.player.number}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{playerStats.player.position}</Badge>
                <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                  {playerStats.attacking.goals} Goals
                </Badge>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                  {playerStats.attacking.assists} Assists
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attacking Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Attacking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Goals</Label>
                <Input
                  type="number"
                  value={playerStats.attacking.goals}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Assists</Label>
                <Input
                  type="number"
                  value={playerStats.attacking.assists}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Shots</Label>
                <Input
                  type="number"
                  value={playerStats.attacking.shots}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Shots on Target</Label>
                <Input
                  type="number"
                  value={playerStats.attacking.shotsOnTarget}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>xG</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={playerStats.attacking.xG}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>xA</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={playerStats.attacking.xA}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passing Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Passing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Passes</Label>
                <Input
                  type="number"
                  value={playerStats.passing.totalPasses}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Pass Accuracy (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={playerStats.passing.passAccuracy}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Key Passes</Label>
                <Input
                  type="number"
                  value={playerStats.passing.keyPasses}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Through Balls</Label>
                <Input
                  type="number"
                  value={playerStats.passing.throughBalls}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Long Balls</Label>
                <Input
                  type="number"
                  value={playerStats.passing.longBalls}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Crosses Completed</Label>
                <Input
                  type="number"
                  value={playerStats.passing.crossesCompleted}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Defending Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Defending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tackles</Label>
                <Input
                  type="number"
                  value={playerStats.defending.tackles}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Tackles Won</Label>
                <Input
                  type="number"
                  value={playerStats.defending.tacklesWon}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Interceptions</Label>
                <Input
                  type="number"
                  value={playerStats.defending.interceptions}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Blocks</Label>
                <Input
                  type="number"
                  value={playerStats.defending.blocksShots}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Clearances</Label>
                <Input
                  type="number"
                  value={playerStats.defending.clearances}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Aerial Duels Won</Label>
                <Input
                  type="number"
                  value={playerStats.defending.aerialDuelsWon}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Physical Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Physical</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minutes Played</Label>
                <Input
                  type="number"
                  value={playerStats.physical.minutesPlayed}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Appearances</Label>
                <Input
                  type="number"
                  value={playerStats.physical.appearances}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Starts</Label>
                <Input
                  type="number"
                  value={playerStats.physical.starts}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Distance (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={playerStats.physical.distanceCovered}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Sprints</Label>
                <Input
                  type="number"
                  value={playerStats.physical.sprints}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Fouls Drawn</Label>
                <Input
                  type="number"
                  value={playerStats.physical.foulsDrawn}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
