"use client"

import {
  Activity,
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import type {
  AdminAiStatusSummary,
  ExportPipelineResult,
  MatchPredictionResult,
  UploadPipelineResult,
} from "./admin-ai-client"

export type RemoteState<T> = {
  loading: boolean
  error: string
  data: T | null
}

export type ActionState<T> = {
  loading: boolean
  error: string
  success: string
  data: T | null
}

export function createActionState<T>(): ActionState<T> {
  return {
    loading: false,
    error: "",
    success: "",
    data: null,
  }
}

export function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-"
  return new Intl.NumberFormat("th-TH").format(value)
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-"
  return `${value.toFixed(1)}%`
}

export function formatMetric(value: number | null | undefined, digits = 3) {
  if (value == null || Number.isNaN(value)) return "-"
  return value.toFixed(digits)
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-[18px] border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export function StateMessage({
  type,
  message,
}: {
  type: "error" | "success" | "info" | "loading"
  message: string
}) {
  if (!message) return null

  const tone =
    type === "error"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : type === "success"
        ? "border-primary/30 bg-primary/10 text-primary"
        : type === "loading"
          ? "border-primary/20 bg-primary/5 text-foreground"
          : "border-border bg-muted text-muted-foreground"

  const Icon = type === "error" ? AlertCircle : type === "success" ? CheckCircle2 : type === "loading" ? Loader2 : Activity

  return (
    <div className={`flex items-start gap-3 rounded-[14px] border px-4 py-3 text-sm ${tone}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${type === "loading" ? "animate-spin" : ""}`} />
      <span>{message}</span>
    </div>
  )
}

export function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-[18px] border border-dashed border-border bg-card/70 p-6 text-center">
      <div>
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function AdminAiHero({
  summary,
  topModel,
  loading,
  error,
  onRefresh,
}: {
  summary: AdminAiStatusSummary | null
  topModel: AdminAiStatusSummary["models"][number] | null
  loading: boolean
  error: string
  onRefresh: () => void
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-border bg-[radial-gradient(circle_at_top_left,rgba(184,255,0,0.12),transparent_28%),linear-gradient(180deg,var(--color-card),var(--color-card))] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.10)] sm:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="h-4 w-4" />
            ศูนย์ควบคุม AI
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-5xl">ระบบวิเคราะห์ฟุตบอลด้วย AI</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            อัปโหลดไฟล์ฤดูกาลล่าสุดเพื่ออัปเดตโมเดล อัปโหลด fixture เพื่อสร้างไฟล์ CSV ผลทำนาย
            และติดตามสถานะคลังข้อมูล ผลประเมินโมเดล และการทำนายรายคู่จากหน้าเดียว
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[460px]">
          <StatTile
            label="จำนวนทีมที่โหลดแล้ว"
            value={formatNumber(summary?.teamsLoaded)}
            hint={summary?.healthLabel || "ตรวจจาก /health และ /pipeline/status"}
            icon={Database}
          />
          <StatTile
            label="โมเดลที่แม่นยำที่สุด"
            value={summary?.bestModelLabel || "-"}
            hint={topModel?.accuracy != null ? `Accuracy ${formatPercent(topModel.accuracy)}` : "ยังไม่มีผลประเมิน"}
            icon={Sparkles}
          />
          <StatTile
            label="ฤดูกาลล่าสุดในระบบ"
            value={summary?.latestSeason || "-"}
            hint="อ้างอิงจากคลังข้อมูลล่าสุด"
            icon={BarChart3}
          />
          <StatTile
            label="ไฟล์ผลทำนายล่าสุด"
            value={summary?.latestPredictionFile || "-"}
            hint="อัปเดตหลัง export fixture"
            icon={FileSpreadsheet}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onRefresh} disabled={loading} className="rounded-[14px]">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          รีเฟรชสถานะระบบ
        </Button>
        <Badge variant="outline" className="rounded-full border-border px-4 py-2 text-sm">
          แหล่งข้อมูลหลัก: `data/raw`
        </Badge>
      </div>

      <div className="mt-4">
        <StateMessage type="error" message={error} />
      </div>
    </section>
  )
}

export function HistoricalUpdateSection({
  latestFileInputKey,
  latestFileNames,
  uploadState,
  rebuildState,
  canUpload,
  onLatestFileChange,
  onUpload,
  onRebuild,
}: {
  latestFileInputKey: number
  latestFileNames: string[]
  uploadState: ActionState<UploadPipelineResult>
  rebuildState: ActionState<UploadPipelineResult>
  canUpload: boolean
  onLatestFileChange: (files: File[]) => void
  onUpload: () => void
  onRebuild: () => void
}) {
  const summary = uploadState.data || rebuildState.data
  const selectedFilePreview = latestFileNames.slice(0, 3).join(", ")
  const hasMoreSelectedFiles = latestFileNames.length > 3

  return (
    <Card className="rounded-[22px] border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Upload className="h-5 w-5 text-primary" />
          อัปเดตข้อมูลย้อนหลัง
        </CardTitle>
        <CardDescription>
          อัปโหลดไฟล์ลีกล่าสุดเพื่ออัปเดตโมเดล หรือสั่งสร้างข้อมูลใหม่จากไฟล์ดิบทั้งหมดในคลัง
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="latest-season-file">ไฟล์ฤดูกาลล่าสุด (เช่น E0 CSV)</Label>
          <Input
            key={latestFileInputKey}
            id="latest-season-file"
            type="file"
            multiple
            accept=".csv,text/csv"
            onChange={(event) => onLatestFileChange(Array.from(event.target.files || []))}
          />
          <p className="text-xs text-muted-foreground">
            รองรับกรณีไฟล์ซ้ำ ระบบจะใช้ข้อมูลเดิมประมวลผลต่อ
            {latestFileNames.length
              ? ` | เลือกแล้ว ${latestFileNames.length} ไฟล์${selectedFilePreview ? `: ${selectedFilePreview}` : ""}${hasMoreSelectedFiles ? " ..." : ""}`
              : ""}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onUpload} disabled={!canUpload} className="rounded-[14px]">
            {uploadState.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            อัปโหลดและอัปเดต
          </Button>
          <Button
            variant="outline"
            onClick={onRebuild}
            disabled={uploadState.loading || rebuildState.loading}
            className="rounded-[14px] bg-transparent"
          >
            {rebuildState.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            สร้างใหม่จากไฟล์ดิบทั้งหมด
          </Button>
        </div>

        <StateMessage type="error" message={uploadState.error || rebuildState.error} />
        <StateMessage type="success" message={uploadState.success || rebuildState.success} />
        <StateMessage
          type="loading"
          message={
            uploadState.loading
              ? "กำลังอัปโหลดไฟล์และอัปเดตข้อมูลย้อนหลัง โปรดรอสักครู่"
              : rebuildState.loading
                ? "กำลังสร้างข้อมูลใหม่จากไฟล์ดิบทั้งหมด โปรดรอสักครู่"
                : ""
          }
        />
        <StateMessage type="info" message={uploadState.data?.duplicateNotice || ""} />

        {summary ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "จำนวนไฟล์ที่ประมวลผล", value: formatNumber(summary.processedFiles) },
              { label: "แมตช์ที่เพิ่มเข้าใหม่", value: formatNumber(summary.matchesAdded) },
              { label: "รายการซ้ำที่ลบออก", value: formatNumber(summary.duplicatesRemoved) },
              { label: "ฤดูกาลล่าสุดในระบบ", value: summary.latestSeason || "-" },
              { label: "จำนวนแถวของฟีเจอร์", value: formatNumber(summary.featureRows) },
            ].map((item) => (
              <div key={item.label} className="rounded-[16px] border border-border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-xl font-bold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {uploadState.data?.uploadedFiles?.length ? (
          <div className="rounded-[16px] border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">ไฟล์ที่บันทึกเข้าคลังล่าสุด:</span>{" "}
            {uploadState.data.uploadedFiles.slice(0, 5).join(", ")}
            {uploadState.data.uploadedFiles.length > 5 ? ` และอีก ${uploadState.data.uploadedFiles.length - 5} ไฟล์` : ""}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function FixtureExportSection({
  fixtureFileInputKey,
  targetSeason,
  fixtureFileName,
  exportState,
  canExport,
  onTargetSeasonChange,
  onFixtureFileChange,
  onExport,
}: {
  fixtureFileInputKey: number
  targetSeason: string
  fixtureFileName: string
  exportState: ActionState<ExportPipelineResult>
  canExport: boolean
  onTargetSeasonChange: (value: string) => void
  onFixtureFileChange: (file: File | null) => void
  onExport: () => void
}) {
  return (
    <Card className="rounded-[22px] border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Download className="h-5 w-5 text-primary" />
          สร้างไฟล์ทำนายจาก fixture
        </CardTitle>
        <CardDescription>
          กรอกฤดูกาลเป้าหมายและอัปโหลด fixture CSV เพื่อสร้างไฟล์ผลทำนายพร้อมดาวน์โหลดทันที
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="target-season">ฤดูกาลเป้าหมาย</Label>
            <Input
              id="target-season"
              value={targetSeason}
              onChange={(event) => onTargetSeasonChange(event.target.value)}
              placeholder="เช่น 2026-2027"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fixture-file">ไฟล์ fixture CSV</Label>
            <Input
              key={fixtureFileInputKey}
              id="fixture-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => onFixtureFileChange(event.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              {fixtureFileName ? `ไฟล์ที่เลือก: ${fixtureFileName}` : "เมื่อสำเร็จ ระบบจะดาวน์โหลด CSV ให้อัตโนมัติ"}
            </p>
          </div>
        </div>

        <Button onClick={onExport} disabled={!canExport} className="rounded-[14px]">
          {exportState.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          ประมวลผลและดาวน์โหลด CSV
        </Button>

        <StateMessage type="error" message={exportState.error} />
        <StateMessage type="success" message={exportState.success} />
        <StateMessage
          type="loading"
          message={exportState.loading ? "กำลังประมวลผล fixture และสร้างไฟล์ CSV ผลทำนาย" : ""}
        />

        {exportState.data ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[16px] border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">ฤดูกาล</p>
              <p className="mt-2 text-base font-bold text-foreground">{exportState.data.season}</p>
            </div>
            <div className="rounded-[16px] border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">ชื่อไฟล์ที่สร้าง</p>
              <p className="mt-2 text-base font-bold text-foreground">{exportState.data.filename}</p>
            </div>
            <div className="rounded-[16px] border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">ตำแหน่งไฟล์</p>
              <p className="mt-2 break-all text-sm text-foreground">{exportState.data.filePath}</p>
            </div>
            <div className="rounded-[16px] border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">จำนวนคู่ที่ทำนาย</p>
              <p className="mt-2 text-base font-bold text-foreground">{formatNumber(exportState.data.predictionCount)}</p>
            </div>
            <div className="rounded-[16px] border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">ช่วงวันที่ในไฟล์</p>
              <p className="mt-2 text-base font-bold text-foreground">{exportState.data.dateRange}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function ArchiveSummarySection({
  loading,
  summary,
}: {
  loading: boolean
  summary: AdminAiStatusSummary | null
}) {
  return (
    <Card className="rounded-[22px] border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Database className="h-5 w-5 text-primary" />
          สรุปคลังข้อมูล
        </CardTitle>
        <CardDescription>ตรวจจำนวนไฟล์ดิบ จำนวนแมตช์ทั้งหมด จำนวนฤดูกาล และฤดูกาลล่าสุดในระบบ</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !summary ? (
          <LoadingPanel label="กำลังโหลดสรุปคลังข้อมูล" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[16px] border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">จำนวนไฟล์ดิบที่ระบบรู้จัก</p>
              <p className="mt-2 text-2xl font-black text-foreground">{formatNumber(summary?.rawFileCount)}</p>
            </div>
            <div className="rounded-[16px] border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">จำนวนแมตช์ทั้งหมด</p>
              <p className="mt-2 text-2xl font-black text-foreground">{formatNumber(summary?.totalMatches)}</p>
            </div>
            <div className="rounded-[16px] border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">จำนวนฤดูกาลที่มี</p>
              <p className="mt-2 text-2xl font-black text-foreground">{formatNumber(summary?.seasonCount)}</p>
            </div>
            <div className="rounded-[16px] border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">ฤดูกาลล่าสุด</p>
              <p className="mt-2 text-2xl font-black text-foreground">{summary?.latestSeason || "-"}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ModelEvaluationSection({
  loading,
  models,
}: {
  loading: boolean
  models: AdminAiStatusSummary["models"]
}) {
  return (
    <Card className="rounded-[22px] border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Target className="h-5 w-5 text-primary" />
          ผลประเมินโมเดล
        </CardTitle>
        <CardDescription>เปรียบเทียบ accuracy, f1 macro, log loss และ brier score เพื่อดูว่าโมเดลไหนเหมาะที่สุด</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !models.length ? (
          <LoadingPanel label="กำลังโหลดผลประเมินโมเดล" />
        ) : models.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {models.map((model) => (
              <div
                key={model.key}
                className={`rounded-[18px] border p-4 shadow-sm ${
                  model.isBest ? "border-primary/40 bg-primary/10" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-foreground">{model.label}</p>
                    <p className="text-sm text-muted-foreground">ประเมินจากชุดข้อมูลล่าสุด</p>
                  </div>
                  {model.isBest ? <Badge className="bg-primary text-primary-foreground hover:bg-primary">ดีที่สุด</Badge> : null}
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-semibold text-foreground">{formatPercent(model.accuracy)}</span>
                    </div>
                    <Progress value={model.accuracy ?? 0} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-[14px] border border-border bg-background/80 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">F1 Macro</p>
                      <p className="mt-2 font-bold text-foreground">{formatMetric(model.f1Macro)}</p>
                    </div>
                    <div className="rounded-[14px] border border-border bg-background/80 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Log Loss</p>
                      <p className="mt-2 font-bold text-foreground">{formatMetric(model.logLoss)}</p>
                    </div>
                    <div className="rounded-[14px] border border-border bg-background/80 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Brier</p>
                      <p className="mt-2 font-bold text-foreground">{formatMetric(model.brierScore)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
            ยังไม่มีผลประเมินโมเดลจาก API
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function KnownFilesSection({
  loading,
  files,
  deleteState,
  onDeleteFile,
}: {
  loading: boolean
  files: AdminAiStatusSummary["files"]
  deleteState: ActionState<{ filename: string }>
  onDeleteFile: (filename: string) => void
}) {
  return (
    <Card className="rounded-[22px] border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          ไฟล์และฤดูกาลที่ระบบรู้จัก
        </CardTitle>
        <CardDescription>แสดงชื่อไฟล์ ฤดูกาล และจำนวนแมตช์ เพื่อใช้ตรวจสอบคลังข้อมูลย้อนหลังอย่างรวดเร็ว</CardDescription>
      </CardHeader>
      <CardContent>
        <StateMessage type="error" message={deleteState.error} />
        <StateMessage type="success" message={deleteState.success} />
        <StateMessage type="loading" message={deleteState.loading ? "กำลังลบไฟล์ออกจากคลังข้อมูล" : ""} />

        {loading && !files.length ? (
          <LoadingPanel label="กำลังโหลดรายการไฟล์และฤดูกาล" />
        ) : files.length ? (
          <div className="overflow-hidden rounded-[18px] border border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[260px]">ชื่อไฟล์</TableHead>
                    <TableHead>ฤดูกาล</TableHead>
                    <TableHead className="text-right">จำนวนแมตช์</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={`${file.filename}-${file.season}`}>
                      <TableCell className="font-medium text-foreground">{file.filename}</TableCell>
                      <TableCell>{file.season}</TableCell>
                      <TableCell className="text-right">{formatNumber(file.matches)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-[12px] bg-transparent"
                          disabled={deleteState.loading}
                          onClick={() => onDeleteFile(file.filename)}
                        >
                          {deleteState.loading && deleteState.data?.filename === file.filename ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          ลบไฟล์
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
            ยังไม่พบรายการไฟล์หรือฤดูกาลจาก API
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function MatchPredictionSection({
  teamOptions,
  homeTeam,
  awayTeam,
  predictState,
  onHomeTeamChange,
  onAwayTeamChange,
  onPredict,
}: {
  teamOptions: string[]
  homeTeam: string
  awayTeam: string
  predictState: ActionState<MatchPredictionResult>
  onHomeTeamChange: (value: string) => void
  onAwayTeamChange: (value: string) => void
  onPredict: () => void
}) {
  return (
    <Card className="rounded-[22px] border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Brain className="h-5 w-5 text-primary" />
          ทำนายผลการแข่งขัน
        </CardTitle>
        <CardDescription>เลือกทีมเหย้าและทีมเยือน แล้วดูโอกาสชนะ expected goals และสกอร์ที่มีแนวโน้มมากที่สุด</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label>ทีมเหย้า</Label>
            <Select value={homeTeam} onValueChange={onHomeTeamChange}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกทีมเหย้า" />
              </SelectTrigger>
              <SelectContent>
                {teamOptions.map((team) => (
                  <SelectItem key={`home-${team}`} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>ทีมเยือน</Label>
            <Select value={awayTeam} onValueChange={onAwayTeamChange}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกทีมเยือน" />
              </SelectTrigger>
              <SelectContent>
                {teamOptions.map((team) => (
                  <SelectItem key={`away-${team}`} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={onPredict} disabled={predictState.loading} className="w-full rounded-[14px] lg:w-auto">
              {predictState.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
              ทำนายผล
            </Button>
          </div>
        </div>

        <StateMessage type="error" message={predictState.error} />
        <StateMessage type="success" message={predictState.success} />
        <StateMessage type="loading" message={predictState.loading ? "กำลังประมวลผลผลทำนายการแข่งขันคู่นี้" : ""} />

        {predictState.data ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[16px] border border-border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">โอกาสเหย้าชนะ</p>
                <p className="mt-2 text-2xl font-black text-foreground">{formatPercent(predictState.data.homeWin)}</p>
              </div>
              <div className="rounded-[16px] border border-border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">โอกาสเสมอ</p>
                <p className="mt-2 text-2xl font-black text-foreground">{formatPercent(predictState.data.draw)}</p>
              </div>
              <div className="rounded-[16px] border border-border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">โอกาสเยือนชนะ</p>
                <p className="mt-2 text-2xl font-black text-foreground">{formatPercent(predictState.data.awayWin)}</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-[18px] border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Expected Goals</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-[14px] border border-border bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">ทีมเหย้า</p>
                    <p className="mt-2 text-xl font-bold text-foreground">{formatMetric(predictState.data.expectedGoals.home, 2)}</p>
                  </div>
                  <div className="rounded-[14px] border border-border bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">ทีมเยือน</p>
                    <p className="mt-2 text-xl font-bold text-foreground">{formatMetric(predictState.data.expectedGoals.away, 2)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Top Scores</p>
                {predictState.data.topScores.length ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {predictState.data.topScores.map((item) => (
                      <div key={`${item.score}-${item.probability}`} className="rounded-[14px] border border-border bg-muted/40 p-3">
                        <p className="text-lg font-bold text-foreground">{item.score}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{formatPercent(item.probability)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-[14px] border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    API ยังไม่ได้ส่ง top scores กลับมา
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[18px] border border-border bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
              <span className="font-semibold text-foreground">สรุปผลทำนาย:</span> {predictState.data.summary}
            </div>
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
            เลือกทีมเหย้าและทีมเยือนเพื่อดูผลทำนายรายคู่
          </div>
        )}
      </CardContent>
    </Card>
  )
}
