import { NextRequest, NextResponse } from "next/server"

import { getOauthStartUrl, isSupportedProvider } from "@/lib/server/oauth"

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params

  if (!isSupportedProvider(provider)) {
    return NextResponse.json({ error: "Unsupported OAuth provider" }, { status: 404 })
  }

  try {
    return NextResponse.redirect(getOauthStartUrl(provider, request.nextUrl.origin))
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth start failed"
    return NextResponse.redirect(new URL(`/login?oauthError=${encodeURIComponent(message)}`, request.nextUrl.origin))
  }
}
