import crypto from "crypto"
import jwt from "jsonwebtoken"

import { signToken, sanitizeUser } from "./auth"
import { User } from "./models"

type SupportedProvider = "google" | "facebook"

type ProviderProfile = {
  email: string
  name: string
  avatar: string
  providerId: string
}

const PROVIDERS: Record<
  SupportedProvider,
  {
    clientIdEnv: string
    clientSecretEnv: string
  }
> = {
  google: {
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  },
  facebook: {
    clientIdEnv: "FACEBOOK_CLIENT_ID",
    clientSecretEnv: "FACEBOOK_CLIENT_SECRET",
  },
}

export function isSupportedProvider(value: string): value is SupportedProvider {
  return value === "google" || value === "facebook"
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not configured")
  }
  return secret
}

function getProviderConfig(provider: SupportedProvider) {
  const config = PROVIDERS[provider]
  const clientId = process.env[config.clientIdEnv]?.trim()
  const clientSecret = process.env[config.clientSecretEnv]?.trim()

  if (!clientId || !clientSecret) {
    throw new Error(`${provider.toUpperCase()} OAuth is not configured`)
  }

  return { clientId, clientSecret }
}

export function getAppBaseUrl(origin?: string) {
  return (process.env.NEXT_PUBLIC_APP_URL || origin || "http://localhost:3000").replace(/\/$/, "")
}

export function createOauthState(provider: SupportedProvider) {
  return jwt.sign({ provider, nonce: crypto.randomBytes(8).toString("hex") }, getJwtSecret(), {
    expiresIn: "10m",
  })
}

export function verifyOauthState(provider: SupportedProvider, state: string) {
  try {
    const payload = jwt.verify(state, getJwtSecret()) as { provider?: string }
    return payload.provider === provider
  } catch {
    return false
  }
}

export function getOauthStartUrl(provider: SupportedProvider, origin?: string) {
  const { clientId } = getProviderConfig(provider)
  const baseUrl = getAppBaseUrl(origin)
  const redirectUri = `${baseUrl}/api/auth/oauth/${provider}/callback`
  const state = createOauthState(provider)

  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
      state,
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "email,public_profile",
    state,
  })

  return `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`
}

async function getGoogleProfile(code: string, origin?: string): Promise<ProviderProfile> {
  const { clientId, clientSecret } = getProviderConfig("google")
  const redirectUri = `${getAppBaseUrl(origin)}/api/auth/oauth/google/callback`

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error("Google token exchange failed")
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string }
  if (!tokenData.access_token) {
    throw new Error("Google access token is missing")
  }

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  if (!profileResponse.ok) {
    throw new Error("Google profile fetch failed")
  }

  const profile = (await profileResponse.json()) as {
    sub?: string
    email?: string
    name?: string
    picture?: string
  }

  if (!profile.sub || !profile.email) {
    throw new Error("Google account does not provide a valid email")
  }

  return {
    email: profile.email.toLowerCase(),
    name: profile.name?.trim() || profile.email.split("@")[0],
    avatar: profile.picture || "",
    providerId: profile.sub,
  }
}

async function getFacebookProfile(code: string, origin?: string): Promise<ProviderProfile> {
  const { clientId, clientSecret } = getProviderConfig("facebook")
  const redirectUri = `${getAppBaseUrl(origin)}/api/auth/oauth/facebook/callback`

  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  })

  const tokenResponse = await fetch(`https://graph.facebook.com/v23.0/oauth/access_token?${tokenParams.toString()}`)

  if (!tokenResponse.ok) {
    throw new Error("Facebook token exchange failed")
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string }
  if (!tokenData.access_token) {
    throw new Error("Facebook access token is missing")
  }

  const profileParams = new URLSearchParams({
    fields: "id,name,email,picture.type(large)",
    access_token: tokenData.access_token,
  })

  const profileResponse = await fetch(`https://graph.facebook.com/me?${profileParams.toString()}`)

  if (!profileResponse.ok) {
    throw new Error("Facebook profile fetch failed")
  }

  const profile = (await profileResponse.json()) as {
    id?: string
    name?: string
    email?: string
    picture?: { data?: { url?: string } }
  }

  if (!profile.id || !profile.email) {
    throw new Error("Facebook account does not provide a valid email")
  }

  return {
    email: profile.email.toLowerCase(),
    name: profile.name?.trim() || profile.email.split("@")[0],
    avatar: profile.picture?.data?.url || "",
    providerId: profile.id,
  }
}

export async function getOauthProfile(provider: SupportedProvider, code: string, origin?: string) {
  if (provider === "google") return getGoogleProfile(code, origin)
  return getFacebookProfile(code, origin)
}

export async function getOrCreateOauthSession(provider: SupportedProvider, profile: ProviderProfile) {
  const providerField = provider === "google" ? "googleId" : "facebookId"
  let user = await User.findOne({ [providerField]: profile.providerId })

  if (!user) {
    user = await User.findOne({ email: profile.email })
  }

  if (!user) {
    user = await User.create({
      name: profile.name,
      email: profile.email,
      password: crypto.randomBytes(24).toString("hex"),
      avatar: profile.avatar,
      [providerField]: profile.providerId,
    })
  } else {
    user[providerField] = profile.providerId
    if (!user.avatar && profile.avatar) user.avatar = profile.avatar
    if (!user.name && profile.name) user.name = profile.name
    await user.save()
  }

  return {
    token: signToken({ sub: user._id.toString(), role: user.role }),
    user: sanitizeUser(user),
  }
}
