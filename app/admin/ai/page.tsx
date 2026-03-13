"use client"

import { useState } from "react"
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
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

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

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 1500))
    setIsSaving(false)
  }

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
