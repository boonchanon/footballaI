import { NextRequest, NextResponse } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { PaymentEntitlement } from "@/lib/server/models"
import { findPremierLeaguePrediction } from "@/lib/server/premier-league-predictions"

function isEntitlementActive(item: any, now: Date) {
  if (!item?.active) return false
  if (!item?.expiresAt) return true
  return new Date(item.expiresAt).getTime() > now.getTime()
}

export async function POST(request: NextRequest) {
  let body: Record<string, any>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const fixtureId = String(body.fixtureId || "").trim()
  const fixtureDate = String(body.fixtureDate || "").trim()
  const homeTeam = String(body.homeTeam || "").trim()
  const awayTeam = String(body.awayTeam || "").trim()
  const homeName = String(body.homeName || "").trim()
  const awayName = String(body.awayName || "").trim()

  if (!fixtureId || !fixtureDate || !homeTeam || !awayTeam) {
    return NextResponse.json({ error: "Missing fixture payload" }, { status: 422 })
  }

  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const now = new Date()

    const entitlements = await PaymentEntitlement.find({
      user: user._id,
      active: true,
    }).sort({ createdAt: 1 })

    const fullAccess = entitlements.find(
      (item: any) =>
        item.targetId === "prediction-access" &&
        item.targetType === "daypass" &&
        isEntitlementActive(item, now),
    )

    let unlocked = Boolean(fullAccess)
    let creditEntitlementToConsume: any = null

    if (!unlocked) {
      for (const entitlement of entitlements) {
        if (entitlement.targetId !== "prediction-access") continue
        if (entitlement.targetType !== "credits" || !isEntitlementActive(entitlement, now)) continue

        const metadata = (entitlement.metadata || {}) as Record<string, any>
        const unlockedFixtureIds = Array.isArray(metadata.unlockedFixtureIds) ? metadata.unlockedFixtureIds.map(String) : []
        const remainingCredits = typeof metadata.remainingCredits === "number" ? metadata.remainingCredits : 0

        if (unlockedFixtureIds.includes(fixtureId)) {
          unlocked = true
          break
        }

        if (!creditEntitlementToConsume && remainingCredits > 0) {
          creditEntitlementToConsume = entitlement
        }
      }
    }

    if (!unlocked && !creditEntitlementToConsume) {
      return NextResponse.json(
        {
          error: "prediction_locked",
          message: "คู่นี้ยังถูกล็อกอยู่ ต้องซื้อเหรียญหรือแพ็กปลดล็อกก่อน",
        },
        { status: 403 },
      )
    }

    if (!unlocked && creditEntitlementToConsume) {
      const metadata = (creditEntitlementToConsume.metadata || {}) as Record<string, any>
      const unlockedFixtureIds = Array.isArray(metadata.unlockedFixtureIds) ? metadata.unlockedFixtureIds.map(String) : []
      const remainingCredits = typeof metadata.remainingCredits === "number" ? metadata.remainingCredits : 0

      creditEntitlementToConsume.metadata = {
        ...metadata,
        unlockedFixtureIds: [...new Set([...unlockedFixtureIds, fixtureId])],
        remainingCredits: Math.max(0, remainingCredits - 1),
      }
      await creditEntitlementToConsume.save()
    }

    const prediction = await findPremierLeaguePrediction({
      fixtureDate,
      homeTeam,
      awayTeam,
      homeName,
      awayName,
    })

    if (!prediction) {
      return NextResponse.json({ error: "prediction_not_found", message: "ไม่พบข้อมูลทำนายของคู่นี้" }, { status: 404 })
    }

    return NextResponse.json({ prediction })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required"
    return NextResponse.json(
      {
        error: message === "Authentication required" ? "authentication_required" : "request_failed",
        message: message === "Authentication required" ? "กรุณาเข้าสู่ระบบก่อนดูผลทำนาย" : message,
      },
      { status: message === "Authentication required" ? 401 : 500 },
    )
  }
}
