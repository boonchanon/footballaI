"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Search,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Target,
  Percent,
} from "lucide-react"

const predictionLogs = [
  {
    id: "pred-001",
    matchId: "match-456",
    homeTeam: "Manchester City",
    awayTeam: "Liverpool",
    prediction: "Home Win",
    confidence: 68,
    actualResult: "Draw",
    correct: false,
    model: "GPT-4o",
    createdAt: "2026-01-28 14:00",
    responseTime: "2.3s",
  },
  {
    id: "pred-002",
    matchId: "match-457",
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    prediction: "Home Win",
    confidence: 72,
    actualResult: "Home Win",
    correct: true,
    model: "GPT-4o",
    createdAt: "2026-01-28 16:30",
    responseTime: "1.8s",
  },
  {
    id: "pred-003",
    matchId: "match-458",
    homeTeam: "Tottenham",
    awayTeam: "Man United",
    prediction: "Draw",
    confidence: 55,
    actualResult: "Away Win",
    correct: false,
    model: "Claude 3 Opus",
    createdAt: "2026-01-27 15:00",
    responseTime: "2.1s",
  },
  {
    id: "pred-004",
    matchId: "match-459",
    homeTeam: "Newcastle",
    awayTeam: "Brighton",
    prediction: "Home Win",
    confidence: 65,
    actualResult: "Home Win",
    correct: true,
    model: "GPT-4o",
    createdAt: "2026-01-27 12:30",
    responseTime: "1.9s",
  },
  {
    id: "pred-005",
    matchId: "match-460",
    homeTeam: "Aston Villa",
    awayTeam: "West Ham",
    prediction: "Home Win",
    confidence: 70,
    actualResult: "Home Win",
    correct: true,
    model: "Custom ML v2.1",
    createdAt: "2026-01-26 20:00",
    responseTime: "0.5s",
  },
  {
    id: "pred-006",
    matchId: "match-461",
    homeTeam: "Everton",
    awayTeam: "Wolves",
    prediction: "Draw",
    confidence: 58,
    actualResult: null,
    correct: null,
    model: "GPT-4o",
    createdAt: "2026-01-29 10:00",
    responseTime: "2.0s",
  },
]

export default function PredictionLogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [modelFilter, setModelFilter] = useState("all")

  const filteredLogs = predictionLogs.filter((log) => {
    const matchesSearch =
      log.homeTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.awayTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "correct" && log.correct === true) ||
      (statusFilter === "incorrect" && log.correct === false) ||
      (statusFilter === "pending" && log.correct === null)

    const matchesModel = modelFilter === "all" || log.model === modelFilter

    return matchesSearch && matchesStatus && matchesModel
  })

  const totalPredictions = predictionLogs.length
  const correctPredictions = predictionLogs.filter((l) => l.correct === true).length
  const incorrectPredictions = predictionLogs.filter((l) => l.correct === false).length
  const pendingPredictions = predictionLogs.filter((l) => l.correct === null).length
  const accuracyRate = ((correctPredictions / (correctPredictions + incorrectPredictions)) * 100).toFixed(1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prediction Logs</h1>
          <p className="text-muted-foreground mt-1">
            View and analyze AI prediction history
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPredictions}</p>
                <p className="text-sm text-muted-foreground">Total Predictions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{correctPredictions}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{incorrectPredictions}</p>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Percent className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{accuracyRate}%</p>
                <p className="text-sm text-muted-foreground">Accuracy Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by team or prediction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="correct">Correct</SelectItem>
                <SelectItem value="incorrect">Incorrect</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="GPT-4o">GPT-4o</SelectItem>
                <SelectItem value="Claude 3 Opus">Claude 3 Opus</SelectItem>
                <SelectItem value="Custom ML v2.1">Custom ML v2.1</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction History</CardTitle>
          <CardDescription>
            {filteredLogs.length} predictions found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Prediction</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Actual Result</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">{log.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{log.homeTeam}</div>
                    <div className="text-sm text-muted-foreground">vs {log.awayTeam}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.prediction}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            log.confidence >= 70
                              ? "bg-green-500"
                              : log.confidence >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${log.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm">{log.confidence}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.actualResult ? (
                      <Badge variant="secondary">{log.actualResult}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Pending</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{log.model}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{log.responseTime}</span>
                  </TableCell>
                  <TableCell>
                    {log.correct === true && (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Correct
                      </Badge>
                    )}
                    {log.correct === false && (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Incorrect
                      </Badge>
                    )}
                    {log.correct === null && (
                      <Badge variant="secondary">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Prediction Details</DialogTitle>
                          <DialogDescription>
                            {log.homeTeam} vs {log.awayTeam}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">Prediction ID</p>
                              <p className="font-mono">{log.id}</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">Match ID</p>
                              <p className="font-mono">{log.matchId}</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">Model Used</p>
                              <p className="font-medium">{log.model}</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">Created At</p>
                              <p className="font-medium">{log.createdAt}</p>
                            </div>
                          </div>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">AI Analysis</p>
                            <p className="text-sm">
                              Based on recent form, head-to-head records, and player availability,
                              the model predicted a <strong>{log.prediction}</strong> with{" "}
                              <strong>{log.confidence}%</strong> confidence. Key factors included
                              home advantage, recent winning streak, and key player fitness.
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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
