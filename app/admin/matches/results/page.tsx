"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, Edit2, Plus, Trash2, UserCircle, AlertTriangle } from "lucide-react"
import Image from "next/image"

const resultsData = [
  {
    id: 1,
    homeTeam: "Liverpool",
    homeLogo: "/liverpool-logo.png",
    homeScore: 2,
    awayTeam: "Arsenal",
    awayLogo: "/arsenal-logo.png",
    awayScore: 1,
    date: "2025-01-25",
    events: [
      { type: "goal", player: "Salah", team: "home", minute: 23 },
      { type: "goal", player: "Saka", team: "away", minute: 45 },
      { type: "goal", player: "Diaz", team: "home", minute: 78 },
      { type: "yellow", player: "Rice", team: "away", minute: 55 },
    ],
  },
  {
    id: 2,
    homeTeam: "Chelsea",
    homeLogo: "/chelsea-football-club-crest.png",
    homeScore: 3,
    awayTeam: "Tottenham",
    awayLogo: "/tottenham-logo.png",
    awayScore: 3,
    date: "2025-01-24",
    events: [
      { type: "goal", player: "Palmer", team: "home", minute: 12 },
      { type: "goal", player: "Son", team: "away", minute: 28 },
      { type: "goal", player: "Palmer", team: "home", minute: 34 },
      { type: "red", player: "Romero", team: "away", minute: 65 },
      { type: "goal", player: "Kulusevski", team: "away", minute: 70 },
      { type: "goal", player: "Son", team: "away", minute: 85 },
      { type: "goal", player: "Jackson", team: "home", minute: 90 },
    ],
  },
  {
    id: 3,
    homeTeam: "Newcastle",
    homeLogo: "/newcastle-united-logo.png",
    homeScore: 1,
    awayTeam: "Bournemouth",
    awayLogo: "/bournemouth-logo.jpg",
    awayScore: 0,
    date: "2025-01-23",
    events: [
      { type: "goal", player: "Isak", team: "home", minute: 67 },
      { type: "yellow", player: "Senesi", team: "away", minute: 72 },
    ],
  },
]

export default function ResultsAdminPage() {
  const [selectedMatch, setSelectedMatch] = useState<typeof resultsData[0] | null>(null)
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Match Results</h1>
          <p className="text-muted-foreground">Update scores and match events</p>
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {resultsData.map((match) => (
          <Card key={match.id}>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                {/* Match Info */}
                <div className="flex items-center justify-center gap-4 flex-1">
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <span className="font-medium text-lg text-right">{match.homeTeam}</span>
                    <div className="relative h-12 w-12 rounded overflow-hidden bg-muted">
                      <Image src={match.homeLogo || "/placeholder.svg"} alt={match.homeTeam} fill className="object-contain" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-4">
                    <span className="text-3xl font-bold">{match.homeScore}</span>
                    <span className="text-xl text-muted-foreground">-</span>
                    <span className="text-3xl font-bold">{match.awayScore}</span>
                  </div>

                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative h-12 w-12 rounded overflow-hidden bg-muted">
                      <Image src={match.awayLogo || "/placeholder.svg"} alt={match.awayTeam} fill className="object-contain" />
                    </div>
                    <span className="font-medium text-lg">{match.awayTeam}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-center lg:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMatch(match)
                      setIsScoreDialogOpen(true)
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Score
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMatch(match)
                      setIsEventDialogOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Events
                  </Button>
                </div>
              </div>

              {/* Events */}
              {match.events.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Match Events</p>
                  <div className="flex flex-wrap gap-2">
                    {match.events.map((event, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className={
                          event.type === "goal" ? "bg-green-500/10 text-green-500" :
                          event.type === "yellow" ? "bg-yellow-500/10 text-yellow-500" :
                          "bg-red-500/10 text-red-500"
                        }
                      >
                        {event.minute}&apos; {event.player} ({event.type})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(match.date).toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </div>
                <Badge variant="secondary">Completed</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Score Dialog */}
      <Dialog open={isScoreDialogOpen} onOpenChange={setIsScoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Match Score</DialogTitle>
            <DialogDescription>
              {selectedMatch?.homeTeam} vs {selectedMatch?.awayTeam}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">{selectedMatch?.homeTeam}</p>
                <Input
                  type="number"
                  className="w-20 text-center text-2xl"
                  defaultValue={selectedMatch?.homeScore}
                />
              </div>
              <span className="text-2xl text-muted-foreground">-</span>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">{selectedMatch?.awayTeam}</p>
                <Input
                  type="number"
                  className="w-20 text-center text-2xl"
                  defaultValue={selectedMatch?.awayScore}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsScoreDialogOpen(false)}>
              Update Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Events Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Match Events</DialogTitle>
            <DialogDescription>
              Add or edit events for {selectedMatch?.homeTeam} vs {selectedMatch?.awayTeam}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Existing Events */}
            <div className="space-y-2">
              {selectedMatch?.events.map((event, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{event.minute}&apos;</span>
                    <Badge variant="secondary" className={
                      event.type === "goal" ? "bg-green-500/10 text-green-500" :
                      event.type === "yellow" ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-red-500/10 text-red-500"
                    }>
                      {event.type}
                    </Badge>
                    <span className="text-sm">{event.player}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add New Event */}
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium mb-3">Add New Event</p>
              <div className="grid grid-cols-2 gap-3">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goal">Goal</SelectItem>
                    <SelectItem value="yellow">Yellow Card</SelectItem>
                    <SelectItem value="red">Red Card</SelectItem>
                    <SelectItem value="sub">Substitution</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Minute" type="number" />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input placeholder="Player Name" />
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">{selectedMatch?.homeTeam}</SelectItem>
                    <SelectItem value="away">{selectedMatch?.awayTeam}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full mt-3">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
