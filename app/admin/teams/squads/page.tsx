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
import { Search, Plus, Edit2, Trash2, UserPlus } from "lucide-react"
import Image from "next/image"

const squadData = [
  { id: 1, name: "Mohamed Salah", number: 11, position: "RW", nationality: "Egypt", age: 32, marketValue: "€70M", status: "fit" },
  { id: 2, name: "Virgil van Dijk", number: 4, position: "CB", nationality: "Netherlands", age: 33, marketValue: "€35M", status: "fit" },
  { id: 3, name: "Trent Alexander-Arnold", number: 66, position: "RB", nationality: "England", age: 26, marketValue: "€70M", status: "fit" },
  { id: 4, name: "Alisson Becker", number: 1, position: "GK", nationality: "Brazil", age: 32, marketValue: "€35M", status: "fit" },
  { id: 5, name: "Darwin Nunez", number: 9, position: "ST", nationality: "Uruguay", age: 25, marketValue: "€65M", status: "fit" },
  { id: 6, name: "Alexis Mac Allister", number: 10, position: "CM", nationality: "Argentina", age: 26, marketValue: "€75M", status: "fit" },
  { id: 7, name: "Luis Diaz", number: 7, position: "LW", nationality: "Colombia", age: 28, marketValue: "€75M", status: "injured" },
  { id: 8, name: "Ryan Gravenberch", number: 38, position: "DM", nationality: "Netherlands", age: 22, marketValue: "€50M", status: "fit" },
  { id: 9, name: "Dominik Szoboszlai", number: 8, position: "AM", nationality: "Hungary", age: 24, marketValue: "€70M", status: "fit" },
  { id: 10, name: "Cody Gakpo", number: 18, position: "LW", nationality: "Netherlands", age: 25, marketValue: "€55M", status: "fit" },
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

const statusColors: Record<string, string> = {
  fit: "bg-green-500/10 text-green-500",
  injured: "bg-red-500/10 text-red-500",
  suspended: "bg-yellow-500/10 text-yellow-500",
}

export default function SquadsAdminPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTeam, setSelectedTeam] = useState("liverpool")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredSquad = squadData.filter(
    (player) => player.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Squad Management</h1>
          <p className="text-muted-foreground">Manage team squads and player assignments</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Player
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Player to Squad</DialogTitle>
              <DialogDescription>
                Add a new player to the team squad.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Player Name</Label>
                  <Input placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label>Squad Number</Label>
                  <Input type="number" placeholder="11" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
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
                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <Input placeholder="e.g. England" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" placeholder="25" />
                </div>
                <div className="space-y-2">
                  <Label>Market Value</Label>
                  <Input placeholder="e.g. €50M" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>
                Add Player
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="liverpool">Liverpool</SelectItem>
                <SelectItem value="arsenal">Arsenal</SelectItem>
                <SelectItem value="man-city">Manchester City</SelectItem>
                <SelectItem value="chelsea">Chelsea</SelectItem>
                <SelectItem value="man-united">Manchester United</SelectItem>
                <SelectItem value="tottenham">Tottenham</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
        </CardContent>
      </Card>

      {/* Team Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded overflow-hidden bg-muted">
              <Image src="/liverpool-logo.png" alt="Liverpool" fill className="object-contain" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Liverpool FC</h2>
              <p className="text-muted-foreground">Premier League</p>
            </div>
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-2xl font-bold">{squadData.length}</p>
                <p className="text-sm text-muted-foreground">Players</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{squadData.filter(p => p.status === "fit").length}</p>
                <p className="text-sm text-muted-foreground">Fit</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{squadData.filter(p => p.status === "injured").length}</p>
                <p className="text-sm text-muted-foreground">Injured</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Squad Table */}
      <Card>
        <CardHeader>
          <CardTitle>Squad List</CardTitle>
          <CardDescription>
            {filteredSquad.length} players
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Nationality</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Market Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSquad.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-bold">{player.number}</TableCell>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={positionColors[player.position]}>
                      {player.position}
                    </Badge>
                  </TableCell>
                  <TableCell>{player.nationality}</TableCell>
                  <TableCell>{player.age}</TableCell>
                  <TableCell>{player.marketValue}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[player.status]}>
                      {player.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
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
