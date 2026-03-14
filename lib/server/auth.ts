import jwt from "jsonwebtoken"
import { NextRequest } from "next/server"

import { connectDatabase } from "./db"
import { User } from "./models"

export type AuthUser = {
  _id: { toString(): string }
  id?: string
  name: string
  email: string
  avatar?: string
  favoriteTeam?: string
  bio?: string
  role?: string
  createdAt?: Date | string
  save?: () => Promise<unknown>
  comparePassword?: (password: string) => Promise<boolean>
}

export function signToken(payload: { sub: string; role?: string }) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not configured")
  }

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  })
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) return null

  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not configured")
  }

  try {
    const payload = jwt.verify(token, secret) as { sub: string }
    await connectDatabase()
    const user = await User.findById(payload.sub)
    if (!user) return null
    return user as AuthUser
  } catch {
    return null
  }
}

export async function requireAuthUser(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    throw new Error("Authentication required")
  }
  return user
}

export function sanitizeUser(user: AuthUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar || "",
    favoriteTeam: user.favoriteTeam || "",
    bio: user.bio || "",
    role: user.role || "user",
    createdAt: user.createdAt,
  }
}
