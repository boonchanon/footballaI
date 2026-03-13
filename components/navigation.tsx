"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  User,
  Menu,
  Brain,
  ChevronDown,
  ChevronRight,
  Trophy,
  Calendar,
  PlayCircle,
  Clock,
  CheckCircle,
  List,
  Newspaper,
  BarChart3,
  Flame,
  Users,
  Globe,
  Gamepad2,
  Home,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useAuthSession } from "@/hooks/use-auth-session"

interface NavigationProps {
  isLoggedIn?: boolean
  userName?: string
}

function MobileNavLink({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string
  icon: React.ElementType
  label: string
  isActive: boolean
}) {
  return (
    <SheetClose asChild>
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? "text-primary bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span>{label}</span>
        {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
      </Link>
    </SheetClose>
  )
}

function MobileNavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <p className="px-3 pb-1.5 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

function MobileAccordion({
  title,
  icon: Icon,
  isActive,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: React.ElementType
  isActive: boolean
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen || isActive)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? "text-primary bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && <div className="ml-7 flex flex-col gap-0.5 mt-0.5">{children}</div>}
    </div>
  )
}

export function Navigation({ isLoggedIn = false, userName }: NavigationProps) {
  const pathname = usePathname()
  const session = useAuthSession()
  const resolvedIsLoggedIn = isLoggedIn || session.isLoggedIn
  const resolvedUserName = userName || session.user?.name

  const mainNavLinks = [
    { href: "/", label: "หน้าแรก", icon: Home },
    { href: "/ai-prediction", label: "AI ทำนายผล", icon: Brain },
    { href: "/worldcup-2026", label: "World Cup 2026", icon: Globe, highlight: true },
  ]

  const matchSubLinks = [
    { href: "/matches?filter=live", label: "กำลังแข่ง", icon: PlayCircle },
    { href: "/matches?filter=upcoming", label: "กำลังจะแข่ง", icon: Clock },
    { href: "/matches?filter=finished", label: "แข่งจบแล้ว", icon: CheckCircle },
    { href: "/matches", label: "ทั้งหมด", icon: List },
  ]

  const rightNavLinks = [
    { href: "/heatmap", label: "Heat Map", icon: Flame },
  ]

  const isCommunityActive = pathname.startsWith("/community") || pathname.startsWith("/games")
  const isMatchesActive = pathname.startsWith("/matches") || pathname.startsWith("/standings") || pathname === "/clubs"
  const isNewsActive = pathname.startsWith("/news") || pathname.startsWith("/players")

  return (
    <nav className="sticky top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
              <span className="font-display text-base sm:text-xl text-primary-foreground">FA</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-display text-xl lg:text-2xl text-foreground tracking-wide">FootballAI</span>
              <p className="text-[10px] text-muted-foreground -mt-1">{"วิเคราะห์ฟุตบอลอัจฉริยะ"}</p>
            </div>
          </Link>

          {/* Center Navigation - Desktop */}
          <div className="hidden xl:flex items-center gap-1">
            {mainNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1.5 ${
                  pathname === link.href
                    ? "text-primary bg-primary/10"
                    : link.highlight
                      ? "text-primary hover:bg-primary/10 border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {link.icon && <link.icon className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1 ${
                    isMatchesActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  {"โปรแกรม"}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{"โปรแกรมการแข่งขัน"}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    {matchSubLinks.map((link) => (
                      <DropdownMenuItem key={link.href} asChild>
                        <Link href={link.href} className="gap-2 cursor-pointer">
                          {link.icon && <link.icon className="w-4 h-4" />}
                          {link.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/standings" className="gap-2 cursor-pointer">
                    <Trophy className="w-4 h-4" />
                    {"ตารางคะแนน"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/clubs" className="gap-2 cursor-pointer">
                    <Users className="w-4 h-4" />
                    {"สโมสรทั้งหมด"}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {rightNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1 ${
                  pathname === link.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {link.icon && <link.icon className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1 ${
                    isCommunityActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Users className="w-4 h-4 mr-1" />
                  {"ชุมชน"}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-52">
                <DropdownMenuItem asChild>
                  <Link href="/community" className="gap-2 cursor-pointer">
                    <Users className="w-4 h-4" />
                    {"ชุมชน"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/games" className="gap-2 cursor-pointer">
                    <Gamepad2 className="w-4 h-4" />
                    {"ทายผล & เกม"}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1 ${
                    isNewsActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Newspaper className="w-4 h-4 mr-1" />
                  {"ข่าว"}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/news" className="gap-2 cursor-pointer">
                    <Newspaper className="w-4 h-4" />
                    {"ข่าวฟุตบอล"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/players" className="gap-2 cursor-pointer">
                    <BarChart3 className="w-4 h-4" />
                    {"สถิตินักเตะ"}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right side - Theme Toggle & Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />

            {/* Mobile / Tablet Sheet Menu */}
            <Sheet>
              <SheetTrigger asChild className="xl:hidden">
                <Button variant="ghost" size="icon" className="rounded-lg w-9 h-9 sm:w-10 sm:h-10">
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">{"เปิดเมนู"}</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[min(85vw,320px)] sm:w-[min(60vw,384px)] bg-background border-border p-0 flex flex-col"
              >
                <SheetHeader className="px-4 pt-8 pb-3 flex-shrink-0">
                  <SheetTitle className="font-display text-xl">{"เมนู"}</SheetTitle>
                  <SheetDescription className="sr-only">{"เมนูหลักสำหรับนำทาง"}</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-3 pb-4">
                  {/* Main Links */}
                  <MobileNavSection title="หลัก">
                    {mainNavLinks.map((link) => (
                      <MobileNavLink
                        key={link.href}
                        href={link.href}
                        icon={link.icon || Home}
                        label={link.label}
                        isActive={pathname === link.href}
                      />
                    ))}
                  </MobileNavSection>

                  <div className="mx-3 border-t border-border/50" />

                  {/* Matches */}
                  <MobileNavSection title="การแข่งขัน">
                    <MobileAccordion
                      title="โปรแกรมการแข่งขัน"
                      icon={Calendar}
                      isActive={isMatchesActive}
                    >
                      {matchSubLinks.map((link) => (
                        <MobileNavLink
                          key={link.href}
                          href={link.href}
                          icon={link.icon}
                          label={link.label}
                          isActive={pathname + (typeof window !== "undefined" ? window.location.search : "") === link.href}
                        />
                      ))}
                    </MobileAccordion>
                    <MobileNavLink
                      href="/standings"
                      icon={Trophy}
                      label="ตารางคะแนน"
                      isActive={pathname === "/standings"}
                    />
                    <MobileNavLink
                      href="/clubs"
                      icon={Users}
                      label="สโมสรทั้งหมด"
                      isActive={pathname === "/clubs"}
                    />
                    {rightNavLinks.map((link) => (
                      <MobileNavLink
                        key={link.href}
                        href={link.href}
                        icon={link.icon}
                        label={link.label}
                        isActive={pathname === link.href}
                      />
                    ))}
                  </MobileNavSection>

                  <div className="mx-3 border-t border-border/50" />

                  {/* Community */}
                  <MobileNavSection title="ชุมชน">
                    <MobileNavLink
                      href="/community"
                      icon={Users}
                      label="ชุมชน"
                      isActive={pathname === "/community"}
                    />
                    <MobileNavLink
                      href="/games"
                      icon={Gamepad2}
                      label="ทายผล & เกม"
                      isActive={pathname.startsWith("/games")}
                    />
                  </MobileNavSection>

                  <div className="mx-3 border-t border-border/50" />

                  {/* News & Stats */}
                  <MobileNavSection title="ข่าวและสถิติ">
                    <MobileNavLink
                      href="/news"
                      icon={Newspaper}
                      label="ข่าวฟุตบอล"
                      isActive={pathname === "/news"}
                    />
                    <MobileNavLink
                      href="/players"
                      icon={BarChart3}
                      label="สถิตินักเตะ"
                      isActive={pathname === "/players" || pathname.startsWith("/players/")}
                    />
                  </MobileNavSection>
                </div>

                {/* Bottom Auth Section */}
                <div className="flex-shrink-0 border-t border-border/50 p-3">
                  {resolvedIsLoggedIn ? (
                    <SheetClose asChild>
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">{resolvedUserName || "โปรไฟล์"}</span>
                      </Link>
                    </SheetClose>
                  ) : (
                    <div className="flex gap-2">
                      <SheetClose asChild>
                        <Button asChild variant="outline" size="sm" className="flex-1 rounded-lg">
                          <Link href="/login">{"เข้าสู่ระบบ"}</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button asChild size="sm" className="flex-1 rounded-lg bg-primary text-primary-foreground">
                          <Link href="/register">{"สมัครสมาชิก"}</Link>
                        </Button>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Auth */}
            <div className="hidden xl:flex items-center gap-2">
              {resolvedIsLoggedIn ? (
                <Button asChild variant="ghost" size="sm" className="rounded-lg gap-2">
                  <Link href="/profile">
                    <User className="w-4 h-4" />
                    <span>{resolvedUserName || "โปรไฟล์"}</span>
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="rounded-lg">
                    <Link href="/login">{"เข้าสู่ระบบ"}</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                  >
                    <Link href="/register">{"สมัครสมาชิก"}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
