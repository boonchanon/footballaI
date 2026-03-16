import { NextRequest, NextResponse } from "next/server"

import { connectDatabase } from "@/lib/server/db"
import { getOauthProfile, getOrCreateOauthSession, getAppBaseUrl, isSupportedProvider, verifyOauthState } from "@/lib/server/oauth"

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params
  const baseUrl = getAppBaseUrl(request.nextUrl.origin)

  if (!isSupportedProvider(provider)) {
    return NextResponse.redirect(`${baseUrl}/login?oauthError=Unsupported%20OAuth%20provider`)
  }

  const code = request.nextUrl.searchParams.get("code") || ""
  const state = request.nextUrl.searchParams.get("state") || ""
  const oauthError = request.nextUrl.searchParams.get("error") || ""

  if (oauthError) {
    return NextResponse.redirect(`${baseUrl}/login?oauthError=${encodeURIComponent(oauthError)}`)
  }

  if (!code || !state || !verifyOauthState(provider, state)) {
    return NextResponse.redirect(`${baseUrl}/login?oauthError=${encodeURIComponent("Invalid OAuth callback")}`)
  }

  try {
    await connectDatabase()
    const profile = await getOauthProfile(provider, code, request.nextUrl.origin)
    const session = await getOrCreateOauthSession(provider, profile)
    const encodedUser = encodeURIComponent(JSON.stringify(session.user))

    return NextResponse.redirect(`${baseUrl}/auth/complete?token=${encodeURIComponent(session.token)}&user=${encodedUser}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth login failed"
    return NextResponse.redirect(`${baseUrl}/login?oauthError=${encodeURIComponent(message)}`)
  }
}
