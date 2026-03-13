"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw, CheckCircle, AlertCircle, Clock, Database, Cloud, Zap } from "lucide-react"

const syncHistory = [
  { id: 1, source: "API Football", type: "Full Sync", status: "completed", records: 1245, date: "2025-01-28 14:30", duration: "2m 15s" },
  { id: 2, source: "Transfermarkt", type: "Player Values", status: "completed", records: 892, date: "2025-01-28 12:00", duration: "1m 45s" },
  { id: 3, source: "API Football", type: "Stats Update", status: "completed", records: 3456, date: "2025-01-27 20:00", duration: "3m 22s" },
  { id: 4, source: "Manual Import", type: "CSV Upload", status: "failed", records: 0, date: "2025-01-27 15:30", duration: "-" },
  { id: 5, source: "API Football", type: "Full Sync", status: "completed", records: 1243, date: "2025-01-26 14:30", duration: "2m 18s" },
]

const statusColors: Record<string, string> = {
  completed: "bg-green-500/10 text-green-500",
  failed: "bg-red-500/10 text-red-500",
  running: "bg-blue-500/10 text-blue-500",
  pending: "bg-yellow-500/10 text-yellow-500",
}

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-3 w-3" />,
  failed: <AlertCircle className="h-3 w-3" />,
  running: <RefreshCw className="h-3 w-3 animate-spin" />,
  pending: <Clock className="h-3 w-3" />,
}

export default function PlayerSyncPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [selectedSource, setSelectedSource] = useState("api-football")

  const handleSync = () => {
    setIsSyncing(true)
    setSyncProgress(0)
    
    const interval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsSyncing(false)
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Data Synchronization</h1>
          <p className="text-muted-foreground">Sync player data from external sources</p>
        </div>
      </div>

      {/* Sync Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">5,432</p>
                <p className="text-sm text-muted-foreground">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">23</p>
                <p className="text-sm text-muted-foreground">Successful Syncs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-sm text-muted-foreground">Failed Syncs</p>
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
                <p className="text-2xl font-bold">2h ago</p>
                <p className="text-sm text-muted-foreground">Last Sync</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Action */}
      <Card>
        <CardHeader>
          <CardTitle>Start Synchronization</CardTitle>
          <CardDescription>
            Choose a data source and sync type to update player data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Source</label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api-football">API Football</SelectItem>
                  <SelectItem value="transfermarkt">Transfermarkt</SelectItem>
                  <SelectItem value="sofascore">SofaScore</SelectItem>
                  <SelectItem value="manual">Manual Import</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sync Type</label>
              <Select defaultValue="full">
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Sync</SelectItem>
                  <SelectItem value="stats">Stats Only</SelectItem>
                  <SelectItem value="values">Market Values</SelectItem>
                  <SelectItem value="new">New Players Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">League</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="Select league" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leagues</SelectItem>
                  <SelectItem value="premier-league">Premier League</SelectItem>
                  <SelectItem value="la-liga">La Liga</SelectItem>
                  <SelectItem value="serie-a">Serie A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Syncing data...</span>
                <span>{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Start Sync"}
            </Button>
            <Button variant="outline" disabled={isSyncing}>
              <Zap className="h-4 w-4 mr-2" />
              Quick Sync
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>Recent synchronization activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {syncHistory.map((sync) => (
              <div
                key={sync.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-lg">
                    <Cloud className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{sync.source}</p>
                    <p className="text-sm text-muted-foreground">{sync.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <p className="text-sm">{sync.records.toLocaleString()} records</p>
                    <p className="text-xs text-muted-foreground">{sync.duration}</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-sm">{sync.date}</p>
                  </div>
                  <Badge variant="secondary" className={`${statusColors[sync.status]} flex items-center gap-1`}>
                    {statusIcons[sync.status]}
                    {sync.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Manage external API connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-green-500/10 text-green-500">Connected</Badge>
                <span className="font-medium">API Football</span>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-green-500/10 text-green-500">Connected</Badge>
                <span className="font-medium">Transfermarkt</span>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-gray-500/10 text-gray-500">Not Connected</Badge>
                <span className="font-medium">SofaScore</span>
              </div>
              <Button variant="outline" size="sm">Connect</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
