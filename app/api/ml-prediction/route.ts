import { NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { homeTeam, awayTeam, model } = await req.json()

    const modelMap: Record<string, { name: string; description: string }> = {
      svm: { name: "Support Vector Machine (SVM)", description: "SVM Classifier with RBF kernel" },
      "random-forest": { name: "Random Forest", description: "Ensemble of 100 decision trees" },
      xgboost: { name: "XGBoost", description: "Gradient Boosting with optimized parameters" },
      "neural-network": { name: "Neural Network", description: "Deep Learning with 3 hidden layers" },
      ensemble: { name: "Ensemble Model", description: "Combined prediction from all models" },
    }

    const selectedModel = modelMap[model] || modelMap.ensemble

    // Generate mock ML prediction
    const homeWin = Math.floor(Math.random() * 25) + 40 // 40-65%
    const draw = Math.floor(Math.random() * 15) + 20 // 20-35%
    const awayWin = 100 - homeWin - draw

    const predictionData = {
      homeWinProbability: homeWin,
      drawProbability: draw,
      awayWinProbability: awayWin,
      predictedScore: {
        home: Math.floor(Math.random() * 3) + 1,
        away: Math.floor(Math.random() * 2),
      },
      confidence: Math.floor(Math.random() * 10) + 85, // 85-95%
      analysis: `โมเดล ${selectedModel.name} วิเคราะห์จากฟีเจอร์ต่างๆ เช่น ฟอร์มล่าสุด 5 นัด, สถิติ Head-to-Head, Expected Goals (xG) และ Home Advantage Factor พบว่า ${homeTeam} มี feature importance สูงในด้านการเล่นเกมรุก โดยมีค่า xG เฉลี่ยสูงกว่า ${awayTeam} ในช่วง 10 นัดหลัง`,
      keyFactors: [
        "ฟอร์มล่าสุด 5 นัด (Win Rate)",
        "Expected Goals (xG) เฉลี่ย",
        "Home Advantage Factor",
        "Head-to-Head Statistics",
        "ระดับผู้เล่นคีย์ (Rating)",
        "Defensive Strength Index",
      ],
    }

    return NextResponse.json({
      homeTeam,
      awayTeam,
      modelName: selectedModel.name,
      ...predictionData,
    })
  } catch (error) {
    console.error("ML Prediction error:", error)
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการทำนาย" }, { status: 500 })
  }
}
