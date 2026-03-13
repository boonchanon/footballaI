"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Plus, MoreHorizontal, Calendar, Clock, Play, CheckCircle, Pause } from "lucide-react"
import Image from "next/image"

const matches = [
  {
    id: 1,
    homeTeam: "Liverpool",
    homeLogo: "/liverpool-logo.png",
    awayTeam: "Arsenal",
    awayLogo: "/arsenal-logo.png",
    homeScore: 2,
    awayScore: 1,
    date: "2025-01-25",
    time: "15:00",
    venue: "Anfield",
    status: "completed",
    league: "Premier League",
    matchweek: 20,
  },
  {
    id: 2,
    homeTeam: "Manchester City",
    homeLogo: "/manchester-city-logo.png",
    awayTeam: "Chelsea",
    awayLogo: "/chelsea-football-club-crest.png",
    homeScore: 0,
    awayScore: 0,
    date: "2025-01-26",
    time: "17:30",
    venue: "Etihad Stadium",
    status: "live",
    league: "Premier League",
    matchweek: 20,
  },
  {
    id: 3,
    homeTeam: "Tottenham",
    homeLogo: "/tottenham-logo.png",
    awayTeam: "Newcastle",
    awayLogo: "/newcastle-united-logo.png",
    homeScore: null,
    awayScore: null,
    date: "2025-01-28",
    time: "20:00",
    venue: "Tottenham Hotspur Stadium",
    status: "scheduled",
    league: "Premier League",
    matchweek: 21,
  },
  {
    id: 4,
    homeTeam: "Aston Villa",
    homeLogo: "/aston-villa-logo.png",
    awayTeam: "Brighton",
    awayLogo: "/brighton-logo.png",
    homeScore: null,
    awayScore: null,
    date: "2025-01-29",
    time: "19:45",
    venue: "Villa Park",
    status: "scheduled",
    league: "Premier League",
    matchweek: 21,
  },
]

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-500",
  live: "bg-green-500/10 text-green-500",
  completed: "bg-gray-500/10 text-gray-500",
  postponed: "bg-yellow-500/10 text-yellow-500",
  cancelled: "bg-red-500/10 text-red-500",
}

const statusIcons: Record<string, React.ReactNode> = {
  scheduled: <Clock className="h-3 w-3" />,
  live: <Play className="h-3 w-3" />,
  completed: <CheckCircle className="h-3 w-3" />,
  postponed: <Pause className="h-3 w-3" />,
}

export default function MatchesAdminPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredMatches = matches.filter(
    (match) =>
      match.homeTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.awayTeam.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Match Management</h1>
          <p className="text-muted-foreground">Manage fixtures, scores, and match events</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Match
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Match</DialogTitle>
              <DialogDescription>
                Schedule a new match fixture.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Home Team</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="liverpool">Liverpool</SelectItem>
                      <SelectItem value="arsenal">Arsenal</SelectItem>
                      <SelectItem value="man-city">Manchester City</SelectItem>
                      <SelectItem value="chelsea">Chelsea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Away Team</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="liverpool">Liverpool</SelectItem>
                      <SelectItem value="arsenal">Arsenal</SelectItem>
                      <SelectItem value="man-city">Manchester City</SelectItem>
                      <SelectItem value="chelsea">Chelsea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>League</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select league" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premier-league">Premier League</SelectItem>
                    <SelectItem value="fa-cup">FA Cup</SelectItem>
                    <SelectItem value="league-cup">League Cup</SelectItem>
                    <SelectItem value="ucl">Champions League</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Venue</Label>
                <Input placeholder="Enter stadium name" />
              </div>
              <div className="space-y-2">
                <Label>Matchweek</Label>
                <Input type="number" placeholder="e.g. 21" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>
                Create Match
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{matches.length}</p>
                <p className="text-sm text-muted-foreground">Total Matches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Play className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{matches.filter(m => m.status === "live").length}</p>
                <p className="text-sm text-muted-foreground">Live Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{matches.filter(m => m.status === "scheduled").length}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{matches.filter(m => m.status === "completed").length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search matches..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="League" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leagues</SelectItem>
                  <SelectItem value="premier-league">Premier League</SelectItem>
                  <SelectItem value="fa-cup">FA Cup</SelectItem>
                  <SelectItem value="ucl">Champions League</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="postponed">Postponed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matches Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Matches</CardTitle>
          <CardDescription>
            {filteredMatches.length} matches found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatches.map((match) => (
                <TableRow key={match.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="relative h-8 w-8 rounded overflow-hidden bg-muted">
                          <Image
                            src={match.homeLogo || "/placeholder.svg"}
                            alt={match.homeTeam}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <span className="font-medium text-sm">{match.homeTeam}</span>
                      </div>
                      <span className="text-muted-foreground text-sm">vs</span>
                      <div className="flex items-center gap-2">
                        <div className="relative h-8 w-8 rounded overflow-hidden bg-muted">
                          <Image
                            src={match.awayLogo || "/placeholder.svg"}
                            alt={match.awayTeam}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <span className="font-medium text-sm">{match.awayTeam}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {match.homeScore !== null ? (
                      <span className="font-bold">
                        {match.homeScore} - {match.awayScore}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{new Date(match.date).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{match.time}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{match.venue}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`${statusColors[match.status]} flex items-center gap-1 w-fit`}>
                      {statusIcons[match.status]}
                      {match.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Match</DropdownMenuItem>
                        <DropdownMenuItem>Update Score</DropdownMenuItem>
                        <DropdownMenuItem>Manage Events</DropdownMenuItem>
                        <DropdownMenuItem>Set Lineups</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500">
                          Delete Match
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
