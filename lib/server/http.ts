import { NextResponse } from "next/server"

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function errorResponse(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      error: message,
      ...(typeof details === "undefined" ? {} : { details }),
    },
    { status },
  )
}

export function getTimeAgoThai(value: string | number | Date) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))

  if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays} วันที่แล้ว`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} เดือนที่แล้ว`
  return `${Math.floor(diffMonths / 12)} ปีที่แล้ว`
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}
