export type PredictionAccessProductCode =
  | "prediction_5_matches"
  | "prediction_15_matches"
  | "prediction_tournament"

export type PredictionAccessTargetType = "credits" | "daypass"

export type PredictionAccessProduct = {
  code: PredictionAccessProductCode
  name: string
  description: string
  price: number
  targetType: PredictionAccessTargetType
  credits: number | null
}

export const PREDICTION_ACCESS_PRODUCTS: PredictionAccessProduct[] = [
  {
    code: "prediction_5_matches",
    name: "แพ็ก 5 เหรียญ",
    description: "รับ 5 เหรียญสำหรับปลดล็อกผลทำนาย เลือกใช้กับคู่ที่อยากดูจริง",
    price: 5,
    targetType: "credits",
    credits: 5,
  },
  {
    code: "prediction_15_matches",
    name: "แพ็ก 15 เหรียญ",
    description: "รับ 15 เหรียญสำหรับปลดล็อกผลทำนาย เหมาะกับคนที่ติดตามหลายคู่ต่อเนื่อง",
    price: 5,
    targetType: "credits",
    credits: 15,
  },
  {
    code: "prediction_tournament",
    name: "แพ็ก 40 เหรียญ",
    description: "รับ 40 เหรียญสำหรับปลดล็อกผลทำนาย เหมาะสำหรับคนที่ต้องการไว้ใช้ต่อเนื่องทั้งฤดูกาล",
    price: 5,
    targetType: "credits",
    credits: 40,
  },
]

export function getPredictionAccessProduct(code: string) {
  return PREDICTION_ACCESS_PRODUCTS.find((item) => item.code === code) || null
}
