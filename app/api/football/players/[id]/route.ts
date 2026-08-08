import { NextResponse } from "next/server"

import { footballService } from "../../service"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const season = searchParams.get("season") || undefined
    const data = await footballService.getPlayerDetails(id, { season })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        source: "error",
        error: error instanceof Error ? error.message : "Failed to fetch player",
      },
      { status: 500 },
    )
  }
}
