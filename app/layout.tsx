import type React from "react"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"

import { SiteNavigationProvider } from "@/components/site-navigation-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "FootballAI - วิเคราะห์ฟุตบอลด้วย AI",
  description: "แพลตฟอร์มวิเคราะห์ฟุตบอลอัจฉริยะด้วยเทคโนโลยี AI พร้อมสถิติเชิงลึกและการทำนายผลที่น่าเชื่อถือ",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-dark-32x32.png",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#05090b" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" suppressHydrationWarning className="bg-background text-foreground">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="footballai-theme-v3">
          <SiteNavigationProvider>
            <div className="min-h-screen bg-background text-foreground">
              {children}
            </div>
          </SiteNavigationProvider>
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
