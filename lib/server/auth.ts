import jwt from "jsonwebtoken"
import { NextRequest } from "next/server"

import { type AdminRole, isAdminRole } from "@/lib/admin-access"

import { connectDatabase } from "./db"
import { Admin, User } from "./models"

export type AuthUser = {
  _id: { toString(): string }
  id?: string
  name: string
  email: string
  phone?: string
  avatar?: string
  coverImage?: string
  coverPositionX?: number
  coverPositionY?: number
  coverScale?: number
  favoriteTeam?: string
  bio?: string
  role?: string
  createdAt?: Date | string
  save?: () => Promise<unknown>
  comparePassword?: (password: string) => Promise<boolean>
}

export type AdminUser = {
  _id: { toString(): string }
  email: string
  role?: AdminRole | string
  permissions?: string[]
  isActive?: boolean
  comparePassword?: (password: string) => Promise<boolean>
}

export function signToken(payload: { sub: string; role?: string; type?: string }) {
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

export async function getAdminUser(request: NextRequest): Promise<AdminUser | null> {
  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) return null

  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not configured")
  }

  try {
    const payload = jwt.verify(token, secret) as { sub: string; type?: string }
    if (payload.type !== "admin") return null
    await connectDatabase()
    const admin = await Admin.findById(payload.sub)
    if (!admin || admin.isActive === false) return null
    return admin as AdminUser
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

export async function requireAdminUser(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) {
    throw new Error("Admin authentication required")
  }
  return admin
}

export async function requireAdminRoles(request: NextRequest, roles: AdminRole[]) {
  const admin = await requireAdminUser(request)
  if (!isAdminRole(admin.role) || !roles.includes(admin.role)) {
    throw new Error("Admin permission denied")
  }
  return admin
}

export function sanitizeUser(user: AuthUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    avatar: user.avatar || "",
    coverImage: user.coverImage || "",
    coverPositionX: typeof user.coverPositionX === "number" ? user.coverPositionX : 0,
    coverPositionY: typeof user.coverPositionY === "number" ? user.coverPositionY : 0,
    coverScale: typeof user.coverScale === "number" ? user.coverScale : 1,
    favoriteTeam: user.favoriteTeam || "",
    bio: user.bio || "",
    role: user.role || "user",
    createdAt: user.createdAt,
  }
}
