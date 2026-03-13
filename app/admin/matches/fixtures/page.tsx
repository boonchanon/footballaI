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
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react"
import Image from "next/image"

const fixtures = [
  {
    date: "2025-01-28",
    matches: [
      { id: 1, homeTeam: "Liverpool", homeLogo: "/liverpool-logo.png", awayTeam: "Nottm Forest", awayLogo: "/nottingham-forest-logo.jpg", time: "20:00", venue: "Anfield" },
    ],
  },
  {
    date: "2025-01-29",
    matches: [
      { id: 2, homeTeam: "Arsenal", homeLogo: "/arsenal-logo.png", awayTeam: "Man United", awayLogo: "/manchester-united-crest.png", time: "19:30", venue: "Emirates Stadium" },
      { id: 3, homeTeam: "Newcastle", homeLogo: "/newcastle-united-logo.png", awayTeam: "Brighton", awayLogo: "/brighton-logo.png", time: "19:30", venue: "St James Park" },
      { id: 4, homeTeam: "Bournemouth", homeLogo: "/bournemouth-logo.jpg", awayTeam: "West Ham", awayLogo: "/west-ham-united-badge.png", time: "19:30", venue: "Vitality Stadium" },
    ],
  },
  {
    date: "2025-02-01",
    matches: [
      { id: 5, homeTeam: "Man City", homeLogo: "/manchester-city-logo.png", awayTeam: "Chelsea", awayLogo: "/chelsea-football-club-crest.png", time: "12:30", venue: "Etihad Stadium" },
      { id: 6, homeTeam: "Everton", homeLogo: "/everton-fc-badge.png", awayTeam: "Aston Villa", awayLogo: "/aston-villa-logo.png", time: "15:00", venue: "Goodison Park" },
      { id: 7, homeTeam: "Tottenham", homeLogo: "/tottenham-logo.png", awayTeam: "Leicester", awayLogo: "/leicester-logo.jpg", time: "17:30", venue: "Tottenham Hotspur Stadium" },
    ],
  },
]

export default function FixturesAdminPage() {
  const [selectedMatchweek, setSelectedMatchweek] = useState("21")

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Fixtures Management</h1>
          <p className="text-muted-foreground">View and manage upcoming fixtures</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select value={selectedMatchweek} onValueChange={setSelectedMatchweek}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Matchweek" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 38 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  Matchweek {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Fixtures by Date */}
      <div className="space-y-6">
        {fixtures.map((day) => (
          <Card key={day.date}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                {new Date(day.date).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </CardTitle>
              <CardDescription>{day.matches.length} matches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {day.matches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <span className="font-medium text-right">{match.homeTeam}</span>
                      <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
                        <Image
                          src={match.homeLogo || "/placeholder.svg"}
                          alt={match.homeTeam}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col items-center px-4 min-w-[80px]">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {match.time}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
                        <Image
                          src={match.awayLogo || "/placeholder.svg"}
                          alt={match.awayTeam}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="font-medium">{match.awayTeam}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {match.venue}
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">Generate Full Season</Button>
            <Button variant="outline">Import from API</Button>
            <Button variant="outline">Bulk Edit Dates</Button>
            <Button variant="outline">Export Schedule</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
