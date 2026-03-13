const teamNamesThai = {
  "Manchester City": "แมนเชสเตอร์ ซิตี้",
  Arsenal: "อาร์เซนอล",
  Liverpool: "ลิเวอร์พูล",
  "Aston Villa": "แอสตัน วิลล่า",
  "Tottenham Hotspur": "ท็อตแนม ฮอตสเปอร์",
  Tottenham: "ท็อตแนม ฮอตสเปอร์",
  Chelsea: "เชลซี",
  "Newcastle United": "นิวคาสเซิล ยูไนเต็ด",
  Newcastle: "นิวคาสเซิล ยูไนเต็ด",
  "Manchester United": "แมนเชสเตอร์ ยูไนเต็ด",
  "West Ham United": "เวสต์แฮม ยูไนเต็ด",
  "West Ham": "เวสต์แฮม ยูไนเต็ด",
  "Crystal Palace": "คริสตัล พาเลซ",
  "Brighton & Hove Albion": "ไบรท์ตัน",
  Brighton: "ไบรท์ตัน",
  "AFC Bournemouth": "บอร์นมัธ",
  Bournemouth: "บอร์นมัธ",
  Fulham: "ฟูแล่ม",
  "Wolverhampton Wanderers": "วูล์ฟแฮมป์ตัน",
  Wolves: "วูล์ฟแฮมป์ตัน",
  Everton: "เอฟเวอร์ตัน",
  "Brentford FC": "เบรนท์ฟอร์ด",
  Brentford: "เบรนท์ฟอร์ด",
  "Nottingham Forest": "น็อตติงแฮม ฟอเรสต์",
  "Leicester City": "เลสเตอร์ ซิตี้",
  Leicester: "เลสเตอร์ ซิตี้",
  "Ipswich Town": "อิปสวิช ทาวน์",
  Ipswich: "อิปสวิช ทาวน์",
  Southampton: "เซาแธมป์ตัน"
}

function translateTeamName(name) {
  if (!name) return name
  if (teamNamesThai[name]) return teamNamesThai[name]

  for (const [key, value] of Object.entries(teamNamesThai)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  return name
}

function formatDateThai(dateString) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ""

  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
  const day = date.getDate()
  const month = thaiMonths[date.getMonth()]
  const year = date.getFullYear() + 543
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${day} ${month} ${year} ${hours}:${minutes} น.`
}

function getTimeAgoThai(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${Math.max(diffMins, 1)} นาทีที่แล้ว`
  if (diffHours < 24) return `${diffHours} ชม. ที่แล้ว`
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`

  return formatDateThai(dateString)
}

function translateStatus(stateId, stateName) {
  const statusMap = {
    1: { short: "NS", long: "ยังไม่เริ่ม" },
    2: { short: "LIVE", long: "กำลังแข่ง" },
    3: { short: "FT", long: "จบเกม" },
    4: { short: "AET", long: "จบหลังต่อเวลา" },
    5: { short: "PEN", long: "จบหลังดวลโทษ" },
    6: { short: "PST", long: "เลื่อนแข่ง" },
    7: { short: "CANC", long: "ยกเลิก" },
    8: { short: "ABD", long: "ยกเลิกกลางคัน" },
    9: { short: "AWD", long: "ตัดสินให้ชนะ" },
    10: { short: "WO", long: "ชนะโดยวอล์กโอเวอร์" },
    11: { short: "SUSP", long: "ถูกระงับ" },
    12: { short: "INT", long: "หยุดชั่วคราว" },
    13: { short: "1H", long: "ครึ่งแรก" },
    14: { short: "HT", long: "พักครึ่ง" },
    15: { short: "2H", long: "ครึ่งหลัง" },
    16: { short: "ET", long: "ต่อเวลา" },
    17: { short: "BT", long: "พัก" },
    18: { short: "P", long: "ดวลจุดโทษ" },
    21: { short: "TBD", long: "รอกำหนด" }
  }

  return statusMap[stateId] || { short: stateName || "UNK", long: stateName || "ไม่ทราบ" }
}

function normalizePagination(query) {
  const page = Math.max(Number(query.page || 1), 1)
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100)
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

module.exports = {
  formatDateThai,
  getTimeAgoThai,
  normalizePagination,
  translateStatus,
  translateTeamName
}
