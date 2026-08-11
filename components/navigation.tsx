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
  compact = false,
  expandable = false,
}: {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
  closeOnClick?: boolean
  compact?: boolean
  expandable?: boolean
}) {
  const content = (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "flex font-medium transition-all",
        compact
          ? cn(
              "h-12 items-center overflow-hidden rounded-[16px]",
              expandable
                ? "mx-auto w-12 justify-center px-0 group-hover/sidebar:mx-0 group-hover/sidebar:w-full group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-4 group-focus-within/sidebar:mx-0 group-focus-within/sidebar:w-full group-focus-within/sidebar:justify-start group-focus-within/sidebar:gap-3 group-focus-within/sidebar:px-4"
                : "w-12 justify-center",
            )
          : "items-center gap-2 rounded-[14px] px-2.5 py-2.5 text-[12px]",
        active
          ? "border border-primary/40 bg-primary/16 text-foreground shadow-[0_8px_18px_rgba(184,255,0,0.1)]"
          : "border border-border bg-sidebar-accent/60 text-sidebar-foreground hover:border-border-strong hover:bg-sidebar-hover hover:text-sidebar-foreground",
      )}
    >
      {compact ? (
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]",
            active
              ? "bg-primary/8"
              : "bg-transparent group-hover/sidebar:bg-sidebar-hover group-focus-within/sidebar:bg-sidebar-hover",
          )}
        >
          <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "text-sidebar-foreground/75")} />
        </span>
      ) : (
        <Icon className={cn("h-[13px] w-[13px]", active ? "text-primary" : "text-muted-foreground")} />
      )}

      {!compact ? <span className="flex-1">{label}</span> : null}
      {compact && expandable ? (
        <span className="truncate text-sm opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
          {label}
        </span>
      ) : null}
    </Link>
  )

  if (!closeOnClick) return content

  return <SheetClose asChild>{content}</SheetClose>
}

function PanelSection({
  title,
  children,
  compact = false,
}: {
  title: string
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <section className="space-y-2">
      <p className={cn("font-semibold uppercase text-muted-foreground/65", compact ? "text-center text-[9px] tracking-[0.18em]" : "px-1 text-[10px] tracking-[0.22em]")}>
        {title}
      </p>
      <div className={cn(compact ? "flex flex-col items-center gap-2" : "space-y-2")}>{children}</div>
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
  const currentPathWithQuery = mounted && typeof window !== "undefined" ? `${pathname}${window.location.search}` : pathname

  const navItems = useMemo<NavItem[]>(
    () => [
      { href: "/", label: "Home", icon: Home, isActive: (path) => path === "/" },
      { href: "/community/matches", label: "Match Hub", icon: Trophy, isActive: (path) => path.startsWith("/community/matches") },
      { href: "/community", label: "Community Feed", icon: Users, isActive: (path) => path === "/community" || path === "/community/my-posts" },
      { href: "/games", label: "Polls", icon: Gamepad2, isActive: (path) => path.startsWith("/games") },
      { href: "/community", label: "Stories", icon: ImageIcon, isActive: () => false },
      { href: "/news", label: "News", icon: Newspaper, isActive: (path) => path.startsWith("/news") },
      { href: "/matches", label: "Fixtures", icon: Calendar, isActive: (_path, current) => current === "/matches" || current.startsWith("/matches?filter=") },
      { href: "/standings", label: "Standings", icon: BarChart3, isActive: (path) => path === "/standings" },
      { href: "/players", label: "Players & Teams", icon: BrainCircuit, isActive: (path) => path.startsWith("/players") || path.startsWith("/teams") || path === "/clubs" },
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
      <aside className="theme-sidebar group/sidebar fixed bottom-0 left-0 top-0 z-50 hidden w-[88px] overflow-hidden border-r transition-[width,box-shadow] duration-200 hover:w-[220px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.18)] focus-within:w-[220px] xl:flex xl:flex-col">
        <div className="border-b border-sidebar-border px-3 py-4">
          <Link href="/" aria-label="FootballAI Home" title="FootballAI Home" className="flex min-w-0 items-center gap-3 overflow-hidden rounded-[16px]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-primary/20 bg-primary/10 text-primary shadow-[0_10px_24px_rgba(184,255,0,0.08)]">
              <span className="font-display text-[1.35rem] leading-none">FA</span>
            </div>
            <div className="min-w-0 opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
              <div className="truncate font-display text-[0.95rem] leading-none text-foreground">FootballAI</div>
              <p className="truncate text-[8px] tracking-[0.1em] text-muted-foreground">MATCH INSIGHT PLATFORM</p>
            </div>
          </Link>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
          <PanelSection title="Main" compact>
            {primaryItems.map((item) => (
              <PanelNavLink
                key={item.label}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={item.isActive(pathname, currentPathWithQuery)}
                closeOnClick={false}
                compact
                expandable
              />
            ))}
          </PanelSection>

          <PanelSection title="Explore" compact>
            {secondaryItems.map((item) => (
              <PanelNavLink
                key={item.label}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={item.isActive(pathname, currentPathWithQuery)}
                closeOnClick={false}
                compact
                expandable
              />
            ))}
          </PanelSection>

          <PanelSection title="You" compact>
            <PanelNavLink
              href={profileItem.href}
              icon={profileItem.icon}
              label={profileItem.label}
              active={profileItem.isActive(pathname, currentPathWithQuery)}
              closeOnClick={false}
              compact
              expandable
            />
          </PanelSection>
        </div>

        <div className="border-t border-sidebar-border p-2.5">
          <div className="rounded-[18px] border border-sidebar-border bg-sidebar-accent/70 px-2 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-center gap-3 overflow-hidden group-hover/sidebar:justify-between group-focus-within/sidebar:justify-between">
              <div className="opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Theme</p>
              </div>
              <ThemeToggle compact />
            </div>

            <div className="mt-3 flex items-center justify-center gap-3 overflow-hidden group-hover/sidebar:justify-start group-focus-within/sidebar:justify-start">
              {stableIsLoggedIn ? (
                <Link href="/profile" aria-label="Open profile" title={stableUserName || "Profile"} className="block shrink-0">
                  <Avatar className="h-12 w-12 border-2 border-primary/25 shadow-[0_8px_20px_rgba(0,0,0,0.24)]">
                    <AvatarImage src={stableAvatar || "/placeholder-user.jpg"} />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Link
                  href="/login"
                  aria-label="Login"
                  title="Login"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-sidebar-border bg-sidebar-accent/70 text-sidebar-foreground transition hover:bg-sidebar-hover"
                >
                  <User className="h-5 w-5" />
                </Link>
              )}

              <div className="min-w-0 flex-1 opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
                {stableIsLoggedIn ? (
                  <>
                    <p className="truncate text-[13px] font-semibold text-foreground">{stableUserName || "Football Fan"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">@{(stableUserName || "footballfan").replace(/\s+/g, "").toLowerCase()}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] font-semibold text-foreground">Guest</p>
                    <p className="text-[11px] text-muted-foreground">Sign in to use your profile</p>
                  </>
                )}
              </div>
            </div>

            <div className="mt-2.5 hidden gap-2 opacity-0 transition-opacity duration-150 group-hover/sidebar:grid group-hover/sidebar:grid-cols-2 group-hover/sidebar:opacity-100 group-focus-within/sidebar:grid group-focus-within/sidebar:grid-cols-2 group-focus-within/sidebar:opacity-100">
              {stableIsLoggedIn ? (
                <>
                  <Link
                    href="/profile"
                    className="inline-flex items-center justify-center rounded-[10px] bg-primary px-2 py-2 text-[11px] font-semibold text-primary-foreground shadow-[0_8px_22px_rgba(184,255,0,0.18)] transition hover:bg-primary/90"
                  >
                    Open Profile
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto rounded-[10px] border-border bg-card/70 px-2 py-2 text-[11px]"
                    onClick={() => {
                      session.logout()
                      if (typeof window !== "undefined") window.location.href = "/"
                    }}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-[10px] border border-border bg-card/70 px-2 py-2 text-[11px] font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-[10px] bg-primary px-2 py-2 text-[11px] font-semibold text-primary-foreground shadow-[0_8px_22px_rgba(184,255,0,0.18)] transition hover:bg-primary/90"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      <nav className="theme-shell sticky left-0 right-0 top-0 z-50 border-b backdrop-blur-xl xl:hidden">
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
                  <Button variant="ghost" size="sm" className="h-11 rounded-[12px] border border-border bg-card/70 px-4 text-foreground hover:bg-accent hover:text-accent-foreground">
                    <Menu className="mr-2 h-4 w-4 text-primary" />
                    Menu
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(92vw,420px)] border-border bg-sidebar p-0 text-sidebar-foreground">
                  <SheetHeader className="border-b border-sidebar-border px-5 pb-4 pt-6 text-left">
                    <SheetTitle className="font-display text-2xl text-foreground">FootballAI</SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground">Main navigation and profile in one panel.</SheetDescription>
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

                    <div className="border-t border-sidebar-border p-5">
                      <div className="rounded-[18px] border border-sidebar-border bg-sidebar-accent/70 p-4 shadow-[0_10px_28px_rgba(0,0,0,0.12)]">
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
                                <Link href="/profile" className="inline-flex items-center justify-center rounded-[12px] bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Open Profile</Link>
                              </SheetClose>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-[12px] border-border bg-card/70"
                                onClick={() => {
                                  session.logout()
                                  if (typeof window !== "undefined") window.location.href = "/"
                                }}
                              >
                                Logout
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <SheetClose asChild>
                              <Link href="/login" className="inline-flex items-center justify-center rounded-[12px] border border-border bg-card/70 px-4 py-3 text-sm font-medium text-foreground">Login</Link>
                            </SheetClose>
                            <SheetClose asChild>
                              <Link href="/register" className="inline-flex items-center justify-center rounded-[12px] bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Register</Link>
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
