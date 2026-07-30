"use client"

import React, { useState } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  Shield,
  ChevronLeft,
  ChevronDown,
  Trophy,
  Globe,
  UserSquare2,
  Brain,
  MessageSquare,
  Activity,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useAuthSession } from "@/hooks/use-auth-session"
import { ADMIN_ROLE_LABELS, type AdminSection, canAccessAdminSection, isAdminRole } from "@/lib/admin-access"
import { Button } from "@/components/ui/button"

interface SubLink {
  title: string
  href: string
}

interface SidebarLink {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  section: AdminSection
  subLinks?: SubLink[]
}

const sidebarLinks: SidebarLink[] = [
  {
    title: "แดชบอร์ด",
    href: "/admin",
    icon: LayoutDashboard,
    section: "dashboard",
  },
  {
    title: "ลีก",
    href: "/admin/leagues",
    icon: Globe,
    section: "leagues",
    subLinks: [
      { title: "ลีกทั้งหมด", href: "/admin/leagues" },
      { title: "ฤดูกาล", href: "/admin/leagues/seasons" },
      { title: "ตารางคะแนน", href: "/admin/leagues/standings" },
    ],
  },
  {
    title: "แมตช์",
    href: "/admin/matches",
    icon: Calendar,
    section: "matches",
    subLinks: [
      { title: "แมตช์ทั้งหมด", href: "/admin/matches" },
      { title: "โปรแกรมแข่งขัน", href: "/admin/matches/fixtures" },
      { title: "ผลการแข่งขัน", href: "/admin/matches/results" },
      { title: "รายชื่อลงสนาม", href: "/admin/matches/lineups" },
    ],
  },
  {
    title: "ทีม",
    href: "/admin/teams",
    icon: Trophy,
    section: "teams",
    subLinks: [
      { title: "ทีมทั้งหมด", href: "/admin/teams" },
      { title: "รายชื่อนักเตะ", href: "/admin/teams/squads" },
      { title: "สถิติทีม", href: "/admin/teams/stats" },
    ],
  },
  {
    title: "นักเตะ",
    href: "/admin/players",
    icon: UserSquare2,
    section: "players",
    subLinks: [
      { title: "นักเตะทั้งหมด", href: "/admin/players" },
      { title: "สถิติ", href: "/admin/players/stats" },
      { title: "เปรียบเทียบ", href: "/admin/players/compare" },
      { title: "ซิงค์ข้อมูล", href: "/admin/players/sync" },
    ],
  },
  {
    title: "Heatmap",
    href: "/admin/heatmap",
    icon: Activity,
    section: "heatmap",
  },
  {
    title: "AI ทำนายผล",
    href: "/admin/ai",
    icon: Brain,
    section: "ai",
    subLinks: [
      { title: "ตั้งค่าโมเดล", href: "/admin/ai" },
      { title: "ประวัติ Training", href: "/admin/ai/training" },
      { title: "บันทึกการทำนาย", href: "/admin/ai/logs" },
    ],
  },
  {
    title: "คอมมูนิตี้",
    href: "/admin/community",
    icon: MessageSquare,
    section: "community",
    subLinks: [
      { title: "โพสต์ทั้งหมด", href: "/admin/community" },
      { title: "Moderation Queue", href: "/admin/community/moderation" },
      { title: "รายงาน", href: "/admin/community/reports" },
      { title: "คำต้องห้าม", href: "/admin/community/banned-words" },
      { title: "ตั้งค่า", href: "/admin/community/settings" },
    ],
  },
  {
    title: "ผู้ใช้งาน",
    href: "/admin/users",
    icon: Users,
    section: "users",
    subLinks: [
      { title: "ผู้ใช้ทั้งหมด", href: "/admin/users" },
      { title: "บทบาท", href: "/admin/users/roles" },
    ],
  },
  {
    title: "ตั้งค่า",
    href: "/admin/settings",
    icon: Settings,
    section: "settings",
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { user } = useAuthSession()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const role = isAdminRole(user?.role) ? user.role : null

  const toggleMenu = (href: string) => {
    setExpandedMenus((prev) => (prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]))
  }

  const isMenuExpanded = (href: string) => expandedMenus.includes(href)
  const visibleLinks = sidebarLinks.filter((link) => canAccessAdminSection(role, link.section))

  return (
    <>
      <div className="fixed inset-0 z-40 hidden bg-background/80 backdrop-blur-sm lg:hidden" />

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen border-r border-border bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-72",
          "hidden lg:block",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <Link href="/admin" className="flex min-w-0 items-center gap-2">
              <Shield className="h-8 w-8 shrink-0 text-primary" />
              <div className="min-w-0">
                <span className="block truncate text-lg font-bold">แผงควบคุม</span>
                {role ? <span className="block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{ADMIN_ROLE_LABELS[role]}</span> : null}
              </div>
            </Link>
          )}
          {collapsed && <Shield className="mx-auto h-8 w-8 text-primary" />}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className={cn("h-8 w-8", collapsed && "mx-auto")}>
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>

        <nav className="h-[calc(100vh-8rem)] space-y-1 overflow-y-auto p-2">
          {visibleLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href))
            const hasSubLinks = Boolean(link.subLinks?.length)
            const isExpanded = isMenuExpanded(link.href) || isActive

            return (
              <div key={link.href}>
                {hasSubLinks ? (
                  <>
                    <button
                      onClick={() => toggleMenu(link.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        collapsed && "justify-center px-2",
                      )}
                    >
                      <link.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{link.title}</span>
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                        </>
                      )}
                    </button>

                    {!collapsed && isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-border pl-4">
                        {link.subLinks?.map((subLink) => {
                          const isSubActive = pathname === subLink.href
                          return (
                            <Link
                              key={subLink.href}
                              href={subLink.href}
                              className={cn(
                                "block rounded-lg px-3 py-2 text-sm transition-colors",
                                isSubActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                            >
                              {subLink.title}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      collapsed && "justify-center px-2",
                    )}
                  >
                    <link.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{link.title}</span>}
                  </Link>
                )}
              </div>
            )
          })}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-2">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <ChevronLeft className="h-5 w-5" />
            {!collapsed && <span>กลับหน้าหลัก</span>}
          </Link>
        </div>
      </aside>
    </>
  )
}
