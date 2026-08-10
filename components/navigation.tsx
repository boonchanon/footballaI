"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Brain,
  BrainCircuit,
  Calendar,
  Flame,
  Gamepad2,
  Globe,
  Home,
  Image as ImageIcon,
  Menu,
  MessageSquare,
  Newspaper,
  Trophy,
  User,
  Users,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useSiteNavigationEnabled } from "@/components/site-navigation-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuthSession } from "@/hooks/use-auth-session"
import { cn } from "@/lib/utils"

interface NavigationProps {
  isLoggedIn?: boolean
  userName?: string
  variant?: "page" | "global"
}

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  isActive: (pathname: string, currentPathWithQuery: string) => boolean
}

function PanelNavLink({
  href,
  icon: Icon,
  label,
  active,
  closeOnClick = true,
  collapsedRail = false,
}: {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
  closeOnClick?: boolean
  collapsedRail?: boolean
}) {
  const content = (
    <Link
      href={href}
      title={collapsedRail ? label : undefined}
      aria-label={collapsedRail ? label : undefined}
      className={cn(
        "flex items-center gap-2 rounded-[10px] border px-2.5 py-2.5 text-[12px] font-medium transition-all",
        collapsedRail &&
          "h-11 justify-center overflow-hidden whitespace-nowrap px-0 group-hover/sidebar:justify-start group-hover/sidebar:px-2.5 group-focus-within/sidebar:justify-start group-focus-within/sidebar:px-2.5",
        active
          ? "border-primary/25 bg-primary/16 text-primary shadow-[0_8px_18px_rgba(184,255,0,0.1)]"
          : "border-white/[0.06] bg-white/[0.035] text-foreground/82 hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-foreground",
      )}
    >
      <span className={cn("flex shrink-0 items-center justify-center", collapsedRail && "h-5 w-5")}>
        <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
      </span>
      <span
        className={cn(
          "flex-1 truncate",
          collapsedRail &&
            "w-0 opacity-0 transition-[width,opacity] duration-200 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 group-focus-within/sidebar:w-auto group-focus-within/sidebar:opacity-100 motion-reduce:transition-none",
        )}
      >
        {label}
      </span>
    </Link>
  )

  if (!closeOnClick) return content

  return <SheetClose asChild>{content}</SheetClose>
}

function PanelSection({ title, children, collapsedRail = false }: { title: string; children: React.ReactNode; collapsedRail?: boolean }) {
  return (
    <section className="space-y-2">
      <p
        className={cn(
          "px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/65 transition-opacity duration-200",
          collapsedRail && "hidden group-hover/sidebar:block group-focus-within/sidebar:block",
        )}
      >
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export function Navigation({ isLoggedIn = false, userName, variant = "page" }: NavigationProps) {
  const pathname = usePathname()
  const session = useAuthSession()
  const globalNavigationEnabled = useSiteNavigationEnabled()
  const [mounted, setMounted] = useState(false)

  if (globalNavigationEnabled && variant !== "global") {
    return null
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    document.body.classList.add("has-app-sidebar")
    return () => {
      document.body.classList.remove("has-app-sidebar")
    }
  }, [])

  const resolvedIsLoggedIn = isLoggedIn || session.isLoggedIn
  const resolvedUserName = userName || session.user?.name
  const stableIsLoggedIn = mounted ? resolvedIsLoggedIn : isLoggedIn
  const stableUserName = mounted ? resolvedUserName : userName
  const stableAvatar = mounted ? session.user?.avatar : undefined
  const stableFavoriteTeam = mounted ? session.user?.favoriteTeam : undefined
  const currentPathWithQuery = mounted && typeof window !== "undefined" ? `${pathname}${window.location.search}` : pathname

  const navItems = useMemo<NavItem[]>(
    () => [
      { href: "/", label: "หน้าหลัก", icon: Home, isActive: (path) => path === "/" },
      { href: "/community/matches", label: "Match Hub", icon: Trophy, isActive: (path) => path.startsWith("/community/matches") },
      { href: "/community", label: "Community Feed", icon: Users, isActive: (path) => path === "/community" || path === "/community/my-posts" },
      { href: "/games", label: "Polls", icon: Gamepad2, isActive: (path) => path.startsWith("/games") },
      { href: "/community", label: "Stories", icon: ImageIcon, isActive: () => false },
      { href: "/news", label: "News", icon: Newspaper, isActive: (path) => path.startsWith("/news") },
      { href: "/matches", label: "โปรแกรมแข่ง", icon: Calendar, isActive: (_path, current) => current === "/matches" || current.startsWith("/matches?filter=") },
      { href: "/standings", label: "ตารางคะแนน", icon: BarChart3, isActive: (path) => path === "/standings" },
      { href: "/players", label: "นักเตะและทีม", icon: BrainCircuit, isActive: (path) => path.startsWith("/players") || path.startsWith("/teams") || path === "/clubs" },
      { href: "/heatmap", label: "Heat Map", icon: Flame, isActive: (path) => path === "/heatmap" },
      { href: "/worldcup-2026", label: "World Cup 2026", icon: Globe, isActive: (path) => path.startsWith("/worldcup-2026") },
      { href: "/ai-prediction", label: "AI Prediction", icon: Brain, isActive: (path) => path === "/ai-prediction" },
      { href: "/profile", label: "Profile", icon: User, isActive: (path) => path === "/profile" },
    ],
    [],
  )

  const primaryItems = navItems.slice(0, 7)
  const secondaryItems = navItems.slice(7, 12)
  const profileItem = navItems[12]
  const userInitial = (stableUserName || "F").charAt(0).toUpperCase()

  return (
    <>
      <aside className="group/sidebar fixed bottom-0 left-0 top-0 z-50 hidden w-[72px] overflow-hidden border-r border-white/[0.06] bg-[#091014]/96 transition-[width,box-shadow] duration-200 hover:w-[232px] hover:shadow-[18px_0_42px_rgba(0,0,0,0.26)] focus-within:w-[232px] focus-within:shadow-[18px_0_42px_rgba(0,0,0,0.26)] motion-reduce:transition-none xl:flex xl:flex-col">
        <div className="border-b border-white/[0.06] px-3 py-4">
          <Link href="/" className="flex min-w-0 items-center justify-center gap-2 group-hover/sidebar:justify-start group-focus-within/sidebar:justify-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-primary/25 bg-primary/10 text-primary shadow-[0_10px_24px_rgba(184,255,0,0.08)]">
              <span className="font-display text-sm leading-none">FA</span>
            </div>
            <div className="min-w-0 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none">
              <div className="truncate font-display text-[0.95rem] leading-none text-foreground">FootballAI</div>
              <p className="text-[8px] tracking-[0.1em] text-muted-foreground">MATCH INSIGHT PLATFORM</p>
            </div>
          </Link>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <PanelSection title="Main Menu" collapsedRail>
            {primaryItems.map((item) => (
              <PanelNavLink
                key={item.label}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={item.isActive(pathname, currentPathWithQuery)}
                closeOnClick={false}
                collapsedRail
              />
            ))}
          </PanelSection>

          <PanelSection title="Explore" collapsedRail>
            {secondaryItems.map((item) => (
              <PanelNavLink
                key={item.label}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={item.isActive(pathname, currentPathWithQuery)}
                closeOnClick={false}
                collapsedRail
              />
            ))}
          </PanelSection>

          <PanelSection title="Your Space" collapsedRail>
            <PanelNavLink
              href={profileItem.href}
              icon={profileItem.icon}
              label={profileItem.label}
              active={profileItem.isActive(pathname, currentPathWithQuery)}
              closeOnClick={false}
              collapsedRail
            />
          </PanelSection>
        </div>

        <div className="border-t border-white/[0.06] p-3">
          <div className="flex flex-col items-center gap-2 group-hover/sidebar:hidden group-focus-within/sidebar:hidden">
            <ThemeToggle compact />
            {stableIsLoggedIn ? (
              <Link href="/profile" title="Profile" aria-label="Profile" className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                <Avatar className="h-11 w-11 border border-primary/35">
                  <AvatarImage src={stableAvatar || "/placeholder-user.jpg"} />
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Link
                href="/login"
                title="เข้าสู่ระบบ"
                aria-label="เข้าสู่ระบบ"
                className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/[0.07] bg-white/[0.035] text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <User className="h-4 w-4" />
              </Link>
            )}
          </div>

          <div className="hidden overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0b1012]/92 p-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.2)] group-hover/sidebar:block group-focus-within/sidebar:block">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none">Your Profile</p>
              <ThemeToggle compact />
            </div>

            {stableIsLoggedIn ? (
              <>
                <div className="flex items-center gap-2">
                  <Avatar className="h-9 w-9 shrink-0 border border-primary/25">
                    <AvatarImage src={stableAvatar || "/placeholder-user.jpg"} />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none">
                    <p className="truncate text-[13px] font-semibold text-foreground">{stableUserName || "Football Fan"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">@{(stableUserName || "footballfan").replace(/\s+/g, "").toLowerCase()}</p>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none">
                  <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.04] px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Team</p>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">{stableFavoriteTeam || "ยังไม่ได้เลือก"}</p>
                  </div>
                  <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.04] px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                    <p className="mt-1 text-sm font-medium text-primary">พร้อมใช้งาน</p>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none">
                  <Link
                    href="/profile"
                    className="inline-flex items-center justify-center rounded-[10px] bg-primary px-2 py-2 text-[11.5px] font-semibold text-primary-foreground shadow-[0_8px_22px_rgba(184,255,0,0.18)] transition hover:bg-primary/90"
                  >
                    เปิดโปรไฟล์
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto rounded-[10px] border-white/[0.07] bg-white/[0.035] px-2 py-2 text-[11.5px]"
                    onClick={() => {
                      session.logout()
                      if (typeof window !== "undefined") window.location.href = "/"
                    }}
                  >
                    ออกจากระบบ
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border border-primary/20 bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none">
                    <p className="text-base font-semibold text-foreground">บัญชีผู้ใช้</p>
                    <p className="text-sm text-muted-foreground">เข้าสู่ระบบเพื่อใช้งานคอมมูนิตี้และโปรไฟล์</p>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-[10px] border border-white/[0.07] bg-white/[0.035] px-2 py-2 text-[11.5px] font-medium text-foreground transition hover:bg-white/[0.05]"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-[10px] bg-primary px-2 py-2 text-[11.5px] font-semibold text-primary-foreground shadow-[0_8px_22px_rgba(184,255,0,0.18)] transition hover:bg-primary/90"
                  >
                    สมัครสมาชิก
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      <nav className="sticky left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-[#0b1012]/94 backdrop-blur-xl xl:hidden">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-primary/20 bg-primary/10 text-primary">
                <span className="font-display text-lg leading-none">FA</span>
              </div>
              <div className="min-w-0">
                <div className="truncate font-display text-xl text-foreground">FootballAI</div>
                <p className="hidden text-[11px] tracking-[0.14em] text-muted-foreground sm:block">MATCH INSIGHT PLATFORM</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-11 rounded-[12px] border border-white/[0.06] bg-white/[0.035] px-4 text-foreground hover:bg-white/[0.05]">
                    <Menu className="mr-2 h-4 w-4 text-primary" />
                    เมนูทั้งหมด
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(92vw,420px)] border-white/[0.08] bg-[#091014] p-0 text-foreground">
                  <SheetHeader className="border-b border-white/[0.06] px-5 pb-4 pt-6 text-left">
                    <SheetTitle className="font-display text-2xl text-foreground">FootballAI</SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground">เมนูหลักของเว็บ พร้อมโปรไฟล์ในแผงเดียว</SheetDescription>
                  </SheetHeader>

                  <div className="flex h-full flex-col overflow-hidden">
                    <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                      <PanelSection title="Main Menu">
                        {primaryItems.map((item) => (
                          <PanelNavLink key={item.label} href={item.href} icon={item.icon} label={item.label} active={item.isActive(pathname, currentPathWithQuery)} />
                        ))}
                      </PanelSection>

                      <PanelSection title="Explore">
                        {secondaryItems.map((item) => (
                          <PanelNavLink key={item.label} href={item.href} icon={item.icon} label={item.label} active={item.isActive(pathname, currentPathWithQuery)} />
                        ))}
                      </PanelSection>

                      <PanelSection title="Your Space">
                        <PanelNavLink href={profileItem.href} icon={profileItem.icon} label={profileItem.label} active={profileItem.isActive(pathname, currentPathWithQuery)} />
                      </PanelSection>
                    </div>

                    <div className="border-t border-white/[0.06] p-5">
                      <div className="rounded-[18px] border border-white/[0.07] bg-[#0b1012]/92 p-4 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
                        {stableIsLoggedIn ? (
                          <>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-14 w-14 border border-primary/25">
                                <AvatarImage src={stableAvatar || "/placeholder-user.jpg"} />
                                <AvatarFallback>{userInitial}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-foreground">{stableUserName || "Football Fan"}</p>
                                <p className="truncate text-sm text-muted-foreground">@{(stableUserName || "footballfan").replace(/\s+/g, "").toLowerCase()}</p>
                              </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <SheetClose asChild>
                                <Link href="/profile" className="inline-flex items-center justify-center rounded-[12px] bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">เปิดโปรไฟล์</Link>
                              </SheetClose>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-[12px] border-white/[0.07] bg-white/[0.035]"
                                onClick={() => {
                                  session.logout()
                                  if (typeof window !== "undefined") window.location.href = "/"
                                }}
                              >
                                ออกจากระบบ
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <SheetClose asChild>
                              <Link href="/login" className="inline-flex items-center justify-center rounded-[12px] border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-sm font-medium text-foreground">เข้าสู่ระบบ</Link>
                            </SheetClose>
                            <SheetClose asChild>
                              <Link href="/register" className="inline-flex items-center justify-center rounded-[12px] bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">สมัครสมาชิก</Link>
                            </SheetClose>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
