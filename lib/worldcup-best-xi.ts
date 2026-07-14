export type BestXiPosition = "GK" | "DEF" | "MID" | "FWD"

export type RoundPlayerPerformance = {
  id: string
  name: string
  shortName: string
  country: string
  club?: string
  position: BestXiPosition
  role: string
  minutes: number
  goals: number
  assists: number
  shotsOnTarget: number
  keyPasses: number
  dribblesWon: number
  recoveries: number
  passAccuracy: number
  tacklesWon: number
  interceptions: number
  clearances: number
  saves: number
  cleanSheet: boolean
  penaltySaved: boolean
  decisiveImpact: number
  errorLedToGoal: number
  redCards: number
}

export type RankedBestXiPlayer = RoundPlayerPerformance & {
  rating: number
  score: number
  note: string
}

type BestXiResult = {
  lineup: RankedBestXiPlayer[]
  standouts: RankedBestXiPlayer[]
  recap: string
}

const roundOf16PlayerPerformances: RoundPlayerPerformance[] = [
  {
    id: "fra-mbappe",
    name: "Kylian Mbappe",
    shortName: "K. Mbappe",
    country: "FRA",
    club: "France",
    position: "FWD",
    role: "LW",
    minutes: 90,
    goals: 2,
    assists: 0,
    shotsOnTarget: 4,
    keyPasses: 2,
    dribblesWon: 5,
    recoveries: 2,
    passAccuracy: 86,
    tacklesWon: 0,
    interceptions: 0,
    clearances: 0,
    saves: 0,
    cleanSheet: false,
    penaltySaved: false,
    decisiveImpact: 1,
    errorLedToGoal: 0,
    redCards: 0,
  },
  {
    id: "esp-oyarzabal",
    name: "Mikel Oyarzabal",
    shortName: "M. Oyarzabal",
    country: "ESP",
    club: "Spain",
    position: "FWD",
    role: "ST",
    minutes: 88,
    goals: 1,
    assists: 1,
    shotsOnTarget: 3,
    keyPasses: 3,
    dribblesWon: 2,
    recoveries: 3,
    passAccuracy: 84,
    tacklesWon: 0,
    interceptions: 0,
    clearances: 0,
    saves: 0,
    cleanSheet: false,
    penaltySaved: false,
    decisiveImpact: 1,
    errorLedToGoal: 0,
    redCards: 0,
  },
  {
    id: "arg-messi",
    name: "Lionel Messi",
    shortName: "L. Messi",
    country: "ARG",
    club: "Argentina",
    position: "FWD",
    role: "RW",
    minutes: 90,
    goals: 1,
    assists: 1,
    shotsOnTarget: 3,
    keyPasses: 4,
    dribblesWon: 4,
    recoveries: 4,
    passAccuracy: 88,
    tacklesWon: 0,
    interceptions: 0,
    clearances: 0,
    saves: 0,
    cleanSheet: false,
    penaltySaved: false,
    decisiveImpact: 1,
    errorLedToGoal: 0,
    redCards: 0,
  },
  {
    id: "civ-diallo",
    name: "Amad Diallo",
    shortName: "A. Diallo",
    country: "CIV",
    club: "Ivory Coast",
    position: "MID",
    role: "LCM",
    minutes: 90,
    goals: 1,
    assists: 1,
    shotsOnTarget: 2,
    keyPasses: 4,
    dribblesWon: 4,
    recoveries: 8,
    passAccuracy: 89,
    tacklesWon: 2,
    interceptions: 1,
    clearances: 1,
    saves: 0,
    cleanSheet: false,
    penaltySaved: false,
    decisiveImpact: 1,
    errorLedToGoal: 0,
    redCards: 0,
  },
  {
    id: "can-eustaquio",
    name: "Stephen Eustaquio",
    shortName: "S. Eustaquio",
    country: "CAN",
    club: "Canada",
    position: "MID",
    role: "CM",
    minutes: 90,
    goals: 0,
    assists: 1,
    shotsOnTarget: 1,
    keyPasses: 3,
    dribblesWon: 1,
    recoveries: 10,
    passAccuracy: 91,
    tacklesWon: 3,
    interceptions: 2,
    clearances: 1,
    saves: 0,
    cleanSheet: true,
    penaltySaved: false,
    decisiveImpact: 1,
    errorLedToGoal: 0,
    redCards: 0,
  },
  {
    id: "fra-olise",
    name: "Michael Olise",
    shortName: "M. Olise",
    country: "FRA",
    club: "France",
    position: "MID",
    role: "RCM",
    minutes: 83,
    goals: 0,
    assists: 2,
    shotsOnTarget: 1,
    keyPasses: 5,
    dribblesWon: 3,
    recoveries: 6,
    passAccuracy: 87,
    tacklesWon: 1,
    interceptions: 1,
    clearances: 0,
    saves: 0,
    cleanSheet: false,
    penaltySaved: false,
    decisiveImpact: 1,
    errorLedToGoal: 0,
    redCards: 0,
  },
  {
    id: "esp-cucurella",
    name: "Marc Cucurella",
    shortName: "M. Cucurella",
    country: "ESP",
    club: "Spain",
    position: "DEF",
    role: "LB",
    minutes: 90,
    goals: 0,
    assists: 1,
    shotsOnTarget: 0,
    keyPasses: 2,
    dribblesWon: 1,
    recoveries: 7,
    passAccuracy: 85,
    tacklesWon: 4,
    interceptions: 2,
    clearances: 3,
    saves: 0,
    cleanSheet: true,
    penaltySaved: false,
    decisiveImpact: 0,
    errorLedToGoal: 0,
    redCards: 0,
  },
  {
    id: "arg-lisandro",
    name: "Lisandro Martinez",
    shortName: "L. Martinez",
    country: "ARG",
    club: "Argentina",
    position: "DEF",
    role: "LCB",
    minutes: 90,
    goals: 0,
    assists: 0,
    shotsOnTarget: 0,
    keyPasses: 1,
    dribblesWon: 0,
    recoveries: 8,
    passAccuracy: 90,
    tacklesWon: 4,
    interceptions: 3,
    clearances: 5,
    saves: 0,
    cleanSheet: true,
    penaltySaved: false,
    decisiveImpact: 1,
    errorLedToGoal: 0,
    redCards: 0,
  },
  {
    id: "can-cornelius",
    name: "Derek Cornelius",
    shortName: "D. Cornelius",
    country: "CAN",
    club: "Canada",
    position: "DEF",
    role: "RCB",
    minutes: 90,
    goals: 0,
    assists: 0,
    shotsOnTarget: 0,
    keyPasses: 0,
    dribblesWon: 0,
    recoveries: 6,
    passAccuracy: 88,
    tacklesWon: 3,
    interceptions: 4,
    clearances: 7,
    saves: 0,
    cleanSheet: true,
    penaltySaved: false,
    decisiveImpact: 1,
    errorLedToGoal: 0,
    redCards: 0,
  },
  {
    id: "esp-porro",
    name: "Pedro Porro",
    shortName: "P. Porro",
    country: "ESP",
    club: "Spain",
    position: "DEF",
    role: "RB",
    minutes: 90,
    goals: 0,
    assists: 1,
    shotsOnTarget: 1,
    keyPasses: 2,
    dribblesWon: 2,
    recoveries: 5,
    passAccuracy: 84,
    tacklesWon: 3,
    interceptions: 2,
    clearances: 2,
    saves: 0,
    cleanSheet: true,
    penaltySaved: false,
    decisiveImpact: 0,
    errorLedToGoal: 0,
    redCards: 0,
  },
  {
    id: "par-gill",
    name: "Oliver Gill",
    shortName: "O. Gill",
    country: "PAR",
    club: "Paraguay",
    position: "GK",
    role: "GK",
    minutes: 90,
    goals: 0,
    assists: 0,
    shotsOnTarget: 0,
    keyPasses: 0,
    dribblesWon: 0,
    recoveries: 2,
    passAccuracy: 76,
    tacklesWon: 0,
    interceptions: 0,
    clearances: 1,
    saves: 7,
    cleanSheet: false,
    penaltySaved: false,
    decisiveImpact: 1,
    errorLedToGoal: 0,
    redCards: 0,
  },
  {
    id: "eng-kane",
    name: "Harry Kane",
    shortName: "H. Kane",
    country: "ENG",
    club: "England",
    position: "FWD",
    role: "ST",
    minutes: 90,
    goals: 1,
    assists: 0,
    shotsOnTarget: 2,
    keyPasses: 2,
    dribblesWon: 1,
    recoveries: 3,
    passAccuracy: 82,
    tacklesWon: 0,
    interceptions: 0,
    clearances: 0,
    saves: 0,
    cleanSheet: false,
    penaltySaved: false,
    decisiveImpact: 0,
    errorLedToGoal: 0,
    redCards: 0,
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getPassAccuracyBonus(passAccuracy: number) {
  if (passAccuracy >= 92) return 0.55
  if (passAccuracy >= 88) return 0.35
  if (passAccuracy >= 84) return 0.2
  return 0
}

function calculateHybridPlayerScore(player: RoundPlayerPerformance) {
  const impactBonus = player.decisiveImpact * 0.6
  const cleanSheetBonus = player.cleanSheet ? 0.5 : 0
  const penaltySaveBonus = player.penaltySaved ? 1.1 : 0
  const errorPenalty = player.errorLedToGoal * 0.8 + player.redCards * 1.2

  if (player.position === "FWD") {
    return (
      player.goals * 2.2 +
      player.assists * 1.4 +
      player.shotsOnTarget * 0.35 +
      player.keyPasses * 0.3 +
      player.dribblesWon * 0.2 +
      impactBonus -
      errorPenalty
    )
  }

  if (player.position === "MID") {
    return (
      player.goals * 1.6 +
      player.assists * 1.6 +
      player.keyPasses * 0.45 +
      player.recoveries * 0.18 +
      player.dribblesWon * 0.18 +
      getPassAccuracyBonus(player.passAccuracy) +
      impactBonus -
      errorPenalty
    )
  }

  if (player.position === "DEF") {
    return (
      player.goals * 1.5 +
      player.assists * 1.0 +
      player.tacklesWon * 0.4 +
      player.interceptions * 0.45 +
      player.clearances * 0.22 +
      cleanSheetBonus +
      impactBonus -
      errorPenalty
    )
  }

  return player.saves * 0.45 + cleanSheetBonus + penaltySaveBonus + impactBonus - errorPenalty
}

function createPlayerNote(player: RankedBestXiPlayer) {
  if (player.position === "GK") return "เด่นจากจำนวนเซฟและจังหวะป้องกันเกมสำคัญ"
  if (player.position === "DEF") return "ผลงานเกมรับนิ่งและมีส่วนกับจังหวะเปลี่ยนโมเมนตัม"
  if (player.position === "MID") return "เชื่อมเกมและสร้างอิทธิพลต่อรูปเกมได้ต่อเนื่อง"
  return "จบสกอร์หรือสร้างสรรค์เกมรุกได้ชัดเจนที่สุดในรอบนี้"
}

function toHybridRating(score: number) {
  return clamp(7 + score * 0.34, 7, 10)
}

function rankRoundPlayers(players: RoundPlayerPerformance[]) {
  return players
    .filter((player) => player.minutes > 0)
    .map((player) => {
      const score = calculateHybridPlayerScore(player)
      return {
        ...player,
        score,
        rating: Number(toHybridRating(score).toFixed(1)),
        note: createPlayerNote({
          ...player,
          score,
          rating: Number(toHybridRating(score).toFixed(1)),
          note: "",
        }),
      }
    })
    .sort((a, b) => b.score - a.score)
}

function pickBestXi(players: RankedBestXiPlayer[]) {
  const gk = players.filter((player) => player.position === "GK").slice(0, 1)
  const defenders = players.filter((player) => player.position === "DEF").slice(0, 4)
  const midfielders = players.filter((player) => player.position === "MID").slice(0, 3)
  const forwards = players.filter((player) => player.position === "FWD").slice(0, 3)

  return [...forwards, ...midfielders, ...defenders, ...gk]
}

export function getWorldCupBestXi(): BestXiResult {
  const ranked = rankRoundPlayers(roundOf16PlayerPerformances)
  const grouped = {
    GK: ranked.filter((player) => player.position === "GK"),
    DEF: ranked.filter((player) => player.position === "DEF"),
    MID: ranked.filter((player) => player.position === "MID"),
    FWD: ranked.filter((player) => player.position === "FWD"),
  }

  const lineup = pickBestXi([
    ...grouped.GK,
    ...grouped.DEF,
    ...grouped.MID,
    ...grouped.FWD,
  ])

  const standouts = ranked.slice(0, 3)

  const recap =
    "FootballAI คัด Best XI ชุดนี้จากผู้เล่นที่ลงสนามจริงในรอบ 16 ทีมเท่านั้น แล้วให้คะแนนตามตำแหน่งก่อนเติมโบนัสจากจังหวะตัดสินเกม จึงได้ชุดที่เด่นทั้งด้านประสิทธิภาพเชิงสถิติและผลกระทบต่อผลการแข่งขัน"

  return { lineup, standouts, recap }
}
