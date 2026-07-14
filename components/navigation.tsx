"use client"

import { useEffect, useState } from "react"
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
  BrainCircuit,
  Gamepad2,
  Home,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
          isActive
            ? "bg-primary/12 text-foreground"
            : "text-foreground/82 hover:bg-muted/70 hover:text-foreground"
        }`}
      >
        <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
        <span>{label}</span>
        {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
      </Link>
    </SheetClose>
  )
}

function MobileNavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
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
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
          isActive
            ? "bg-primary/12 text-foreground"
            : "text-foreground/82 hover:bg-muted/70 hover:text-foreground"
        }`}
      >
        <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
        <span className="flex-1 text-left">{title}</span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">{children}</div>}
    </div>
  )
}

function DesktopNavLink({
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
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary/12 text-foreground"
          : "text-foreground/78 hover:bg-muted/70 hover:text-foreground"
      }`}
    >
      <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
      <span>{label}</span>
    </Link>
  )
}

export function Navigation({ isLoggedIn = false, userName }: NavigationProps) {
  const pathname = usePathname()
  const session = useAuthSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const resolvedIsLoggedIn = isLoggedIn || session.isLoggedIn
  const resolvedUserName = userName || session.user?.name
  const stableIsLoggedIn = mounted ? resolvedIsLoggedIn : isLoggedIn
  const stableUserName = mounted ? resolvedUserName : userName
  const currentPathWithQuery = mounted && typeof window !== "undefined"
    ? `${pathname}${window.location.search}`
    : pathname

  const mainNavLinks = [
    { href: "/", label: "หน้าแรก", icon: Home },
    { href: "/ai-prediction", label: "AI ทำนายผล", icon: Brain },
  ]

  const worldCupLinks = [
    { href: "/worldcup-2026", label: "World Cup 2026", icon: Globe },
    { href: "/worldcup-2026/predictions", label: "ทำนายผลบอลโลก", icon: BrainCircuit },
  ]

  const matchSubLinks = [
    { href: "/matches?filter=live", label: "กำลังแข่ง", icon: PlayCircle },
    { href: "/matches?filter=upcoming", label: "กำลังจะแข่ง", icon: Clock },
    { href: "/matches?filter=finished", label: "แข่งจบแล้ว", icon: CheckCircle },
    { href: "/matches", label: "ทั้งหมด", icon: List },
  ]

  const rightNavLinks = [{ href: "/heatmap", label: "Heat Map", icon: Flame }]

  const isCommunityActive = pathname.startsWith("/community") || pathname.startsWith("/games")
  const isMatchesActive = pathname.startsWith("/matches") || pathname.startsWith("/standings") || pathname === "/clubs"
  const isNewsActive = pathname.startsWith("/news") || pathname.startsWith("/players")
  const isWorldCupActive = pathname.startsWith("/worldcup-2026")

  return (
    <nav className="sticky top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/96 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <span className="font-display text-lg leading-none">FA</span>
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-xl text-foreground">FootballAI</div>
              <p className="hidden text-[11px] tracking-[0.14em] text-muted-foreground sm:block">MATCH INSIGHT PLATFORM</p>
            </div>
          </Link>

          <div className="hidden xl:flex items-center gap-1">
            {mainNavLinks.map((link) => (
              <DesktopNavLink key={link.href} href={link.href} icon={link.icon} label={link.label} isActive={pathname === link.href} />
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isWorldCupActive
                      ? "bg-primary/12 text-foreground"
                      : "text-foreground/78 hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <Globe className={`h-4 w-4 ${isWorldCupActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span>World Cup 2026</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-60 border-border/80 bg-popover/98">
                {worldCupLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href} className="cursor-pointer gap-2">
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isMatchesActive
                      ? "bg-primary/12 text-foreground"
                      : "text-foreground/78 hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <Calendar className={`h-4 w-4 ${isMatchesActive ? "text-primary" : "text-muted-foreground"}`} />
                  โปรแกรม
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56 border-border/80 bg-popover/98">
                <DropdownMenuItem asChild>
                  <Link href="/matches" className="cursor-pointer gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>โปรแกรมการแข่งขัน</span>
                  </Link>
                </DropdownMenuItem>
                {matchSubLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href} className="cursor-pointer gap-2 pl-8">
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/standings" className="cursor-pointer gap-2">
                    <Trophy className="h-4 w-4" />
                    ตารางคะแนน
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/clubs" className="cursor-pointer gap-2">
                    <Users className="h-4 w-4" />
                    สโมสรทั้งหมด
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {rightNavLinks.map((link) => (
              <DesktopNavLink key={link.href} href={link.href} icon={link.icon} label={link.label} isActive={pathname === link.href} />
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isCommunityActive
                      ? "bg-primary/12 text-foreground"
                      : "text-foreground/78 hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <Users className={`h-4 w-4 ${isCommunityActive ? "text-primary" : "text-muted-foreground"}`} />
                  ชุมชน
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-52 border-border/80 bg-popover/98">
                <DropdownMenuItem asChild>
                  <Link href="/community" className="cursor-pointer gap-2">
                    <Users className="h-4 w-4" />
                    ชุมชน
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/games" className="cursor-pointer gap-2">
                    <Gamepad2 className="h-4 w-4" />
                    ทายผล & เกม
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isNewsActive
                      ? "bg-primary/12 text-foreground"
                      : "text-foreground/78 hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <Newspaper className={`h-4 w-4 ${isNewsActive ? "text-primary" : "text-muted-foreground"}`} />
                  ข่าว
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 border-border/80 bg-popover/98">
                <DropdownMenuItem asChild>
                  <Link href="/news" className="cursor-pointer gap-2">
                    <Newspaper className="h-4 w-4" />
                    ข่าวฟุตบอล
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/players" className="cursor-pointer gap-2">
                    <BarChart3 className="h-4 w-4" />
                    สถิตินักเตะ
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <div className="hidden xl:flex items-center gap-2">
              {stableIsLoggedIn ? (
                <Button asChild variant="ghost" size="sm" className="rounded-lg gap-2">
                  <Link href="/profile">
                    <User className="h-4 w-4" />
                    <span>{stableUserName || "โปรไฟล์"}</span>
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="rounded-lg">
                    <Link href="/login">เข้าสู่ระบบ</Link>
                  </Button>
                  <Button asChild size="sm" className="rounded-lg">
                    <Link href="/register">สมัครสมาชิก</Link>
                  </Button>
                </>
              )}
            </div>

            <Sheet>
              <SheetTrigger asChild className="xl:hidden">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">เปิดเมนู</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(86vw,340px)] border-border/80 bg-background p-0">
                <SheetHeader className="px-4 pt-7 pb-3">
                  <SheetTitle className="font-display text-xl text-foreground">FootballAI</SheetTitle>
                  <SheetDescription className="sr-only">เมนูหลักสำหรับนำทาง</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-3 pb-4">
                  <MobileNavSection title="เมนูหลัก">
                    {mainNavLinks.map((link) => (
                      <MobileNavLink key={link.href} href={link.href} icon={link.icon} label={link.label} isActive={pathname === link.href} />
                    ))}
                  </MobileNavSection>

                  <MobileNavSection title="World Cup 2026">
                    {worldCupLinks.map((link) => (
                      <MobileNavLink key={link.href} href={link.href} icon={link.icon} label={link.label} isActive={pathname === link.href} />
                    ))}
                  </MobileNavSection>

                  <div className="mx-3 my-2 border-t border-border/80" />

                  <MobileNavSection title="การแข่งขัน">
                    <MobileAccordion title="โปรแกรมการแข่งขัน" icon={Calendar} isActive={isMatchesActive}>
                      {matchSubLinks.map((link) => (
                        <MobileNavLink
                          key={link.href}
                          href={link.href}
                          icon={link.icon}
                          label={link.label}
                          isActive={currentPathWithQuery === link.href}
                        />
                      ))}
                      <MobileNavLink href="/standings" icon={Trophy} label="ตารางคะแนน" isActive={pathname === "/standings"} />
                      <MobileNavLink href="/clubs" icon={Users} label="สโมสรทั้งหมด" isActive={pathname === "/clubs"} />
                      {rightNavLinks.map((link) => (
                        <MobileNavLink key={link.href} href={link.href} icon={link.icon} label={link.label} isActive={pathname === link.href} />
                      ))}
                    </MobileAccordion>
                  </MobileNavSection>

                  <div className="mx-3 my-2 border-t border-border/80" />

                  <MobileNavSection title="ชุมชน">
                    <MobileNavLink href="/community" icon={Users} label="ชุมชน" isActive={pathname === "/community"} />
                    <MobileNavLink href="/games" icon={Gamepad2} label="ทายผล & เกม" isActive={pathname.startsWith("/games")} />
                  </MobileNavSection>

                  <div className="mx-3 my-2 border-t border-border/80" />

                  <MobileNavSection title="ข่าวและสถิติ">
                    <MobileNavLink href="/news" icon={Newspaper} label="ข่าวฟุตบอล" isActive={pathname === "/news"} />
                    <MobileNavLink href="/players" icon={BarChart3} label="สถิตินักเตะ" isActive={pathname === "/players" || pathname.startsWith("/players/")} />
                  </MobileNavSection>
                </div>

                <div className="border-t border-border/80 p-3">
                  {stableIsLoggedIn ? (
                    <SheetClose asChild>
                      <Link href="/profile" className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted/70">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-primary">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">{stableUserName || "โปรไฟล์"}</span>
                      </Link>
                    </SheetClose>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <SheetClose asChild>
                        <Button asChild variant="outline" size="sm" className="rounded-lg">
                          <Link href="/login">เข้าสู่ระบบ</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button asChild size="sm" className="rounded-lg">
                          <Link href="/register">สมัครสมาชิก</Link>
                        </Button>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
