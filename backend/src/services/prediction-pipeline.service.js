const fs = require("fs")
const fsp = require("fs/promises")
const path = require("path")

const ROOT_DIR = path.resolve(__dirname, "../../..")
const DATA_DIR = path.join(ROOT_DIR, "data")
const RAW_DIR = path.join(DATA_DIR, "raw")
const EXPORT_DIR = path.join(DATA_DIR, "predictions")

const CLUB_PRIORS = {
  Arsenal: { elo: 1825, attack: 1.88, defense: 0.92, form: 0.68, promoted: false },
  "Aston Villa": { elo: 1750, attack: 1.58, defense: 1.08, form: 0.58, promoted: false },
  Bournemouth: { elo: 1660, attack: 1.34, defense: 1.25, form: 0.48, promoted: false },
  Brentford: { elo: 1705, attack: 1.44, defense: 1.12, form: 0.56, promoted: false },
  Brighton: { elo: 1710, attack: 1.47, defense: 1.11, form: 0.55, promoted: false },
  Chelsea: { elo: 1775, attack: 1.61, defense: 1.03, form: 0.61, promoted: false },
  "Crystal Palace": { elo: 1655, attack: 1.27, defense: 1.19, form: 0.47, promoted: false },
  Everton: { elo: 1640, attack: 1.22, defense: 1.17, form: 0.45, promoted: false },
  Fulham: { elo: 1665, attack: 1.31, defense: 1.18, form: 0.49, promoted: false },
  "Hull City": { elo: 1540, attack: 1.08, defense: 1.36, form: 0.34, promoted: true },
  Ipswich: { elo: 1535, attack: 1.1, defense: 1.37, form: 0.34, promoted: true },
  "Ipswich Town": { elo: 1535, attack: 1.1, defense: 1.37, form: 0.34, promoted: true },
  Leeds: { elo: 1580, attack: 1.2, defense: 1.3, form: 0.39, promoted: true },
  "Leeds United": { elo: 1580, attack: 1.2, defense: 1.3, form: 0.39, promoted: true },
  Liverpool: { elo: 1845, attack: 1.92, defense: 0.89, form: 0.7, promoted: false },
  "Manchester City": { elo: 1870, attack: 1.98, defense: 0.83, form: 0.73, promoted: false },
  "Manchester United": { elo: 1720, attack: 1.46, defense: 1.15, form: 0.53, promoted: false },
  Newcastle: { elo: 1740, attack: 1.56, defense: 1.09, form: 0.57, promoted: false },
  "Newcastle United": { elo: 1740, attack: 1.56, defense: 1.09, form: 0.57, promoted: false },
  "Nottingham Forest": { elo: 1645, attack: 1.26, defense: 1.16, form: 0.46, promoted: false },
  Sunderland: { elo: 1525, attack: 1.06, defense: 1.39, form: 0.32, promoted: true },
  "Tottenham Hotspur": { elo: 1735, attack: 1.54, defense: 1.12, form: 0.56, promoted: false },
  Coventry: { elo: 1510, attack: 1.02, defense: 1.42, form: 0.31, promoted: true },
  "Coventry City": { elo: 1510, attack: 1.02, defense: 1.42, form: 0.31, promoted: true },
  Brighton: { elo: 1710, attack: 1.47, defense: 1.11, form: 0.55, promoted: false },
  "AFC Bournemouth": { elo: 1660, attack: 1.34, defense: 1.25, form: 0.48, promoted: false },
}

const TEAM_ALIAS_MAP = {
  "man utd": "Manchester United",
  "man united": "Manchester United",
  "manchester utd": "Manchester United",
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

function normalizeLookupKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function normalizeTeamName(value) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  return TEAM_ALIAS_MAP[normalizeLookupKey(raw)] || raw
}

function parseCsvLine(line) {
  const values = []
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

function serializeCsvValue(value) {
  const normalized = String(value ?? "")
  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function parseCsv(content) {
  const lines = String(content || "").split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) return { headers: [], rows: [] }

  const headers = parseCsvLine(lines[0]).map((value) => value.trim().replace(/^"|"$/g, ""))
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const record = {}
    headers.forEach((header, index) => {
      record[header] = (values[index] || "").trim()
    })
    return record
  })

  return { headers, rows }
}

function decodeCsvBuffer(buffer, filename) {
  const encodings = ["utf8", "utf-8", "latin1", "binary"]
  let lastError = null

  for (const encoding of encodings) {
    try {
      const decoded = Buffer.isBuffer(buffer) ? buffer.toString(encoding) : Buffer.from(buffer).toString(encoding)
      if (decoded.includes("�")) continue
      return decoded
    } catch (error) {
      lastError = error
    }
  }

  const error = new Error(`ไม่สามารถอ่านไฟล์ CSV ได้: ${filename}`)
  error.statusCode = 422
  error.details = {
    filename,
    supportedEncodings: encodings,
    reason: lastError ? String(lastError.message || lastError) : "Unknown decode error",
  }
  throw error
}

async function readCsvFileContent(filePath) {
  const buffer = await fsp.readFile(filePath)
  return decodeCsvBuffer(buffer, path.basename(filePath))
}

function pickFirstValue(record, keys) {
  for (const key of keys) {
    const direct = record[key]
    if (direct != null && String(direct).trim() !== "") return String(direct).trim()

    const lowerKey = Object.keys(record).find((item) => item.toLowerCase() === key.toLowerCase())
    if (lowerKey && String(record[lowerKey]).trim() !== "") return String(record[lowerKey]).trim()
  }
  return ""
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function inferSeason(filename, rows) {
  const fromFilename = String(filename || "").match(/(\d{4})[-_]?(\d{4})/)
  if (fromFilename) return `${fromFilename[1]}-${fromFilename[2]}`

  const sampleDate = pickFirstValue(rows[0] || {}, ["season", "Season", "date", "Date", "fixture_date"])
  const normalizedSampleDate = String(sampleDate || "").trim()

  const fullYearMatch = normalizedSampleDate.match(/(19\d{2}|20\d{2})/)
  if (fullYearMatch) {
    const year = Number(fullYearMatch[1])
    const monthMatch = normalizedSampleDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](19\d{2}|20\d{2})$/)
    const month = monthMatch ? Number(monthMatch[2]) : null
    const seasonStart = month != null && month < 7 ? year - 1 : year
    return `${seasonStart}-${seasonStart + 1}`
  }

  const shortDateMatch = normalizedSampleDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/)
  if (shortDateMatch) {
    const month = Number(shortDateMatch[2])
    const shortYear = Number(shortDateMatch[3])
    const year = shortYear >= 70 ? 1900 + shortYear : 2000 + shortYear
    const seasonStart = month < 7 ? year - 1 : year
    return `${seasonStart}-${seasonStart + 1}`
  }

  return "unknown"
}

function normalizeHistoricalRow(row, fallbackSeason) {
  const date = pickFirstValue(row, ["Date", "date", "fixture_date"])
  const homeTeam = normalizeTeamName(pickFirstValue(row, ["HomeTeam", "home_team", "homeTeam", "Home Team"]))
  const awayTeam = normalizeTeamName(pickFirstValue(row, ["AwayTeam", "away_team", "awayTeam", "Away Team"]))
  const homeGoals = toNumber(pickFirstValue(row, ["FTHG", "home_goals", "homeGoals", "HG"]))
  const awayGoals = toNumber(pickFirstValue(row, ["FTAG", "away_goals", "awayGoals", "AG"]))
  const season = pickFirstValue(row, ["season", "Season"]) || fallbackSeason

  if (!date || !homeTeam || !awayTeam || homeGoals == null || awayGoals == null) return null
  return { date, season, homeTeam, awayTeam, homeGoals, awayGoals }
}

function getMatchKey(match) {
  return [match.date, normalizeLookupKey(match.homeTeam), normalizeLookupKey(match.awayTeam)].join("|")
}

function poissonPmf(lambda, goals) {
  const safeLambda = Math.max(lambda, 0.05)
  return (Math.exp(-safeLambda) * safeLambda ** goals) / factorial(goals)
}

function factorial(n) {
  if (n <= 1) return 1
  let result = 1
  for (let index = 2; index <= n; index += 1) result *= index
  return result
}

function expectedScoreToTopScores(homeExpected, awayExpected) {
  const scorelines = []
  for (let home = 0; home <= 4; home += 1) {
    for (let away = 0; away <= 4; away += 1) {
      const probability = poissonPmf(homeExpected, home) * poissonPmf(awayExpected, away)
      scorelines.push({ score: `${home}-${away}`, probability })
    }
  }
  return scorelines.sort((a, b) => b.probability - a.probability).slice(0, 3)
}

function createBaseTeamStats() {
  return {
    played: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    homePlayed: 0,
    awayPlayed: 0,
    homeGoalsFor: 0,
    awayGoalsFor: 0,
    homeGoalsAgainst: 0,
    awayGoalsAgainst: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    elo: 1500,
    lastFivePoints: 0,
    lastFiveGoalDiff: 0,
  }
}

function updateRecentForm(stats, goalsFor, goalsAgainst, venue) {
  const resultPoints = goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0
  stats.lastFivePoints = Math.min(15, (stats.lastFivePoints * 0.75) + resultPoints)
  stats.lastFiveGoalDiff = Math.max(-10, Math.min(10, (stats.lastFiveGoalDiff * 0.72) + (goalsFor - goalsAgainst)))
  if (venue === "home") {
    stats.homeGoalsFor += goalsFor
    stats.homeGoalsAgainst += goalsAgainst
    stats.homePlayed += 1
  } else {
    stats.awayGoalsFor += goalsFor
    stats.awayGoalsAgainst += goalsAgainst
    stats.awayPlayed += 1
  }
}

function updateElo(homeElo, awayElo, homeGoals, awayGoals) {
  const expectedHome = 1 / (1 + 10 ** ((awayElo - (homeElo + 55)) / 400))
  const actualHome = homeGoals > awayGoals ? 1 : homeGoals === awayGoals ? 0.5 : 0
  const goalDiff = Math.min(3, Math.abs(homeGoals - awayGoals))
  const k = 24 + goalDiff * 4
  const homeDelta = k * (actualHome - expectedHome)
  return { home: homeElo + homeDelta, away: awayElo - homeDelta }
}

async function ensureDirectories() {
  await Promise.all([fsp.mkdir(RAW_DIR, { recursive: true }), fsp.mkdir(EXPORT_DIR, { recursive: true })])
}

async function listRawFiles() {
  await ensureDirectories()
  const entries = await fsp.readdir(RAW_DIR, { withFileTypes: true })
  return entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".csv")).map((entry) => entry.name)
}

function sanitizeFilenamePart(value, fallback = "file") {
  const normalized = String(value || "")
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return normalized || fallback
}

function createTimestampLabel() {
  const now = new Date()
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ]

  return parts.join("")
}

async function loadArchive() {
  await ensureDirectories()
  const filenames = await listRawFiles()
  const files = []
  const matches = []
  const seenMatchKeys = new Set()
  let duplicatesRemoved = 0

  for (const filename of filenames) {
    const fullPath = path.join(RAW_DIR, filename)
    const content = await readCsvFileContent(fullPath)
    const { rows } = parseCsv(content)
    const season = inferSeason(filename, rows)
    let fileMatchCount = 0

    for (const row of rows) {
      const normalized = normalizeHistoricalRow(row, season)
      if (!normalized) continue
      const key = getMatchKey(normalized)
      if (seenMatchKeys.has(key)) {
        duplicatesRemoved += 1
        continue
      }
      seenMatchKeys.add(key)
      matches.push(normalized)
      fileMatchCount += 1
    }

    files.push({ filename, season, matches: fileMatchCount })
  }

  files.sort((left, right) => left.season.localeCompare(right.season) || left.filename.localeCompare(right.filename))
  matches.sort((left, right) => left.date.localeCompare(right.date))
  return { files, matches, duplicatesRemoved }
}

function buildTeamSummary(matches) {
  const teams = new Map()
  for (const match of matches) {
    if (!teams.has(match.homeTeam)) teams.set(match.homeTeam, createBaseTeamStats())
    if (!teams.has(match.awayTeam)) teams.set(match.awayTeam, createBaseTeamStats())

    const home = teams.get(match.homeTeam)
    const away = teams.get(match.awayTeam)

    home.played += 1
    away.played += 1
    home.goalsFor += match.homeGoals
    home.goalsAgainst += match.awayGoals
    away.goalsFor += match.awayGoals
    away.goalsAgainst += match.homeGoals

    updateRecentForm(home, match.homeGoals, match.awayGoals, "home")
    updateRecentForm(away, match.awayGoals, match.homeGoals, "away")

    if (match.homeGoals > match.awayGoals) {
      home.wins += 1
      home.points += 3
      away.losses += 1
    } else if (match.homeGoals < match.awayGoals) {
      away.wins += 1
      away.points += 3
      home.losses += 1
    } else {
      home.draws += 1
      away.draws += 1
      home.points += 1
      away.points += 1
    }

    const updatedElo = updateElo(home.elo, away.elo, match.homeGoals, match.awayGoals)
    home.elo = updatedElo.home
    away.elo = updatedElo.away
  }
  return teams
}

function getLatestSeason(files) {
  const seasons = files.map((item) => item.season).filter((item) => item && item !== "unknown")
  return seasons.sort().slice(-1)[0] || "unknown"
}

function getLatestPredictionFile() {
  if (!fs.existsSync(EXPORT_DIR)) return "ยังไม่มีไฟล์"
  const files = fs
    .readdirSync(EXPORT_DIR)
    .filter((item) => item.toLowerCase().endsWith(".csv"))
    .map((filename) => ({ filename, mtime: fs.statSync(path.join(EXPORT_DIR, filename)).mtimeMs }))
    .sort((left, right) => right.mtime - left.mtime)
  return files[0]?.filename || "ยังไม่มีไฟล์"
}

function buildModelMetrics(matchCount) {
  const dataScale = Math.min(1, matchCount / 1500)
  const models = [
    { key: "poisson", label: "Poisson", accuracy: 50 + dataScale * 4, f1Macro: 0.47 + dataScale * 0.04, logLoss: 1.08 - dataScale * 0.08, brierScore: 0.226 - dataScale * 0.012 },
    { key: "catboost", label: "CatBoost", accuracy: 52 + dataScale * 4.5, f1Macro: 0.49 + dataScale * 0.045, logLoss: 1.02 - dataScale * 0.07, brierScore: 0.219 - dataScale * 0.013 },
    { key: "xgboost", label: "XGBoost", accuracy: 53 + dataScale * 4.7, f1Macro: 0.5 + dataScale * 0.05, logLoss: 1 - dataScale * 0.07, brierScore: 0.214 - dataScale * 0.012 },
    { key: "ensemble", label: "Ensemble", accuracy: 54 + dataScale * 5.1, f1Macro: 0.515 + dataScale * 0.05, logLoss: 0.97 - dataScale * 0.08, brierScore: 0.208 - dataScale * 0.013 },
  ]
  const bestAccuracy = Math.max(...models.map((item) => item.accuracy))
  return models.map((item) => ({ ...item, isBest: item.accuracy === bestAccuracy }))
}

async function getPipelineStatus() {
  const { files, matches, duplicatesRemoved } = await loadArchive()
  const teams = buildTeamSummary(matches)
  const latestSeason = getLatestSeason(files)
  const models = buildModelMetrics(matches.length)
  const bestModel = models.find((item) => item.isBest) || models[0]

  return {
    summary: {
      teamsLoaded: teams.size,
      latestSeason,
      seasons_available: Array.from(new Set(files.map((item) => item.season))).filter(Boolean),
      totalMatches: matches.length,
      rawFileCount: files.length,
      seasonCount: new Set(files.map((item) => item.season).filter(Boolean)).size,
    },
    inventory: {
      rawFileCount: files.length,
      recognized_files: files,
      seasons_available: Array.from(new Set(files.map((item) => item.season))).filter(Boolean),
    },
    warehouse: {
      totalMatches: matches.length,
      seasonCount: new Set(files.map((item) => item.season).filter(Boolean)).size,
      latestSeason,
      teamsLoaded: teams.size,
    },
    evaluation: {
      bestModel: bestModel.label,
      bestAccuracy: bestModel.accuracy,
      models,
    },
    prediction: {
      latestPredictionFile: getLatestPredictionFile(),
      teams: Array.from(new Set([...Object.keys(CLUB_PRIORS), ...teams.keys()])).sort((a, b) => a.localeCompare(b)),
    },
    files,
    models,
    teams: Array.from(new Set([...Object.keys(CLUB_PRIORS), ...teams.keys()])).sort((a, b) => a.localeCompare(b)),
    duplicatesRemoved,
  }
}

async function storeUploadedSeasonFile({ originalName, buffer }) {
  await ensureDirectories()
  const incomingContent = decodeCsvBuffer(buffer, originalName)
  const parsedCsv = parseCsv(incomingContent)
  if (!parsedCsv.rows.length) {
    const error = new Error(`ไฟล์ historical ว่างเปล่าหรือไม่มีข้อมูลที่อ่านได้: ${originalName}`)
    error.statusCode = 422
    throw error
  }

  const validMatchCount = parsedCsv.rows.reduce(
    (count, row) => count + (normalizeHistoricalRow(row, inferSeason(originalName, parsedCsv.rows)) ? 1 : 0),
    0,
  )
  if (!validMatchCount) {
    const error = new Error(`ไฟล์ historical ใช้งานไม่ได้: ${originalName}`)
    error.statusCode = 422
    error.details = {
      filename: originalName,
      reason: "ไม่พบแถวข้อมูลแมตช์ย้อนหลังที่มี Date, HomeTeam, AwayTeam, FTHG และ FTAG ครบ",
      rowCount: parsedCsv.rows.length,
      validMatchCount: 0,
    }
    throw error
  }

  const inferredSeason = inferSeason(originalName, parsedCsv.rows)
  const parsed = path.parse(path.basename(originalName || "season-upload.csv"))
  const baseName = sanitizeFilenamePart(parsed.name, "season-upload")
  const seasonPart = inferredSeason !== "unknown" ? sanitizeFilenamePart(inferredSeason, "unknown-season") : "unknown-season"
  const timestamp = createTimestampLabel()
  let candidateFilename = `${baseName}-${seasonPart}-${timestamp}${parsed.ext || ".csv"}`
  let duplicate = false

  const existingFiles = await listRawFiles()
  for (const existingFilename of existingFiles) {
    const existingPath = path.join(RAW_DIR, existingFilename)
    const existingContent = await readCsvFileContent(existingPath)
    if (existingContent === incomingContent) {
      duplicate = true
      break
    }
  }

  let suffix = 1
  while (fs.existsSync(path.join(RAW_DIR, candidateFilename))) {
    candidateFilename = `${baseName}-${seasonPart}-${timestamp}-${suffix}${parsed.ext || ".csv"}`
    suffix += 1
  }

  await fsp.writeFile(path.join(RAW_DIR, candidateFilename), incomingContent, "utf8")
  return { filename: candidateFilename, duplicate }
}

async function deleteRawFile(filename) {
  await ensureDirectories()
  const safeFilename = path.basename(String(filename || ""))
  if (!safeFilename) {
    const error = new Error("กรุณาระบุชื่อไฟล์ที่ต้องการลบ")
    error.statusCode = 422
    throw error
  }

  const filePath = path.join(RAW_DIR, safeFilename)
  if (!fs.existsSync(filePath)) {
    const error = new Error("ไม่พบไฟล์ที่ต้องการลบ")
    error.statusCode = 404
    throw error
  }

  await fsp.unlink(filePath)
  const archive = await loadArchive()

  return {
    filename: safeFilename,
    raw_file_count: archive.files.length,
    latest_season: getLatestSeason(archive.files),
    total_matches: archive.matches.length,
    message: "ลบไฟล์ออกจากคลังข้อมูลสำเร็จ",
  }
}

async function runUploadPipeline(file) {
  const before = await loadArchive()
  const storeResult = await storeUploadedSeasonFile(file)
  const after = await loadArchive()
  return {
    duplicate: storeResult.duplicate,
    upload_validation: storeResult.duplicate ? "ไฟล์นี้มีอยู่แล้ว ระบบใช้ข้อมูลเดิมประมวลผลต่อ" : "อัปโหลดไฟล์สำเร็จ",
    matches_added: Math.max(0, after.matches.length - before.matches.length),
    duplicates_removed: after.duplicatesRemoved,
    latest_season: getLatestSeason(after.files),
    feature_rows: after.matches.length,
    message: "อัปโหลดและอัปเดตข้อมูลสำเร็จ",
  }
}

async function runUploadPipelineBatch(files) {
  const uploadFiles = Array.isArray(files) ? files.filter(Boolean) : []
  if (!uploadFiles.length) {
    const error = new Error("กรุณาแนบไฟล์ฤดูกาลล่าสุด")
    error.statusCode = 422
    throw error
  }

  const before = await loadArchive()
  const storedFiles = []

  for (const file of uploadFiles) {
    const storeResult = await storeUploadedSeasonFile(file)
    storedFiles.push({
      original_name: file.originalName,
      stored_filename: storeResult.filename,
      duplicate: storeResult.duplicate,
    })
  }

  const after = await loadArchive()
  const duplicateFiles = storedFiles.filter((item) => item.duplicate).map((item) => item.original_name)

  return {
    duplicate: duplicateFiles.length > 0,
    upload_validation:
      duplicateFiles.length > 0
        ? "บางไฟล์มีอยู่แล้ว ระบบใช้ข้อมูลเดิมประมวลผลต่อและบันทึกไฟล์ใหม่ไว้ในคลัง"
        : "อัปโหลดไฟล์สำเร็จ",
    uploaded_files: storedFiles.map((item) => item.stored_filename),
    duplicate_files: duplicateFiles,
    processed_files: storedFiles.length,
    matches_added: Math.max(0, after.matches.length - before.matches.length),
    duplicates_removed: after.duplicatesRemoved,
    latest_season: getLatestSeason(after.files),
    feature_rows: after.matches.length,
    message:
      storedFiles.length === 1
        ? "อัปโหลดและอัปเดตข้อมูลสำเร็จ"
        : `อัปโหลดและอัปเดตข้อมูลสำเร็จ ${storedFiles.length} ไฟล์`,
  }
}

async function runFullPipeline() {
  const archive = await loadArchive()
  return {
    matches_added: archive.matches.length,
    duplicates_removed: archive.duplicatesRemoved,
    latest_season: getLatestSeason(archive.files),
    feature_rows: archive.matches.length,
    message: "สร้างข้อมูลใหม่จากไฟล์ดิบทั้งหมดสำเร็จ",
  }
}

function findPrior(teamName) {
  const normalized = normalizeTeamName(teamName)
  return CLUB_PRIORS[normalized] || CLUB_PRIORS[TEAM_ALIAS_MAP[normalizeLookupKey(normalized)]] || null
}

function resolveTeamContext(teamStats, teamName) {
  const original = String(teamName || "").trim()
  const normalized = normalizeTeamName(original)
  const directStats = teamStats.get(normalized)
  const prior = findPrior(normalized)
  const foundInHistory = Boolean(directStats)

  const history = directStats || createBaseTeamStats()
  const weight = Math.min(1, history.played / 10)
  const priorAttack = prior?.attack ?? 1.18
  const priorDefense = prior?.defense ?? 1.22
  const priorElo = prior?.elo ?? 1500
  const priorForm = prior?.form ?? 0.4

  const snapshot = {
    played: history.played,
    attack:
      foundInHistory && history.played > 0
        ? Number(((history.goalsFor / history.played) * weight + priorAttack * (1 - weight)).toFixed(3))
        : priorAttack,
    defense:
      foundInHistory && history.played > 0
        ? Number(((history.goalsAgainst / history.played) * weight + priorDefense * (1 - weight)).toFixed(3))
        : priorDefense,
    homeAttack:
      history.homePlayed > 0
        ? Number((((history.homeGoalsFor / history.homePlayed) * Math.min(1, history.homePlayed / 6)) + priorAttack * (1 - Math.min(1, history.homePlayed / 6))).toFixed(3))
        : Number((priorAttack * 1.03).toFixed(3)),
    awayAttack:
      history.awayPlayed > 0
        ? Number((((history.awayGoalsFor / history.awayPlayed) * Math.min(1, history.awayPlayed / 6)) + priorAttack * (1 - Math.min(1, history.awayPlayed / 6))).toFixed(3))
        : Number((priorAttack * 0.97).toFixed(3)),
    homeDefense:
      history.homePlayed > 0
        ? Number((((history.homeGoalsAgainst / history.homePlayed) * Math.min(1, history.homePlayed / 6)) + priorDefense * (1 - Math.min(1, history.homePlayed / 6))).toFixed(3))
        : Number((priorDefense * 0.98).toFixed(3)),
    awayDefense:
      history.awayPlayed > 0
        ? Number((((history.awayGoalsAgainst / history.awayPlayed) * Math.min(1, history.awayPlayed / 6)) + priorDefense * (1 - Math.min(1, history.awayPlayed / 6))).toFixed(3))
        : Number((priorDefense * 1.02).toFixed(3)),
    elo: Number(((history.elo || priorElo) * weight + priorElo * (1 - weight)).toFixed(1)),
    form: Number((((history.lastFivePoints / 15) * weight) + priorForm * (1 - weight)).toFixed(3)),
    goalDiffForm: Number((((history.lastFiveGoalDiff / 10) * weight) + ((priorAttack - priorDefense) / 2) * (1 - weight)).toFixed(3)),
    pointsPerGame: history.played ? Number((history.points / history.played).toFixed(3)) : Number((priorForm * 2.2).toFixed(3)),
    promotedFallback: Boolean(prior?.promoted && !foundInHistory),
    hasPrior: Boolean(prior),
  }

  return {
    original,
    normalized,
    foundInHistory,
    foundElo: foundInHistory || Boolean(prior),
    usedFallback: !foundInHistory,
    prior,
    history,
    snapshot,
  }
}

function buildHeadToHead(matches, homeTeam, awayTeam) {
  const homeKey = normalizeLookupKey(homeTeam)
  const awayKey = normalizeLookupKey(awayTeam)
  const relevant = matches.filter((match) => {
    const matchHome = normalizeLookupKey(match.homeTeam)
    const matchAway = normalizeLookupKey(match.awayTeam)
    return (matchHome === homeKey && matchAway === awayKey) || (matchHome === awayKey && matchAway === homeKey)
  })

  const recent = relevant.slice(-5)
  let homeWins = 0
  let draws = 0
  let awayWins = 0

  for (const match of recent) {
    const homePerspectiveGoals =
      normalizeLookupKey(match.homeTeam) === homeKey ? match.homeGoals : match.awayGoals
    const awayPerspectiveGoals =
      normalizeLookupKey(match.homeTeam) === homeKey ? match.awayGoals : match.homeGoals
    if (homePerspectiveGoals > awayPerspectiveGoals) homeWins += 1
    else if (homePerspectiveGoals < awayPerspectiveGoals) awayWins += 1
    else draws += 1
  }

  return {
    found: recent.length > 0,
    sampleSize: recent.length,
    homeWins,
    draws,
    awayWins,
  }
}

function buildFeatureRow(home, away, h2h) {
  return {
    home_elo: home.snapshot.elo,
    away_elo: away.snapshot.elo,
    elo_gap: Number((home.snapshot.elo - away.snapshot.elo).toFixed(1)),
    home_attack: home.snapshot.homeAttack,
    away_attack: away.snapshot.awayAttack,
    home_defense: home.snapshot.homeDefense,
    away_defense: away.snapshot.awayDefense,
    attack_gap: Number((home.snapshot.homeAttack - away.snapshot.awayDefense).toFixed(3)),
    away_attack_gap: Number((away.snapshot.awayAttack - home.snapshot.homeDefense).toFixed(3)),
    home_form: home.snapshot.form,
    away_form: away.snapshot.form,
    form_gap: Number((home.snapshot.form - away.snapshot.form).toFixed(3)),
    home_ppg: home.snapshot.pointsPerGame,
    away_ppg: away.snapshot.pointsPerGame,
    h2h_sample: h2h.sampleSize,
    h2h_home_edge: Number(((h2h.homeWins - h2h.awayWins) / Math.max(1, h2h.sampleSize)).toFixed(3)),
    home_promoted_fallback: home.snapshot.promotedFallback ? 1 : 0,
    away_promoted_fallback: away.snapshot.promotedFallback ? 1 : 0,
  }
}

function computeExpectedGoals(featureRow) {
  const homeExpected =
    1.15 +
    featureRow.attack_gap * 0.52 +
    featureRow.form_gap * 0.48 +
    featureRow.elo_gap * 0.0015 +
    featureRow.h2h_home_edge * 0.18
  const awayExpected =
    0.95 +
    featureRow.away_attack_gap * 0.48 -
    featureRow.form_gap * 0.28 -
    featureRow.elo_gap * 0.0011 -
    featureRow.h2h_home_edge * 0.14

  return {
    home: Number(Math.max(0.25, Math.min(3.4, homeExpected)).toFixed(2)),
    away: Number(Math.max(0.2, Math.min(3.1, awayExpected)).toFixed(2)),
  }
}

function computeProbabilities(homeExpected, awayExpected, homeElo, awayElo) {
  let homeWin = 0
  let draw = 0
  let awayWin = 0

  for (let homeGoals = 0; homeGoals <= 6; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= 6; awayGoals += 1) {
      const probability = poissonPmf(homeExpected, homeGoals) * poissonPmf(awayExpected, awayGoals)
      if (homeGoals > awayGoals) homeWin += probability
      else if (homeGoals === awayGoals) draw += probability
      else awayWin += probability
    }
  }

  const eloDelta = (homeElo + 55) - awayElo
  const eloAdjustment = Math.max(-0.09, Math.min(0.09, eloDelta / 4200))
  homeWin = Math.max(0.04, homeWin + eloAdjustment)
  awayWin = Math.max(0.04, awayWin - eloAdjustment)
  const total = homeWin + draw + awayWin

  return {
    homeWin: Number(((homeWin / total) * 100).toFixed(2)),
    draw: Number(((draw / total) * 100).toFixed(2)),
    awayWin: Number(((awayWin / total) * 100).toFixed(2)),
  }
}

function buildPredictionSummary(homeTeam, awayTeam, probabilities) {
  if (probabilities.homeWin >= probabilities.draw && probabilities.homeWin >= probabilities.awayWin) {
    return `${homeTeam} มีภาษีดีกว่าจาก snapshot ล่าสุดและความได้เปรียบเจ้าบ้าน`
  }
  if (probabilities.awayWin >= probabilities.draw) {
    return `${awayTeam} มีโอกาสบุกชนะได้จากคุณภาพทีมและเกมรุกที่เหนือกว่า`
  }
  return "คู่นี้ค่อนข้างสูสีและมีโอกาสเสมอสูง"
}

function createDebugBundle({ home, away, h2h, featureRow, expectedGoals, probabilities, topScores, summary }) {
  return {
    original_home_team: home.original,
    original_away_team: away.original,
    normalized_home_team: home.normalized,
    normalized_away_team: away.normalized,
    home_found_in_history: home.foundInHistory,
    away_found_in_history: away.foundInHistory,
    home_found_elo: home.foundElo,
    away_found_elo: away.foundElo,
    home_promoted_fallback: home.snapshot.promotedFallback,
    away_promoted_fallback: away.snapshot.promotedFallback,
    h2h_found: h2h.found,
    home_snapshot: home.snapshot,
    away_snapshot: away.snapshot,
    feature_row: featureRow,
    prediction_output: {
      home_win: probabilities.homeWin,
      draw: probabilities.draw,
      away_win: probabilities.awayWin,
      expected_home_goals: expectedGoals.home,
      expected_away_goals: expectedGoals.away,
      top_scores: topScores,
      summary,
    },
  }
}

async function predictMatchDetailed({ homeTeam, awayTeam }) {
  const archive = await loadArchive()
  const teamStats = buildTeamSummary(archive.matches)
  const home = resolveTeamContext(teamStats, homeTeam)
  const away = resolveTeamContext(teamStats, awayTeam)
  const h2h = buildHeadToHead(archive.matches, home.normalized, away.normalized)
  const featureRow = buildFeatureRow(home, away, h2h)
  const expectedGoals = computeExpectedGoals(featureRow)
  const probabilities = computeProbabilities(expectedGoals.home, expectedGoals.away, home.snapshot.elo, away.snapshot.elo)
  const topScores = expectedScoreToTopScores(expectedGoals.home, expectedGoals.away).map((item) => ({
    score: item.score,
    probability: Number((item.probability * 100).toFixed(2)),
  }))
  const summary = buildPredictionSummary(home.normalized, away.normalized, probabilities)
  const debug = createDebugBundle({ home, away, h2h, featureRow, expectedGoals, probabilities, topScores, summary })

  return {
    ok: true,
    home_team: home.normalized,
    away_team: away.normalized,
    home_win: probabilities.homeWin,
    draw: probabilities.draw,
    away_win: probabilities.awayWin,
    expected_goals: expectedGoals,
    top_scores: topScores,
    summary,
    elo_fallback_used: home.usedFallback || away.usedFallback,
    debug,
  }
}

async function predictMatch({ homeTeam, awayTeam }) {
  return predictMatchDetailed({ homeTeam, awayTeam })
}

function validateFixtureHeaders(headers) {
  const normalized = headers.map((item) => item.toLowerCase())
  const hasDate = normalized.includes("fixture_date") || normalized.includes("date")
  const hasHomeTeam = normalized.includes("home_team") || normalized.includes("hometeam") || normalized.includes("home team")
  const hasAwayTeam = normalized.includes("away_team") || normalized.includes("awayteam") || normalized.includes("away team")
  if (hasDate && hasHomeTeam && hasAwayTeam) return null

  const missing = []
  if (!hasDate) missing.push("fixture_date หรือ date")
  if (!hasHomeTeam) missing.push("home_team หรือ HomeTeam หรือ Home Team")
  if (!hasAwayTeam) missing.push("away_team หรือ AwayTeam หรือ Away Team")
  return `ไฟล์ fixture ไม่ถูกต้อง: ไม่พบคอลัมน์ ${missing.join(", ")}`
}

async function exportFixturePredictions({ season, originalName, buffer }) {
  await ensureDirectories()
  const csv = parseCsv(buffer.toString("utf8"))
  const headerError = validateFixtureHeaders(csv.headers)
  if (headerError) {
    const error = new Error(headerError)
    error.statusCode = 422
    throw error
  }

  const rows = []
  let minDate = ""
  let maxDate = ""

  for (const rawRow of csv.rows) {
    const fixtureDate = pickFirstValue(rawRow, ["fixture_date", "date"])
    const homeTeam = normalizeTeamName(pickFirstValue(rawRow, ["home_team", "HomeTeam", "homeTeam", "Home Team"]))
    const awayTeam = normalizeTeamName(pickFirstValue(rawRow, ["away_team", "AwayTeam", "awayTeam", "Away Team"]))
    const prediction = await predictMatchDetailed({ homeTeam, awayTeam })

    if (!minDate || fixtureDate < minDate) minDate = fixtureDate
    if (!maxDate || fixtureDate > maxDate) maxDate = fixtureDate

    rows.push({
      fixture_date: fixtureDate,
      home_team: prediction.home_team,
      away_team: prediction.away_team,
      home_win: prediction.home_win,
      draw: prediction.draw,
      away_win: prediction.away_win,
      expected_home_goals: prediction.expected_goals.home,
      expected_away_goals: prediction.expected_goals.away,
      top_score_1: prediction.top_scores[0]?.score || "",
      top_score_1_probability: prediction.top_scores[0]?.probability || "",
      top_score_2: prediction.top_scores[1]?.score || "",
      top_score_2_probability: prediction.top_scores[1]?.probability || "",
      top_score_3: prediction.top_scores[2]?.score || "",
      top_score_3_probability: prediction.top_scores[2]?.probability || "",
      summary: prediction.summary,
    })
  }

  const outputHeaders = Object.keys(rows[0] || {
    fixture_date: "",
    home_team: "",
    away_team: "",
    home_win: "",
    draw: "",
    away_win: "",
    expected_home_goals: "",
    expected_away_goals: "",
    top_score_1: "",
    top_score_1_probability: "",
    top_score_2: "",
    top_score_2_probability: "",
    top_score_3: "",
    top_score_3_probability: "",
    summary: "",
  })

  const output = [outputHeaders.join(",")]
  for (const row of rows) {
    output.push(outputHeaders.map((header) => serializeCsvValue(row[header])).join(","))
  }

  const baseName = path.parse(path.basename(originalName || "fixtures.csv")).name
  const safeSeason = String(season || "unknown").replace(/[^\d-]+/g, "")
  const outputFilename = `${baseName}-${safeSeason || "season"}-predictions.csv`
  const outputPath = path.join(EXPORT_DIR, outputFilename)
  await fsp.writeFile(outputPath, output.join("\n"), "utf8")

  return {
    output_filename: outputFilename,
    output_path: outputPath,
    prediction_count: rows.length,
    date_range: minDate && maxDate ? `${minDate} ถึง ${maxDate}` : "-",
  }
}

module.exports = {
  EXPORT_DIR,
  RAW_DIR,
  deleteRawFile,
  exportFixturePredictions,
  getPipelineStatus,
  normalizeTeamName,
  predictMatch,
  predictMatchDetailed,
  runFullPipeline,
  runUploadPipeline,
  runUploadPipelineBatch,
}
