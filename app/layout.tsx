import type React from "react"
import type { Metadata, Viewport } from "next"
import {
  Barlow_Condensed,
  Chakra_Petch,
  IBM_Plex_Sans_Thai,
  Oswald,
  Prompt,
  Anuphan,
  Rajdhani,
  Roboto_Condensed,
  Saira_Condensed,
  Teko,
} from "next/font/google"
import { Analytics } from "@vercel/analytics/next"

import { SiteNavigationProvider } from "@/components/site-navigation-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-ibm-plex-sans-thai",
})

const chakraPetch = Chakra_Petch({
  subsets: ["latin", "thai"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-chakra-petch",
})

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-barlow-condensed",
})

const teko = Teko({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-teko",
})

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-rajdhani",
})

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-oswald",
})

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-roboto-condensed",
})

const sairaCondensed = Saira_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-saira-condensed",
})

const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-prompt",
})

const anuphan = Anuphan({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-anuphan",
})

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
    <html
      lang="th"
      suppressHydrationWarning
      className={`${ibmPlexSansThai.variable} ${barlowCondensed.variable} ${teko.variable} ${rajdhani.variable} ${chakraPetch.variable} ${oswald.variable} ${robotoCondensed.variable} ${sairaCondensed.variable} ${prompt.variable} ${anuphan.variable} bg-background text-foreground`}
    >
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
