const teams = [
  {
    id: "50",
    name: "แมนเชสเตอร์ ซิตี้",
    nameEn: "Manchester City",
    logo: "https://media.api-sports.io/football/teams/50.png",
    venue: {
      id: "1",
      name: "Etihad Stadium",
      city: "Manchester",
      capacity: 55017,
      image: ""
    }
  },
  {
    id: "40",
    name: "ลิเวอร์พูล",
    nameEn: "Liverpool",
    logo: "https://media.api-sports.io/football/teams/40.png",
    venue: {
      id: "2",
      name: "Anfield",
      city: "Liverpool",
      capacity: 61276,
      image: ""
    }
  },
  {
    id: "42",
    name: "อาร์เซนอล",
    nameEn: "Arsenal",
    logo: "https://media.api-sports.io/football/teams/42.png",
    venue: {
      id: "3",
      name: "Emirates Stadium",
      city: "London",
      capacity: 60704,
      image: ""
    }
  },
  {
    id: "49",
    name: "เชลซี",
    nameEn: "Chelsea",
    logo: "https://media.api-sports.io/football/teams/49.png",
    venue: {
      id: "4",
      name: "Stamford Bridge",
      city: "London",
      capacity: 40343,
      image: ""
    }
  },
  {
    id: "33",
    name: "แมนเชสเตอร์ ยูไนเต็ด",
    nameEn: "Manchester United",
    logo: "https://media.api-sports.io/football/teams/33.png",
    venue: {
      id: "5",
      name: "Old Trafford",
      city: "Manchester",
      capacity: 74197,
      image: ""
    }
  },
  {
    id: "47",
    name: "ท็อตแนม ฮ็อตสเปอร์",
    nameEn: "Tottenham",
    logo: "https://media.api-sports.io/football/teams/47.png",
    venue: {
      id: "6",
      name: "Tottenham Hotspur Stadium",
      city: "London",
      capacity: 62850,
      image: ""
    }
  }
]

const standings = [
  { rank: 1, teamId: "50", points: 68, goalsDiff: 35, form: "WWDWW", played: 28, win: 21, draw: 5, lose: 2, goalsFor: 63, goalsAgainst: 28 },
  { rank: 2, teamId: "40", points: 64, goalsDiff: 31, form: "WDWWW", played: 28, win: 19, draw: 7, lose: 2, goalsFor: 61, goalsAgainst: 30 },
  { rank: 3, teamId: "42", points: 60, goalsDiff: 27, form: "WLWDW", played: 28, win: 18, draw: 6, lose: 4, goalsFor: 57, goalsAgainst: 30 },
  { rank: 4, teamId: "49", points: 54, goalsDiff: 19, form: "WWWDL", played: 28, win: 16, draw: 6, lose: 6, goalsFor: 52, goalsAgainst: 33 },
  { rank: 5, teamId: "47", points: 51, goalsDiff: 12, form: "WWLDW", played: 28, win: 15, draw: 6, lose: 7, goalsFor: 51, goalsAgainst: 39 },
  { rank: 6, teamId: "33", points: 46, goalsDiff: 5, form: "LDWWW", played: 28, win: 14, draw: 4, lose: 10, goalsFor: 44, goalsAgainst: 39 }
]

const players = [
  {
    id: "1100",
    name: "Erling Haaland",
    photo: "https://media.api-sports.io/football/players/1100.png",
    nationality: "Norway",
    age: 24,
    teamId: "50",
    teamName: "Manchester City",
    teamNameThai: "แมนเชสเตอร์ ซิตี้",
    teamLogo: "https://media.api-sports.io/football/teams/50.png",
    position: "กองหน้า",
    goals: 22,
    assists: 4,
    appearances: 25,
    shots: 83,
    yellowCards: 3,
    penalties: 5,
    rating: "8.10",
    height: "195 cm",
    weight: "88 kg",
    birth: { date: "2000-07-21", place: "Leeds", country: "England" },
    transfers: [
      {
        date: "2022-07-01",
        type: "Transfer",
        fromTeam: { id: "165", name: "โบรุสเซีย ดอร์ทมุนด์", logo: "https://media.api-sports.io/football/teams/165.png" },
        toTeam: { id: "50", name: "แมนเชสเตอร์ ซิตี้", logo: "https://media.api-sports.io/football/teams/50.png" }
      }
    ]
  },
  {
    id: "306",
    name: "Mohamed Salah",
    photo: "https://media.api-sports.io/football/players/306.png",
    nationality: "Egypt",
    age: 33,
    teamId: "40",
    teamName: "Liverpool",
    teamNameThai: "ลิเวอร์พูล",
    teamLogo: "https://media.api-sports.io/football/teams/40.png",
    position: "กองหน้า",
    goals: 19,
    assists: 13,
    appearances: 25,
    shots: 67,
    yellowCards: 2,
    penalties: 4,
    rating: "8.35",
    height: "175 cm",
    weight: "71 kg",
    birth: { date: "1992-06-15", place: "Nagrig", country: "Egypt" },
    transfers: []
  },
  {
    id: "18",
    name: "Bukayo Saka",
    photo: "https://media.api-sports.io/football/players/18.png",
    nationality: "England",
    age: 23,
    teamId: "42",
    teamName: "Arsenal",
    teamNameThai: "อาร์เซนอล",
    teamLogo: "https://media.api-sports.io/football/teams/42.png",
    position: "ปีกขวา",
    goals: 10,
    assists: 10,
    appearances: 22,
    shots: 51,
    yellowCards: 4,
    penalties: 2,
    rating: "7.90",
    height: "178 cm",
    weight: "72 kg",
    birth: { date: "2001-09-05", place: "London", country: "England" },
    transfers: []
  },
  {
    id: "20574",
    name: "Cole Palmer",
    photo: "https://media.api-sports.io/football/players/20574.png",
    nationality: "England",
    age: 22,
    teamId: "49",
    teamName: "Chelsea",
    teamNameThai: "เชลซี",
    teamLogo: "https://media.api-sports.io/football/teams/49.png",
    position: "กองกลางตัวรุก",
    goals: 14,
    assists: 6,
    appearances: 25,
    shots: 49,
    yellowCards: 5,
    penalties: 6,
    rating: "7.88",
    height: "189 cm",
    weight: "74 kg",
    birth: { date: "2002-05-06", place: "Manchester", country: "England" },
    transfers: [
      {
        date: "2023-09-01",
        type: "Transfer",
        fromTeam: { id: "50", name: "แมนเชสเตอร์ ซิตี้", logo: "https://media.api-sports.io/football/teams/50.png" },
        toTeam: { id: "49", name: "เชลซี", logo: "https://media.api-sports.io/football/teams/49.png" }
      }
    ]
  },
  {
    id: "174",
    name: "Bruno Fernandes",
    photo: "https://media.api-sports.io/football/players/174.png",
    nationality: "Portugal",
    age: 31,
    teamId: "33",
    teamName: "Manchester United",
    teamNameThai: "แมนเชสเตอร์ ยูไนเต็ด",
    teamLogo: "https://media.api-sports.io/football/teams/33.png",
    position: "กองกลาง",
    goals: 9,
    assists: 7,
    appearances: 25,
    shots: 45,
    yellowCards: 6,
    penalties: 3,
    rating: "7.70",
    height: "179 cm",
    weight: "69 kg",
    birth: { date: "1994-09-08", place: "Maia", country: "Portugal" },
    transfers: []
  }
]

const fixtures = [
  {
    id: "9001",
    date: "2026-03-16T19:00:00.000Z",
    roundNumber: 29,
    status: { short: "NS", long: "ยังไม่เริ่ม", elapsed: null, isLive: false, isFinished: false, isUpcoming: true },
    teams: {
      home: { id: "50", name: "แมนเชสเตอร์ ซิตี้", nameEn: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png", winner: null },
      away: { id: "40", name: "ลิเวอร์พูล", nameEn: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png", winner: null }
    },
    goals: { home: null, away: null },
    league: { id: "39", name: "พรีเมียร์ลีก", round: "นัดที่ 29" },
    venue: { name: "Etihad Stadium", city: "Manchester" }
  },
  {
    id: "9002",
    date: "2026-03-16T16:30:00.000Z",
    roundNumber: 29,
    status: { short: "LIVE", long: "ถ่ายทอดสด", elapsed: 64, isLive: true, isFinished: false, isUpcoming: false },
    teams: {
      home: { id: "42", name: "อาร์เซนอล", nameEn: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png", winner: null },
      away: { id: "49", name: "เชลซี", nameEn: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png", winner: null }
    },
    goals: { home: 2, away: 1 },
    league: { id: "39", name: "พรีเมียร์ลีก", round: "นัดที่ 29" },
    venue: { name: "Emirates Stadium", city: "London" }
  },
  {
    id: "9003",
    date: "2026-03-12T20:00:00.000Z",
    roundNumber: 28,
    status: { short: "FT", long: "จบการแข่งขัน", elapsed: 90, isLive: false, isFinished: true, isUpcoming: false },
    teams: {
      home: { id: "33", name: "แมนเชสเตอร์ ยูไนเต็ด", nameEn: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png", winner: false },
      away: { id: "47", name: "ท็อตแนม ฮ็อตสเปอร์", nameEn: "Tottenham", logo: "https://media.api-sports.io/football/teams/47.png", winner: true }
    },
    goals: { home: 1, away: 2 },
    league: { id: "39", name: "พรีเมียร์ลีก", round: "นัดที่ 28" },
    venue: { name: "Old Trafford", city: "Manchester" }
  },
  {
    id: "9004",
    date: "2026-03-10T18:30:00.000Z",
    roundNumber: 28,
    status: { short: "FT", long: "จบการแข่งขัน", elapsed: 90, isLive: false, isFinished: true, isUpcoming: false },
    teams: {
      home: { id: "40", name: "ลิเวอร์พูล", nameEn: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png", winner: true },
      away: { id: "49", name: "เชลซี", nameEn: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png", winner: false }
    },
    goals: { home: 3, away: 1 },
    league: { id: "39", name: "พรีเมียร์ลีก", round: "นัดที่ 28" },
    venue: { name: "Anfield", city: "Liverpool" }
  }
]

const lineupsByFixture = {
  "9002": {
    home: {
      formation: "4-3-3",
      coach: "Mikel Arteta",
      players: ["David Raya", "Ben White", "William Saliba", "Gabriel", "Oleksandr Zinchenko", "Declan Rice", "Martin Odegaard", "Kai Havertz", "Bukayo Saka", "Gabriel Jesus", "Leandro Trossard"]
    },
    away: {
      formation: "4-2-3-1",
      coach: "Enzo Maresca",
      players: ["Robert Sanchez", "Reece James", "Axel Disasi", "Levi Colwill", "Ben Chilwell", "Moises Caicedo", "Enzo Fernandez", "Cole Palmer", "Christopher Nkunku", "Raheem Sterling", "Nicolas Jackson"]
    }
  },
  "9001": {
    home: {
      formation: "4-1-4-1",
      coach: "Pep Guardiola",
      players: ["Ederson", "Kyle Walker", "Ruben Dias", "Josko Gvardiol", "Nathan Ake", "Rodri", "Bernardo Silva", "Kevin De Bruyne", "Phil Foden", "Jeremy Doku", "Erling Haaland"]
    },
    away: {
      formation: "4-3-3",
      coach: "Arne Slot",
      players: ["Alisson", "Trent Alexander-Arnold", "Ibrahima Konate", "Virgil van Dijk", "Andy Robertson", "Alexis Mac Allister", "Dominik Szoboszlai", "Curtis Jones", "Mohamed Salah", "Darwin Nunez", "Luis Diaz"]
    }
  }
}

const eventsByFixture = {
  "9002": [
    { minute: 11, type: "goal", team: "home", player: "Bukayo Saka", detail: "ยิงไกลด้วยเท้าซ้าย" },
    { minute: 36, type: "yellow", team: "away", player: "Moises Caicedo", detail: "ตัดฟาวล์กลางสนาม" },
    { minute: 48, type: "goal", team: "home", player: "Kai Havertz", detail: "ชาร์จหน้าประตู" },
    { minute: 59, type: "goal", team: "away", player: "Cole Palmer", detail: "จุดโทษ" }
  ],
  "9003": [
    { minute: 17, type: "goal", team: "away", player: "Heung-Min Son", detail: "หลุดเดี่ยว" },
    { minute: 53, type: "goal", team: "home", player: "Bruno Fernandes", detail: "ฟรีคิก" },
    { minute: 82, type: "goal", team: "away", player: "Dejan Kulusevski", detail: "ยิงแฉลบ" }
  ]
}

const injuries = [
  { id: "inj-1", playerId: "18", playerName: "Bukayo Saka", teamId: "42", teamName: "อาร์เซนอล", status: "เช็กความฟิต", type: "Hamstring", expectedReturn: "2026-03-22" },
  { id: "inj-2", playerId: "174", playerName: "Bruno Fernandes", teamId: "33", teamName: "แมนเชสเตอร์ ยูไนเต็ด", status: "พัก 1 สัปดาห์", type: "Ankle", expectedReturn: "2026-03-21" },
  { id: "inj-3", playerId: "1100", playerName: "Erling Haaland", teamId: "50", teamName: "แมนเชสเตอร์ ซิตี้", status: "พร้อมลงสนาม", type: "Recovered", expectedReturn: "2026-03-16" }
]

const suspensions = [
  { id: "sus-1", playerId: "20574", playerName: "Cole Palmer", teamId: "49", teamName: "เชลซี", reason: "ครบใบเหลืองสะสม", matches: 1 },
  { id: "sus-2", playerId: "3001", playerName: "Cristian Romero", teamId: "47", teamName: "ท็อตแนม ฮ็อตสเปอร์", reason: "ใบแดงโดยตรง", matches: 2 }
]

const transfers = [
  { id: "tr-1", playerId: "20574", playerName: "Cole Palmer", fromTeam: "แมนเชสเตอร์ ซิตี้", toTeam: "เชลซี", fee: "EUR 47m", date: "2023-09-01", type: "completed" },
  { id: "tr-2", playerId: "5001", playerName: "Joao Neves", fromTeam: "เบนฟิกา", toTeam: "แมนเชสเตอร์ ยูไนเต็ด", fee: "Talks ongoing", date: "2026-03-10", type: "rumor" },
  { id: "tr-3", playerId: "5002", playerName: "Pedro Neto", fromTeam: "วูล์ฟแฮมป์ตัน", toTeam: "ลิเวอร์พูล", fee: "Monitoring", date: "2026-03-08", type: "rumor" }
]

const fixturePredictions = {
  "9001": {
    winner: { name: "Manchester City", comment: "เจ้าบ้านดูเหนือกว่าจากฟอร์มและคุณภาพเกมรุก" },
    win_or_draw: true,
    under_over: "Over 2.5",
    goals: { home: "45%", away: "31%" },
    advice: "แมนเชสเตอร์ ซิตี้ มีโอกาสเก็บสามแต้ม แต่ลิเวอร์พูลมีสิทธิ์ยิงคืน",
    percent: { home: "55%", draw: "25%", away: "20%" }
  },
  "9002": {
    winner: { name: "Arsenal", comment: "อาร์เซนอลครองเกมได้ต่อเนื่อง" },
    win_or_draw: true,
    under_over: "Over 2.5",
    goals: { home: "58%", away: "21%" },
    advice: "เกมเปิดและมีโอกาสจบด้วยสกอร์สูง",
    percent: { home: "52%", draw: "24%", away: "24%" }
  }
}

function findTeam(teamId) {
  return teams.find((team) => team.id === String(teamId))
}

function formatStandingRow(row) {
  const team = findTeam(row.teamId)
  return {
    rank: row.rank,
    team: {
      id: team.id,
      name: team.name,
      nameEn: team.nameEn,
      logo: team.logo
    },
    points: row.points,
    goalsDiff: row.goalsDiff,
    form: row.form,
    all: {
      played: row.played,
      win: row.win,
      draw: row.draw,
      lose: row.lose,
      goals: {
        for: row.goalsFor,
        against: row.goalsAgainst
      }
    }
  }
}

function getMockStandings() {
  return standings.map(formatStandingRow)
}

function getMockTeams() {
  return teams
}

function getMockFixtures({ type = "all", round, limit } = {}) {
  let items = [...fixtures]
  if (round) items = items.filter((item) => item.roundNumber === Number(round))
  if (type === "upcoming") items = items.filter((item) => item.status.isUpcoming || item.status.isLive)
  if (type === "live") items = items.filter((item) => item.status.isLive)
  if (type === "finished") items = items.filter((item) => item.status.isFinished)
  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return limit ? items.slice(0, Number(limit)) : items
}

function getMockTopScorers() {
  return [...players]
    .sort((a, b) => b.goals - a.goals)
    .map((player, index) => ({
      rank: index + 1,
      id: player.id,
      name: player.name,
      photo: player.photo,
      nationality: player.nationality,
      goals: player.goals,
      teamName: player.teamName,
      teamNameThai: player.teamNameThai,
      teamLogo: player.teamLogo
    }))
}

function getMockTopAssists() {
  return [...players]
    .sort((a, b) => b.assists - a.assists)
    .map((player, index) => ({
      rank: index + 1,
      id: player.id,
      name: player.name,
      photo: player.photo,
      nationality: player.nationality,
      assists: player.assists,
      teamName: player.teamName,
      teamNameThai: player.teamNameThai,
      teamLogo: player.teamLogo
    }))
}

function getMockPlayerStatsSummary() {
  const toStatList = (selector) =>
    [...players]
      .sort((a, b) => selector(b) - selector(a))
      .map((player) => ({
        id: player.id,
        name: player.name,
        photo: player.photo,
        team: player.teamNameThai,
        teamLogo: player.teamLogo,
        value: selector(player)
      }))

  return {
    goals: toStatList((player) => player.goals),
    assists: toStatList((player) => player.assists),
    shots: toStatList((player) => player.shots),
    yellowCards: toStatList((player) => player.yellowCards),
    penalties: toStatList((player) => player.penalties),
    appearances: toStatList((player) => player.appearances)
  }
}

function getMockCleanSheets() {
  return [
    { teamId: "50", teamName: "แมนเชสเตอร์ ซิตี้", teamLogo: "https://media.api-sports.io/football/teams/50.png", cleanSheets: 12 },
    { teamId: "40", teamName: "ลิเวอร์พูล", teamLogo: "https://media.api-sports.io/football/teams/40.png", cleanSheets: 11 },
    { teamId: "42", teamName: "อาร์เซนอล", teamLogo: "https://media.api-sports.io/football/teams/42.png", cleanSheets: 10 },
    { teamId: "49", teamName: "เชลซี", teamLogo: "https://media.api-sports.io/football/teams/49.png", cleanSheets: 9 }
  ]
}

function getMockPlayerDetails(playerId) {
  const player = players.find((item) => item.id === String(playerId))
  if (!player) return null

  return {
    data: {
      id: player.id,
      name: player.name,
      firstname: player.name.split(" ")[0],
      lastname: player.name.split(" ").slice(1).join(" "),
      image_path: player.photo,
      nationality: player.nationality,
      height: player.height,
      weight: player.weight,
      age: player.age,
      birth: player.birth,
      position: player.position,
      teams: [
        {
          id: player.teamId,
          name: player.teamNameThai,
          nameEn: player.teamName,
          logo: player.teamLogo
        }
      ],
      statistics: {
        team: { id: player.teamId, name: player.teamName, logo: player.teamLogo },
        games: { appearences: player.appearances, position: player.position, rating: player.rating },
        goals: { total: player.goals, assists: player.assists },
        shots: { total: player.shots },
        cards: { yellow: player.yellowCards },
        penalty: { scored: player.penalties }
      },
      transfers: player.transfers
    },
    source: "mock"
  }
}

function getMockFixturePrediction(fixtureId) {
  return fixturePredictions[String(fixtureId)] || null
}

function getMockLineups(fixtureId) {
  return lineupsByFixture[String(fixtureId)] || null
}

function getMockEvents(fixtureId) {
  return eventsByFixture[String(fixtureId)] || []
}

function getMockInjuries() {
  return injuries
}

function getMockSuspensions() {
  return suspensions
}

function getMockTransfers() {
  return transfers
}

module.exports = {
  getMockCleanSheets,
  getMockEvents,
  getMockFixturePrediction,
  getMockFixtures,
  getMockInjuries,
  getMockLineups,
  getMockPlayerDetails,
  getMockPlayerStatsSummary,
  getMockStandings,
  getMockSuspensions,
  getMockTeams,
  getMockTopAssists,
  getMockTopScorers,
  getMockTransfers
}
