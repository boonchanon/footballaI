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
    name: "ซื้อ 5 คู่",
    description: "ปลดล็อกผลทำนายได้ 5 แมตช์ เลือกใช้กับคู่ที่อยากดูจริง",
    price: 5,
    targetType: "credits",
    credits: 5,
  },
  {
    code: "prediction_15_matches",
    name: "ซื้อ 15 คู่",
    description: "ปลดล็อกผลทำนายได้ 15 แมตช์ เหมาะกับการติดตามหลายคู่ต่อเนื่อง",
    price: 5,
    targetType: "credits",
    credits: 15,
  },
  {
    code: "prediction_tournament",
    name: "ซื้อทั้งทัวร์",
    description: "ปลดล็อกผลทำนายทุกคู่ของ World Cup 2026 ในแพ็กเดียว",
    price: 5,
    targetType: "daypass",
    credits: null,
  },
]

export function getPredictionAccessProduct(code: string) {
  return PREDICTION_ACCESS_PRODUCTS.find((item) => item.code === code) || null
}
