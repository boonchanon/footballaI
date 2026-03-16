import crypto from "crypto"
import jwt from "jsonwebtoken"

import { signToken, sanitizeUser } from "./auth"
import { User } from "./models"

type SupportedProvider = "google" | "github"

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
  github: {
    clientIdEnv: "GITHUB_CLIENT_ID",
    clientSecretEnv: "GITHUB_CLIENT_SECRET",
  },
}

export function isSupportedProvider(value: string): value is SupportedProvider {
  return value === "google" || value === "github"
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
    scope: "read:user user:email",
    state,
  })

  return `https://github.com/login/oauth/authorize?${params.toString()}`
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

async function getGithubProfile(code: string, origin?: string): Promise<ProviderProfile> {
  const { clientId, clientSecret } = getProviderConfig("github")
  const redirectUri = `${getAppBaseUrl(origin)}/api/auth/oauth/github/callback`

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error("GitHub token exchange failed")
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string }
  if (!tokenData.access_token) {
    throw new Error("GitHub access token is missing")
  }

  const [profileResponse, emailsResponse] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
      },
    }),
    fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
      },
    }),
  ])

  if (!profileResponse.ok || !emailsResponse.ok) {
    throw new Error("GitHub profile fetch failed")
  }

  const profile = (await profileResponse.json()) as {
    id?: number
    name?: string
    login?: string
    avatar_url?: string
  }
  const emails = (await emailsResponse.json()) as Array<{
    email?: string
    primary?: boolean
    verified?: boolean
  }>

  const primaryEmail = emails.find((entry) => entry.primary && entry.verified)?.email || emails.find((entry) => entry.verified)?.email

  if (!profile.id || !primaryEmail) {
    throw new Error("GitHub account does not provide a verified email")
  }

  return {
    email: primaryEmail.toLowerCase(),
    name: profile.name?.trim() || profile.login || primaryEmail.split("@")[0],
    avatar: profile.avatar_url || "",
    providerId: String(profile.id),
  }
}

export async function getOauthProfile(provider: SupportedProvider, code: string, origin?: string) {
  if (provider === "google") return getGoogleProfile(code, origin)
  return getGithubProfile(code, origin)
}

export async function getOrCreateOauthSession(provider: SupportedProvider, profile: ProviderProfile) {
  const providerField = provider === "google" ? "googleId" : "githubId"
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
