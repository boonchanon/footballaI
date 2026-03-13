"use client"

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Brain,
  Play,
  Pause,
  Square,
  Download,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react"

const trainingHistory = [
  {
    id: "train-001",
    model: "Custom ML v2.1",
    startedAt: "2026-01-28 14:30",
    completedAt: "2026-01-28 18:45",
    duration: "4h 15m",
    epochs: 100,
    accuracy: 78.5,
    loss: 0.342,
    status: "completed",
  },
  {
    id: "train-002",
    model: "Custom ML v2.0",
    startedAt: "2026-01-25 10:00",
    completedAt: "2026-01-25 15:30",
    duration: "5h 30m",
    epochs: 100,
    accuracy: 75.2,
    loss: 0.389,
    status: "completed",
  },
  {
    id: "train-003",
    model: "Custom ML v1.9",
    startedAt: "2026-01-20 09:00",
    completedAt: null,
    duration: "2h 15m",
    epochs: 45,
    accuracy: 62.1,
    loss: 0.521,
    status: "failed",
  },
  {
    id: "train-004",
    model: "Custom ML v1.8",
    startedAt: "2026-01-15 11:00",
    completedAt: "2026-01-15 14:20",
    duration: "3h 20m",
    epochs: 100,
    accuracy: 72.8,
    loss: 0.412,
    status: "completed",
  },
]

const currentTraining = {
  model: "Custom ML v2.2",
  progress: 67,
  currentEpoch: 67,
  totalEpochs: 100,
  currentAccuracy: 76.3,
  currentLoss: 0.358,
  eta: "1h 23m",
  startedAt: "2026-01-29 09:00",
}

export default function AITrainingPage() {
  const [isTraining, setIsTraining] = useState(true)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training History</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage AI model training sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Play className="h-4 w-4 mr-2" />
            Start New Training
          </Button>
        </div>
      </div>

      {/* Current Training */}
      {isTraining && (
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Brain className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <div>
                  <CardTitle>Training in Progress</CardTitle>
                  <CardDescription>{currentTraining.model}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsTraining(false)}>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress: {currentTraining.currentEpoch}/{currentTraining.totalEpochs} epochs</span>
                  <span>{currentTraining.progress}%</span>
                </div>
                <Progress value={currentTraining.progress} className="h-3" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Current Accuracy</p>
                  <p className="text-2xl font-bold text-green-500">{currentTraining.currentAccuracy}%</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Current Loss</p>
                  <p className="text-2xl font-bold text-yellow-500">{currentTraining.currentLoss}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">ETA</p>
                  <p className="text-2xl font-bold">{currentTraining.eta}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Started At</p>
                  <p className="text-lg font-semibold">{currentTraining.startedAt}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Completed</p>
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
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">78.5%</p>
                <p className="text-sm text-muted-foreground">Best Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">4.2h</p>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Training Sessions</CardTitle>
          <CardDescription>
            History of all model training sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Training ID</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Epochs</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Loss</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainingHistory.map((training) => (
                <TableRow key={training.id}>
                  <TableCell className="font-mono text-sm">{training.id}</TableCell>
                  <TableCell className="font-medium">{training.model}</TableCell>
                  <TableCell>{training.startedAt}</TableCell>
                  <TableCell>{training.duration}</TableCell>
                  <TableCell>{training.epochs}</TableCell>
                  <TableCell>
                    <span className={training.accuracy >= 75 ? "text-green-500" : "text-yellow-500"}>
                      {training.accuracy}%
                    </span>
                  </TableCell>
                  <TableCell>{training.loss}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        training.status === "completed"
                          ? "default"
                          : training.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {training.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {training.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                      {training.status === "running" && <AlertCircle className="h-3 w-3 mr-1" />}
                      {training.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {training.status === "completed" && (
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {training.status === "failed" && (
                        <Button variant="ghost" size="sm">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
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
