"use client"

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
import { Search, Plus, MoreHorizontal, Users, Target, Medal, Upload } from "lucide-react"
import Image from "next/image"

const players = [
  { id: 1, name: "Mohamed Salah", image: "/mohamed-salah-action.png", team: "Liverpool", position: "RW", nationality: "Egypt", age: 32, goals: 18, assists: 12, rating: 8.2 },
  { id: 2, name: "Erling Haaland", image: "/erling-haaland-celebration.png", team: "Man City", position: "ST", nationality: "Norway", age: 24, goals: 16, assists: 4, rating: 7.9 },
  { id: 3, name: "Cole Palmer", image: "/players/palmer.webp", team: "Chelsea", position: "AM", nationality: "England", age: 22, goals: 14, assists: 8, rating: 8.0 },
  { id: 4, name: "Bukayo Saka", image: "/players/saka.webp", team: "Arsenal", position: "RW", nationality: "England", age: 23, goals: 11, assists: 10, rating: 7.8 },
  { id: 5, name: "Alexander Isak", image: "/players/isak.jpg", team: "Newcastle", position: "ST", nationality: "Sweden", age: 25, goals: 15, assists: 5, rating: 7.7 },
  { id: 6, name: "Bruno Fernandes", image: "/bruno-fernandes-soccer.png", team: "Man United", position: "AM", nationality: "Portugal", age: 30, goals: 8, assists: 9, rating: 7.4 },
  { id: 7, name: "Heung-min Son", image: "/son-tottenham-team.jpg", team: "Tottenham", position: "LW", nationality: "South Korea", age: 32, goals: 12, assists: 7, rating: 7.6 },
  { id: 8, name: "Martin Odegaard", image: "/players/rice.jpg", team: "Arsenal", position: "AM", nationality: "Norway", age: 26, goals: 7, assists: 11, rating: 7.9 },
]

const positionColors: Record<string, string> = {
  GK: "bg-yellow-500/10 text-yellow-500",
  CB: "bg-blue-500/10 text-blue-500",
  RB: "bg-blue-500/10 text-blue-500",
  LB: "bg-blue-500/10 text-blue-500",
  DM: "bg-green-500/10 text-green-500",
  CM: "bg-green-500/10 text-green-500",
  AM: "bg-green-500/10 text-green-500",
  RW: "bg-purple-500/10 text-purple-500",
  LW: "bg-purple-500/10 text-purple-500",
  ST: "bg-red-500/10 text-red-500",
}

export default function PlayersAdminPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredPlayers = players.filter(
    (player) =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.team.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Player Management</h1>
          <p className="text-muted-foreground">Manage player profiles and statistics</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Player
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Player</DialogTitle>
              <DialogDescription>
                Create a new player profile in the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input placeholder="Player name" />
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" placeholder="25" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Team</Label>
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
                  <Label>Position</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GK">Goalkeeper</SelectItem>
                      <SelectItem value="CB">Center Back</SelectItem>
                      <SelectItem value="RB">Right Back</SelectItem>
                      <SelectItem value="LB">Left Back</SelectItem>
                      <SelectItem value="DM">Defensive Mid</SelectItem>
                      <SelectItem value="CM">Center Mid</SelectItem>
                      <SelectItem value="AM">Attacking Mid</SelectItem>
                      <SelectItem value="RW">Right Wing</SelectItem>
                      <SelectItem value="LW">Left Wing</SelectItem>
                      <SelectItem value="ST">Striker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input placeholder="e.g. England" />
              </div>
              <div className="space-y-2">
                <Label>Player Photo</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload photo</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>
                Create Player
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
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{players.length}</p>
                <p className="text-sm text-muted-foreground">Total Players</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Target className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{players.reduce((acc, p) => acc + p.goals, 0)}</p>
                <p className="text-sm text-muted-foreground">Total Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Medal className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{players.reduce((acc, p) => acc + p.assists, 0)}</p>
                <p className="text-sm text-muted-foreground">Total Assists</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(players.reduce((acc, p) => acc + p.rating, 0) / players.length).toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="liverpool">Liverpool</SelectItem>
                  <SelectItem value="arsenal">Arsenal</SelectItem>
                  <SelectItem value="man-city">Man City</SelectItem>
                  <SelectItem value="chelsea">Chelsea</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="gk">GK</SelectItem>
                  <SelectItem value="def">DEF</SelectItem>
                  <SelectItem value="mid">MID</SelectItem>
                  <SelectItem value="fwd">FWD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
          <CardDescription>
            {filteredPlayers.length} players found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Nationality</TableHead>
                <TableHead className="text-center">Goals</TableHead>
                <TableHead className="text-center">Assists</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted">
                        <Image
                          src={player.image || "/placeholder.svg"}
                          alt={player.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium">{player.name}</p>
                        <p className="text-xs text-muted-foreground">{player.age} years</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{player.team}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={positionColors[player.position]}>
                      {player.position}
                    </Badge>
                  </TableCell>
                  <TableCell>{player.nationality}</TableCell>
                  <TableCell className="text-center font-medium">{player.goals}</TableCell>
                  <TableCell className="text-center font-medium">{player.assists}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={
                      player.rating >= 8 ? "bg-green-500/10 text-green-500" :
                      player.rating >= 7 ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-red-500/10 text-red-500"
                    }>
                      {player.rating}
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
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem>Edit Player</DropdownMenuItem>
                        <DropdownMenuItem>Update Stats</DropdownMenuItem>
                        <DropdownMenuItem>Compare</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500">
                          Delete Player
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
