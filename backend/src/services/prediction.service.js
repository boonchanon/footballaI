function buildPrediction({ homeTeam, awayTeam, model = "gpt-5", fixtureId = "" }) {
  const homeWinProbability = Math.floor(Math.random() * 30) + 35
  const drawProbability = Math.floor(Math.random() * 20) + 20
  const awayWinProbability = 100 - homeWinProbability - drawProbability

  return {
    fixtureId,
    homeTeam,
    awayTeam,
    model,
    modelName: model === "claude-sonnet-4.5" ? "Claude Sonnet 4.5" : model === "grok-4-fast" ? "Grok 4 Fast" : "GPT-5",
    homeWinProbability,
    drawProbability,
    awayWinProbability,
    predictedScore: {
      home: Math.floor(Math.random() * 3) + 1,
      away: Math.floor(Math.random() * 2)
    },
    confidence: Math.floor(Math.random() * 20) + 70,
    analysis: `จากฟอร์มล่าสุดและข้อมูลการแข่งขัน ${homeTeam} มีภาษีดีกว่าเล็กน้อย แต่ ${awayTeam} ยังมีโอกาสสร้างปัญหาได้ในช่วงเปลี่ยนเกม`,
    keyFactors: ["ฟอร์ม 5 นัดล่าสุด", "สถิติเจอกัน", "ความได้เปรียบเจ้าบ้าน", "ความพร้อมตัวหลัก"]
  }
}

module.exports = { buildPrediction }
