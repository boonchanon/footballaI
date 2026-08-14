"use client"

import { useEffect, useMemo, useState } from "react"

import {
  deleteRawArchiveFile,
  exportFixturePredictions,
  fetchAdminAiSummary,
  predictMatchPair,
  rebuildFromRawArchive,
  uploadLatestSeasonFile,
  type AdminAiStatusSummary,
  type DeleteRawFileResult,
  type ExportPipelineResult,
  type MatchPredictionResult,
  type UploadPipelineResult,
} from "./admin-ai-client"
import {
  AdminAiHero,
  ArchiveSummarySection,
  createActionState,
  FixtureExportSection,
  HistoricalUpdateSection,
  KnownFilesSection,
  MatchPredictionSection,
  ModelEvaluationSection,
  type ActionState,
  type RemoteState,
} from "./admin-ai-sections"

const TEAM_ALIAS_MAP: Record<string, string> = {
  "man utd": "Manchester United",
  "man city": "Manchester City",
  spurs: "Tottenham Hotspur",
  "nott'm forest": "Nottingham Forest",
  brighton: "Brighton",
  newcastle: "Newcastle United",
  leeds: "Leeds United",
  ipswich: "Ipswich Town",
  hull: "Hull City",
  coventry: "Coventry City",
  bournemouth: "AFC Bournemouth",
}

function isCsvFile(file: File | null) {
  if (!file) return false
  return file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv"
}

function areCsvFiles(files: File[]) {
  return files.length > 0 && files.every((file) => isCsvFile(file))
}

function isSeasonFormat(value: string) {
  return /^\d{4}-\d{4}$/.test(value.trim())
}

function normalizeLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function buildCanonicalTeamMap(teamOptions: string[]) {
  const entries = teamOptions.map((team) => [normalizeLookupKey(team), team] as const)
  return new Map<string, string>(entries)
}

function normalizeTeamName(teamName: string, canonicalTeamMap: Map<string, string>) {
  const normalizedKey = normalizeLookupKey(teamName)
  const aliasResolved = TEAM_ALIAS_MAP[normalizedKey] ?? teamName.trim()
  const canonical = canonicalTeamMap.get(normalizeLookupKey(aliasResolved))
  return canonical ?? aliasResolved
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      const nextChar = line[index + 1]
      if (inQuotes && nextChar === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      values.push(current)
      current = ""
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

function serializeCsvValue(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

type FixtureHeaderValidation = {
  valid: boolean
  error?: string
}

type FixtureNormalizationResult = {
  file: File
  replacements: number
}

async function validateFixtureCsvFile(file: File): Promise<FixtureHeaderValidation> {
  const rawText = await file.text()
  const firstLine = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstLine) {
    return {
      valid: false,
      error: "ไฟล์ fixture ว่างเปล่าหรือไม่มี header",
    }
  }

  const normalizedHeaders = parseCsvLine(firstLine)
    .map((value) => value.trim().replace(/^"|"$/g, "").toLowerCase())

  const hasDate = normalizedHeaders.includes("fixture_date") || normalizedHeaders.includes("date")
  const hasHomeTeam =
    normalizedHeaders.includes("home_team") ||
    normalizedHeaders.includes("hometeam") ||
    normalizedHeaders.includes("home team")
  const hasAwayTeam =
    normalizedHeaders.includes("away_team") ||
    normalizedHeaders.includes("awayteam") ||
    normalizedHeaders.includes("away team")

  if (hasDate && hasHomeTeam && hasAwayTeam) {
    return { valid: true }
  }

  const missing: string[] = []
  if (!hasDate) missing.push("fixture_date หรือ date")
  if (!hasHomeTeam) missing.push("home_team หรือ HomeTeam หรือ Home Team")
  if (!hasAwayTeam) missing.push("away_team หรือ AwayTeam หรือ Away Team")

  return {
    valid: false,
    error: `ไฟล์ fixture ไม่ถูกต้อง: ไม่พบคอลัมน์ ${missing.join(", ")}`,
  }
}

async function normalizeFixtureCsvTeams(file: File, canonicalTeamMap: Map<string, string>): Promise<FixtureNormalizationResult> {
  const rawText = await file.text()
  const lines = rawText.split(/\r?\n/)
  const headerIndex = lines.findIndex((line) => line.trim())

  if (headerIndex === -1) {
    return { file, replacements: 0 }
  }

  const headerValues = parseCsvLine(lines[headerIndex]).map((value) => value.trim().replace(/^"|"$/g, ""))
  const normalizedHeaders = headerValues.map((value) => value.toLowerCase())
  const homeIndex = normalizedHeaders.findIndex(
    (value) => value === "home_team" || value === "hometeam" || value === "home team",
  )
  const awayIndex = normalizedHeaders.findIndex(
    (value) => value === "away_team" || value === "awayteam" || value === "away team",
  )

  if (homeIndex === -1 || awayIndex === -1) {
    return { file, replacements: 0 }
  }

  let replacements = 0
  const nextLines = [...lines]

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim()) continue

    const values = parseCsvLine(line)
    if (values.length <= Math.max(homeIndex, awayIndex)) continue

    const currentHome = values[homeIndex].trim()
    const currentAway = values[awayIndex].trim()
    const normalizedHome = normalizeTeamName(currentHome, canonicalTeamMap)
    const normalizedAway = normalizeTeamName(currentAway, canonicalTeamMap)

    if (normalizedHome !== currentHome) {
      values[homeIndex] = normalizedHome
      replacements += 1
    }

    if (normalizedAway !== currentAway) {
      values[awayIndex] = normalizedAway
      replacements += 1
    }

    nextLines[index] = values.map(serializeCsvValue).join(",")
  }

  if (!replacements) {
    return { file, replacements: 0 }
  }

  const normalizedContent = nextLines.join("\n")
  const normalizedFile = new File([normalizedContent], file.name, {
    type: file.type || "text/csv",
    lastModified: file.lastModified,
  })

  return {
    file: normalizedFile,
    replacements,
  }
}

export default function AdminAiPage() {
  const [summaryState, setSummaryState] = useState<RemoteState<AdminAiStatusSummary>>({
    loading: true,
    error: "",
    data: null,
  })
  const [latestFiles, setLatestFiles] = useState<File[]>([])
  const [latestFileInputKey, setLatestFileInputKey] = useState(0)
  const [fixtureFile, setFixtureFile] = useState<File | null>(null)
  const [fixtureFileInputKey, setFixtureFileInputKey] = useState(0)
  const [targetSeason, setTargetSeason] = useState("2026-2027")
  const [homeTeam, setHomeTeam] = useState("")
  const [awayTeam, setAwayTeam] = useState("")
  const [uploadState, setUploadState] = useState<ActionState<UploadPipelineResult>>(createActionState())
  const [rebuildState, setRebuildState] = useState<ActionState<UploadPipelineResult>>(createActionState())
  const [exportState, setExportState] = useState<ActionState<ExportPipelineResult>>(createActionState())
  const [predictState, setPredictState] = useState<ActionState<MatchPredictionResult>>(createActionState())
  const [deleteState, setDeleteState] = useState<ActionState<{ filename: string }>>(createActionState())

  const canonicalTeamMap = useMemo(() => buildCanonicalTeamMap(summaryState.data?.teams || []), [summaryState.data?.teams])

  const loadSummary = async () => {
    setSummaryState((prev) => ({ ...prev, loading: true, error: "" }))
    try {
      const data = await fetchAdminAiSummary()
      setSummaryState({ loading: false, error: "", data })
      return true
    } catch (error) {
      setSummaryState({
        loading: false,
        error: error instanceof Error ? error.message : "โหลดสถานะระบบ AI ไม่สำเร็จ",
        data: null,
      })
      return false
    }
  }

  useEffect(() => {
    void loadSummary()
  }, [])

  const topModel = useMemo(() => {
    return summaryState.data?.models.find((item) => item.isBest) || summaryState.data?.models[0] || null
  }, [summaryState.data])

  const handleLatestFileChange = (files: File[]) => {
    setLatestFiles(files)
    setUploadState(createActionState())
  }

  const handleFixtureFileChange = (file: File | null) => {
    setFixtureFile(file)
    setExportState(createActionState())
  }

  const handleLatestUpload = async () => {
    if (!latestFiles.length) {
      setUploadState({
        ...createActionState(),
        error: "กรุณาเลือกไฟล์ฤดูกาลล่าสุดก่อนอัปโหลด",
      })
      return
    }

    if (!areCsvFiles(latestFiles)) {
      setUploadState({
        ...createActionState(),
        error: "รองรับเฉพาะไฟล์ CSV สำหรับการอัปเดตข้อมูลย้อนหลัง",
      })
      return
    }

    setUploadState({ ...createActionState(), loading: true })
    try {
      const data = await uploadLatestSeasonFile(latestFiles)
      const refreshed = await loadSummary()

      setUploadState({
        loading: false,
        error: "",
        success: refreshed
          ? `อัปเดตข้อมูลย้อนหลังสำเร็จ ${data.processedFiles || latestFiles.length} ไฟล์`
          : `อัปเดตข้อมูลย้อนหลังสำเร็จ ${data.processedFiles || latestFiles.length} ไฟล์ แต่รีเฟรชสถานะล่าสุดไม่สำเร็จ`,
        data,
      })

    } catch (error) {
      setUploadState({
        loading: false,
        error: error instanceof Error ? error.message : "อัปโหลดไฟล์และอัปเดตข้อมูลไม่สำเร็จ",
        success: "",
        data: null,
      })
    }
  }

  const handleRebuild = async () => {
    setRebuildState({ ...createActionState(), loading: true })
    try {
      const data = await rebuildFromRawArchive()
      await loadSummary()
      setRebuildState({
        loading: false,
        error: "",
        success: "สร้างข้อมูลใหม่จากไฟล์ดิบทั้งหมดสำเร็จ",
        data,
      })
    } catch (error) {
      setRebuildState({
        loading: false,
        error: error instanceof Error ? error.message : "สร้างข้อมูลใหม่จากไฟล์ดิบทั้งหมดไม่สำเร็จ",
        success: "",
        data: null,
      })
    }
  }

  const handleDeleteFile = async (filename: string) => {
    setDeleteState({
      loading: true,
      error: "",
      success: "",
      data: { filename },
    })

    try {
      const result: DeleteRawFileResult = await deleteRawArchiveFile(filename)
      const refreshed = await loadSummary()
      setDeleteState({
        loading: false,
        error: "",
        success: refreshed
          ? `ลบไฟล์ ${result.filename} ออกจากคลังข้อมูลสำเร็จ`
          : `ลบไฟล์ ${result.filename} สำเร็จ แต่รีเฟรชสถานะล่าสุดไม่สำเร็จ`,
        data: { filename: result.filename },
      })
    } catch (error) {
      setDeleteState({
        loading: false,
        error: error instanceof Error ? error.message : "ลบไฟล์ไม่สำเร็จ",
        success: "",
        data: null,
      })
    }
  }

  const handleFixtureExport = async () => {
    if (!fixtureFile) {
      setExportState({
        ...createActionState(),
        error: "กรุณาเลือกไฟล์ fixture CSV ก่อนประมวลผล",
      })
      return
    }

    if (!targetSeason.trim()) {
      setExportState({
        ...createActionState(),
        error: "กรุณากรอกฤดูกาลเป้าหมาย",
      })
      return
    }

    if (!isSeasonFormat(targetSeason)) {
      setExportState({
        ...createActionState(),
        error: "กรุณากรอกฤดูกาลในรูปแบบ YYYY-YYYY เช่น 2026-2027",
      })
      return
    }

    if (!isCsvFile(fixtureFile)) {
      setExportState({
        ...createActionState(),
        error: "รองรับเฉพาะไฟล์ fixture แบบ CSV",
      })
      return
    }

    const fixtureValidation = await validateFixtureCsvFile(fixtureFile)
    if (!fixtureValidation.valid) {
      setExportState({
        ...createActionState(),
        error: fixtureValidation.error || "ไฟล์ fixture ไม่ถูกต้อง",
      })
      return
    }

    setExportState({ ...createActionState(), loading: true })
    try {
      const normalizedFixture = await normalizeFixtureCsvTeams(fixtureFile, canonicalTeamMap)
      const data = await exportFixturePredictions(normalizedFixture.file, targetSeason.trim())
      const refreshed = await loadSummary()

      setExportState({
        loading: false,
        error: "",
        success:
          normalizedFixture.replacements > 0
            ? `สร้างไฟล์ทำนายสำเร็จ และ normalize ชื่อทีม ${normalizedFixture.replacements} รายการ`
            : refreshed
              ? "สร้างไฟล์ทำนายสำเร็จ ระบบกำลังดาวน์โหลด CSV"
              : "สร้างไฟล์ทำนายสำเร็จ แต่รีเฟรชสถานะล่าสุดไม่สำเร็จ",
        data,
      })

      const anchor = document.createElement("a")
      anchor.href = data.downloadUrl
      anchor.download = data.filename
      anchor.rel = "noopener"
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()

      setFixtureFile(null)
      setFixtureFileInputKey((prev) => prev + 1)
    } catch (error) {
      setExportState({
        loading: false,
        error: error instanceof Error ? error.message : "สร้างไฟล์ทำนายไม่สำเร็จ",
        success: "",
        data: null,
      })
    }
  }

  const handlePredictMatch = async () => {
    if (!homeTeam || !awayTeam) {
      setPredictState({
        ...createActionState(),
        error: "กรุณาเลือกทีมเหย้าและทีมเยือนให้ครบ",
      })
      return
    }

    const normalizedHomeTeam = normalizeTeamName(homeTeam, canonicalTeamMap)
    const normalizedAwayTeam = normalizeTeamName(awayTeam, canonicalTeamMap)

    if (normalizedHomeTeam === normalizedAwayTeam) {
      setPredictState({
        ...createActionState(),
        error: "ทีมเหย้าและทีมเยือนต้องไม่ซ้ำกัน",
      })
      return
    }

    setPredictState({ ...createActionState(), loading: true })
    try {
      const data = await predictMatchPair(normalizedHomeTeam, normalizedAwayTeam)
      setPredictState({
        loading: false,
        error: "",
        success:
          normalizedHomeTeam !== homeTeam || normalizedAwayTeam !== awayTeam
            ? `ทำนายผลการแข่งขันสำเร็จ โดย normalize ชื่อทีมเป็น ${normalizedHomeTeam} vs ${normalizedAwayTeam}`
            : "ทำนายผลการแข่งขันสำเร็จ",
        data,
      })
    } catch (error) {
      setPredictState({
        loading: false,
        error: error instanceof Error ? error.message : "ทำนายผลการแข่งขันไม่สำเร็จ",
        success: "",
        data: null,
      })
    }
  }

  return (
    <div className="space-y-6">
      <AdminAiHero
        summary={summaryState.data}
        topModel={topModel}
        loading={summaryState.loading}
        error={summaryState.error}
        onRefresh={() => void loadSummary()}
      />

      <div className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <HistoricalUpdateSection
          latestFileInputKey={latestFileInputKey}
          latestFileNames={latestFiles.map((file) => file.name)}
          uploadState={uploadState}
          rebuildState={rebuildState}
          canUpload={latestFiles.length > 0 && !uploadState.loading && !rebuildState.loading}
          onLatestFileChange={handleLatestFileChange}
          onUpload={() => void handleLatestUpload()}
          onRebuild={() => void handleRebuild()}
        />
        <FixtureExportSection
          fixtureFileInputKey={fixtureFileInputKey}
          targetSeason={targetSeason}
          fixtureFileName={fixtureFile?.name || ""}
          exportState={exportState}
          canExport={Boolean(fixtureFile) && targetSeason.trim().length > 0 && !exportState.loading}
          onTargetSeasonChange={setTargetSeason}
          onFixtureFileChange={handleFixtureFileChange}
          onExport={() => void handleFixtureExport()}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ArchiveSummarySection loading={summaryState.loading} summary={summaryState.data} />
        <ModelEvaluationSection loading={summaryState.loading} models={summaryState.data?.models || []} />
      </div>

      <KnownFilesSection
        loading={summaryState.loading}
        files={summaryState.data?.files || []}
        deleteState={deleteState}
        onDeleteFile={(filename) => void handleDeleteFile(filename)}
      />

      <MatchPredictionSection
        teamOptions={summaryState.data?.teams || []}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        predictState={predictState}
        onHomeTeamChange={setHomeTeam}
        onAwayTeamChange={setAwayTeam}
        onPredict={() => void handlePredictMatch()}
      />
    </div>
  )
}
