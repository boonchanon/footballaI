"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import {
  Brain,
  Settings,
  Zap,
  Database,
  RefreshCw,
  Save,
  Play,
  Download,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { getAuthToken } from "@/lib/auth-client"

const models = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", status: "active" },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic", status: "active" },
  { id: "custom-ml", name: "Custom ML Model", provider: "Internal", status: "training" },
]

export default function AIConfigPage() {
  const [selectedModel, setSelectedModel] = useState("gpt-4o")
  const [temperature, setTemperature] = useState([0.7])
  const [maxTokens, setMaxTokens] = useState([2048])
  const [autoPredict, setAutoPredict] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [syncMode, setSyncMode] = useState<"fixtures" | "snapshot" | "all">("all")
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState("")
  const [syncStatus, setSyncStatus] = useState<any>(null)

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 1500))
    setIsSaving(false)
  }

  const loadSyncStatus = async () => {
    const token = getAuthToken()
    if (!token) {
      setSyncMessage("ยังไม่พบ token ของผู้ใช้แอดมิน")
      return
    }

    const response = await fetch("/api/admin/sync/premier-league", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()
    if (!response.ok) {
      setSyncMessage(data?.error || "โหลดสถานะ sync ไม่สำเร็จ")
      return
    }

    setSyncStatus(data)
  }

  const handleSync = async () => {
    const token = getAuthToken()
    if (!token) {
      setSyncMessage("ยังไม่พบ token ของผู้ใช้แอดมิน")
      return
    }

    setIsSyncing(true)
    setSyncMessage("")

    try {
      const response = await fetch("/api/admin/sync/premier-league", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: syncMode }),
      })

      const data = await response.json()
      if (!response.ok) {
        setSyncMessage(data?.error || "Sync ไม่สำเร็จ")
        return
      }

      setSyncStatus(data.status || null)
      setSyncMessage("ซิงค์ข้อมูลลง Atlas แล้ว")
    } catch {
      setSyncMessage("เชื่อมต่อ sync route ไม่สำเร็จ")
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    loadSyncStatus().catch(() => {
      setSyncMessage("โหลดสถานะ sync ไม่สำเร็จ")
    })
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Configure AI models and prediction settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Premier League Atlas Sync
          </CardTitle>
          <CardDescription>
            แยก fixtures แบบคงที่กับ snapshot แบบ dynamic แล้วบันทึกลง MongoDB Atlas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[220px_1fr_auto_auto] md:items-end">
            <div className="space-y-2">
              <Label>Sync Mode</Label>
              <Select value={syncMode} onValueChange={(value: "fixtures" | "snapshot" | "all") => setSyncMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Fixtures + Snapshot</SelectItem>
                  <SelectItem value="fixtures">Fixtures Only</SelectItem>
                  <SelectItem value="snapshot">Snapshot Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm text-muted-foreground">
              `fixtures` จะดึงตารางแข่งจาก service ฟุตบอลของระบบมาเก็บใน Atlas
              <br />
              `snapshot` จะให้ Gemini/IntelSphere สรุปข้อมูลสด เช่น ตารางคะแนนและสถิติมาเก็บใน Atlas
            </div>
            <Button variant="outline" onClick={() => void loadSyncStatus()} disabled={isSyncing}>
              <RefreshCw className="mr-2 h-4 w-4" />
              โหลดสถานะ
            </Button>
            <Button onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              ซิงค์ข้อมูล
            </Button>
          </div>

          {syncMessage ? <div className="text-sm text-muted-foreground">{syncMessage}</div> : null}

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Fixtures In Atlas</div>
              <div className="mt-2 text-2xl font-semibold">{syncStatus?.fixtureCount ?? 0}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Snapshot Status</div>
              <div className="mt-2 text-sm font-semibold">{syncStatus?.latestSnapshot?.status || "not synced"}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Search Verified</div>
              <div className="mt-2 text-sm font-semibold">
                {typeof syncStatus?.latestSnapshot?.searchVerified === "boolean"
                  ? String(syncStatus.latestSnapshot.searchVerified)
                  : "unknown"}
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Last Sync</div>
              <div className="mt-2 text-sm font-semibold">
                {syncStatus?.latestSnapshot?.syncedAt
                  ? new Date(syncStatus.latestSnapshot.syncedAt).toLocaleString("th-TH")
                  : "-"}
              </div>
            </div>
          </div>

          {syncStatus?.latestSnapshot?.summary ? (
            <div className="rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
              <div className="mb-2 font-medium text-foreground">Latest Summary</div>
              {syncStatus.latestSnapshot.summary}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Model Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Model Selection
            </CardTitle>
            <CardDescription>
              Choose the AI model for match predictions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        <Badge variant={model.status === "active" ? "default" : "secondary"}>
                          {model.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fallback Model</Label>
              <Select defaultValue="claude-3-opus">
                <SelectTrigger>
                  <SelectValue placeholder="Select fallback" />
                </SelectTrigger>
                <SelectContent>
                  {models.filter((m) => m.id !== selectedModel).map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Available Models</h4>
              <div className="space-y-2">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {model.status === "active" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{model.name}</p>
                        <p className="text-xs text-muted-foreground">{model.provider}</p>
                      </div>
                    </div>
                    <Badge variant={model.status === "active" ? "default" : "outline"}>
                      {model.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Model Parameters
            </CardTitle>
            <CardDescription>
              Fine-tune model behavior and output
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Temperature</Label>
                  <span className="text-sm text-muted-foreground">{temperature[0]}</span>
                </div>
                <Slider
                  value={temperature}
                  onValueChange={setTemperature}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Higher values make output more random, lower values more focused
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Max Tokens</Label>
                  <span className="text-sm text-muted-foreground">{maxTokens[0]}</span>
                </div>
                <Slider
                  value={maxTokens}
                  onValueChange={setMaxTokens}
                  min={256}
                  max={4096}
                  step={256}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum length of the generated response
                </p>
              </div>

              <div className="space-y-2">
                <Label>Top P (Nucleus Sampling)</Label>
                <Input type="number" defaultValue="0.9" step="0.1" min="0" max="1" />
              </div>

              <div className="space-y-2">
                <Label>Frequency Penalty</Label>
                <Input type="number" defaultValue="0" step="0.1" min="-2" max="2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prediction Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Prediction Settings
            </CardTitle>
            <CardDescription>
              Configure automatic predictions and scheduling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Predict Matches</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically generate predictions for upcoming matches
                </p>
              </div>
              <Switch checked={autoPredict} onCheckedChange={setAutoPredict} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Pre-Match Analysis</Label>
                <p className="text-xs text-muted-foreground">
                  Generate detailed analysis 24 hours before kickoff
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Live Updates</Label>
                <p className="text-xs text-muted-foreground">
                  Update predictions during live matches
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label>Prediction Confidence Threshold</Label>
              <Select defaultValue="70">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50% - Show all predictions</SelectItem>
                  <SelectItem value="60">60% - Moderate confidence</SelectItem>
                  <SelectItem value="70">70% - High confidence only</SelectItem>
                  <SelectItem value="80">80% - Very high confidence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prediction Lookahead (days)</Label>
              <Input type="number" defaultValue="7" min="1" max="30" />
            </div>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Sources
            </CardTitle>
            <CardDescription>
              Configure data inputs for predictions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Historical Match Data</Label>
                <p className="text-xs text-muted-foreground">Last 5 seasons</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Player Statistics</Label>
                <p className="text-xs text-muted-foreground">Current season stats</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Head-to-Head Records</Label>
                <p className="text-xs text-muted-foreground">Last 10 meetings</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Form Analysis</Label>
                <p className="text-xs text-muted-foreground">Last 5 matches</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Injury Reports</Label>
                <p className="text-xs text-muted-foreground">Real-time updates</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weather Conditions</Label>
                <p className="text-xs text-muted-foreground">Match day forecast</p>
              </div>
              <Switch />
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full bg-transparent">
                <Play className="h-4 w-4 mr-2" />
                Test Prediction Pipeline
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Manage API keys for external AI services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>OpenAI API Key</Label>
              <Input type="password" placeholder="sk-..." defaultValue="sk-*********************" />
            </div>
            <div className="space-y-2">
              <Label>Anthropic API Key</Label>
              <Input type="password" placeholder="sk-ant-..." defaultValue="sk-ant-***************" />
            </div>
            <div className="space-y-2">
              <Label>Sports Data API Key</Label>
              <Input type="password" placeholder="Your API key" defaultValue="*********************" />
            </div>
            <div className="space-y-2">
              <Label>Weather API Key</Label>
              <Input type="password" placeholder="Your API key" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
