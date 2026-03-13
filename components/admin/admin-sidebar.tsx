"use client"

import React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
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
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface SubLink {
  title: string
  href: string
}

interface SidebarLink {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  subLinks?: SubLink[]
}

const sidebarLinks: SidebarLink[] = [
  {
    title: "แดชบอร์ด",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "ลีก",
    href: "/admin/leagues",
    icon: Globe,
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
  },
  {
    title: "AI ทำนายผล",
    href: "/admin/ai",
    icon: Brain,
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
    subLinks: [
      { title: "โพสต์ทั้งหมด", href: "/admin/community" },
      { title: "รายงาน", href: "/admin/community/reports" },
      { title: "คำต้องห้าม", href: "/admin/community/banned-words" },
      { title: "ตั้งค่า", href: "/admin/community/settings" },
    ],
  },
  {
    title: "ผู้ใช้งาน",
    href: "/admin/users",
    icon: Users,
    subLinks: [
      { title: "ผู้ใช้ทั้งหมด", href: "/admin/users" },
      { title: "บทบาท", href: "/admin/users/roles" },
    ],
  },
  {
    title: "ตั้งค่า",
    href: "/admin/settings",
    icon: Settings,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  const toggleMenu = (href: string) => {
    setExpandedMenus((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    )
  }

  const isMenuExpanded = (href: string) => expandedMenus.includes(href)

  return (
    <>
      {/* Mobile overlay */}
      <div className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40 hidden" />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-card border-r border-border transition-all duration-300",
          collapsed ? "w-16" : "w-72",
          "hidden lg:block"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-bold text-lg">แผงควบคุม</span>
            </Link>
          )}
          {collapsed && <Shield className="h-8 w-8 text-primary mx-auto" />}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("h-8 w-8", collapsed && "mx-auto")}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {sidebarLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href))
            const hasSubLinks = link.subLinks && link.subLinks.length > 0
            const isExpanded = isMenuExpanded(link.href)

            return (
              <div key={link.href}>
                {hasSubLinks ? (
                  <>
                    <button
                      onClick={() => toggleMenu(link.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <link.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{link.title}</span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
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
                                "block px-3 py-2 rounded-lg text-sm transition-colors",
                                isSubActive
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <link.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{link.title}</span>}
                  </Link>
                )}
              </div>
            )
          })}
        </nav>

        {/* Back to site */}
        <div className="absolute bottom-4 left-0 right-0 px-2">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
              collapsed && "justify-center px-2"
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
