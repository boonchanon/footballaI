export const ADMIN_ROLES = ["superadmin", "admin", "admincommunity"] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]

export type AdminSection =
  | "dashboard"
  | "leagues"
  | "matches"
  | "teams"
  | "players"
  | "heatmap"
  | "ai"
  | "community"
  | "users"
  | "settings"

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  admincommunity: "Admin Community",
}

const ROLE_SECTIONS: Record<AdminRole, AdminSection[]> = {
  superadmin: ["dashboard", "leagues", "matches", "teams", "players", "heatmap", "ai", "community", "users", "settings"],
  admin: ["dashboard", "leagues", "matches", "teams", "players", "heatmap", "ai"],
  admincommunity: ["dashboard", "community"],
}

const SECTION_PREFIXES: Array<{ section: AdminSection; prefixes: string[] }> = [
  { section: "dashboard", prefixes: ["/admin"] },
  { section: "leagues", prefixes: ["/admin/leagues"] },
  { section: "matches", prefixes: ["/admin/matches"] },
  { section: "teams", prefixes: ["/admin/teams"] },
  { section: "players", prefixes: ["/admin/players"] },
  { section: "heatmap", prefixes: ["/admin/heatmap"] },
  { section: "ai", prefixes: ["/admin/ai"] },
  { section: "community", prefixes: ["/admin/community"] },
  { section: "users", prefixes: ["/admin/users"] },
  { section: "settings", prefixes: ["/admin/settings", "/admin/analytics", "/admin/news"] },
]

export function isAdminRole(role?: string | null): role is AdminRole {
  return Boolean(role && ADMIN_ROLES.includes(role as AdminRole))
}

export function getAdminSections(role?: string | null): AdminSection[] {
  if (!isAdminRole(role)) return []
  return ROLE_SECTIONS[role]
}

export function canAccessAdminSection(role: string | null | undefined, section: AdminSection) {
  return getAdminSections(role).includes(section)
}

export function getAdminSectionFromPath(pathname: string): AdminSection {
  if (pathname === "/admin") return "dashboard"

  const matched = SECTION_PREFIXES.find(({ section, prefixes }) => section !== "dashboard" && prefixes.some((prefix) => pathname.startsWith(prefix)))
  return matched?.section || "dashboard"
}

export function canAccessAdminPath(role: string | null | undefined, pathname: string) {
  return canAccessAdminSection(role, getAdminSectionFromPath(pathname))
}

export function getDefaultAdminRoute(role?: string | null) {
  if (role === "admincommunity") return "/admin/community"
  return "/admin"
}

export function canManageCommunityAdmin(role?: string | null) {
  return role === "superadmin" || role === "admincommunity"
}
