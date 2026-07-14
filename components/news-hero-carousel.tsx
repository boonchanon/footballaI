"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react"

interface NewsArticle {
  id: string
  title: string
  titleEn?: string
  description?: string
  descriptionEn?: string
  url: string
  image: string
  source: string
  timeAgo: string
  category?: string
}

interface NewsHeroCarouselProps {
  articles: NewsArticle[]
}

const categoryLabels: Record<string, string> = {
  result: "ผลการแข่งขัน",
  transfer: "ย้ายทีม",
  preview: "พรีวิว",
  match: "แมตช์",
  general: "ข่าวทั่วไป",
}

function HeroImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false)

  if (error || !src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-background">
        <ImageOff className="h-12 w-12 text-muted-foreground/30" />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      onError={() => setError(true)}
      unoptimized={src.startsWith("http")}
    />
  )
}

const SLIDE_DURATION = 6000

export function NewsHeroCarousel({ articles }: NewsHeroCarouselProps) {
  const heroArticles = articles.slice(0, 6)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (progressRef.current) clearInterval(progressRef.current)
    setProgress(0)

    const startTime = Date.now()
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      setProgress(Math.min((elapsed / SLIDE_DURATION) * 100, 100))
    }, 30)

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroArticles.length)
    }, SLIDE_DURATION)
  }, [heroArticles.length])

  useEffect(() => {
    if (heroArticles.length <= 1) return
    resetTimers()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [heroArticles.length, resetTimers])

  useEffect(() => {
    setProgress(0)
    setIsTransitioning(true)
    const timeout = setTimeout(() => setIsTransitioning(false), 600)
    return () => clearTimeout(timeout)
  }, [currentIndex])

  const goToSlide = useCallback(
    (index: number) => {
      if (index === currentIndex) return
      setCurrentIndex(index)
      resetTimers()
    },
    [currentIndex, resetTimers],
  )

  const goNext = useCallback(() => {
    goToSlide((currentIndex + 1) % heroArticles.length)
  }, [currentIndex, heroArticles.length, goToSlide])

  const goPrev = useCallback(() => {
    goToSlide((currentIndex - 1 + heroArticles.length) % heroArticles.length)
  }, [currentIndex, heroArticles.length, goToSlide])

  if (heroArticles.length === 0) return null

  const current = heroArticles[currentIndex]
  const nextIndex = (currentIndex + 1) % heroArticles.length
  const nextArticle = heroArticles[nextIndex]
  const bottomItems = Array.from({ length: Math.min(4, heroArticles.length) }, (_, i) => {
    const idx = (currentIndex + i) % heroArticles.length
    return { ...heroArticles[idx], _idx: idx }
  })

  return (
    <section className="relative w-full overflow-hidden bg-background dark:bg-[#0a0a0a]">
      <div className="relative flex min-h-[420px] flex-col lg:min-h-[520px] lg:flex-row">
        <div className="relative z-10 flex flex-col justify-center px-6 py-10 sm:px-10 lg:w-[50%] lg:px-16 lg:py-16 xl:w-[45%]">
          <div
            className={`transition-all duration-500 ${
              isTransitioning ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            <span className="text-sm font-medium tracking-wide text-muted-foreground">
              {categoryLabels[current.category || "general"] || current.source}
            </span>
          </div>

          <h2
            className={`mt-4 text-2xl font-bold leading-tight text-foreground transition-all duration-500 sm:text-3xl lg:text-4xl xl:text-[2.6rem] ${
              isTransitioning ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            {current.title}
          </h2>

          {current.description ? (
            <p
              className={`mt-4 max-w-lg line-clamp-3 text-sm leading-relaxed text-muted-foreground transition-all duration-500 sm:text-base ${
                isTransitioning ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
              }`}
              style={{ transitionDelay: "300ms" }}
            >
              {current.description}
            </p>
          ) : null}

          <div
            className={`mt-8 transition-all duration-500 ${
              isTransitioning ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
            }`}
            style={{ transitionDelay: "400ms" }}
          >
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              อ่านเพิ่มเติม
            </a>
          </div>
        </div>

        <div className="relative min-h-[260px] lg:w-[50%] lg:min-h-full xl:w-[45%]">
          {heroArticles.map((article, index) => (
            <div
              key={article.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === currentIndex ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <HeroImage src={article.image} alt={article.title} />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent dark:from-[#0a0a0a] lg:w-1/3" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent dark:from-[#0a0a0a] lg:hidden" />
        </div>

        {heroArticles.length > 1 ? (
          <div className="relative hidden min-w-[140px] flex-col xl:flex xl:w-[10%]">
            <div className="absolute inset-0">
              <HeroImage src={nextArticle.image} alt={nextArticle.title} />
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />
            </div>
            <div className="relative z-10 flex h-full flex-col justify-center px-4 py-8">
              <span className="text-xs font-medium text-muted-foreground/70">ถัดไป</span>
              <p className="mt-1 line-clamp-4 text-sm font-semibold leading-snug text-foreground">
                {nextArticle.title}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative border-t border-border/30 bg-background dark:bg-[#0a0a0a]">
        <div className="flex items-stretch">
          <button
            onClick={goPrev}
            className="hidden w-12 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground sm:flex"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="grid flex-1 grid-cols-2 sm:grid-cols-4">
            {bottomItems.map((item, i) => {
              const isActive = i === 0
              return (
                <button
                  key={`${item.id}-${i}`}
                  onClick={() => goToSlide(item._idx)}
                  className={`group relative px-4 py-4 text-left transition-colors sm:px-5 sm:py-5 ${
                    isActive ? "bg-muted/20" : "hover:bg-muted/10"
                  }`}
                >
                  <span className="mb-1 block truncate text-xs text-muted-foreground">
                    {categoryLabels[item.category || "general"] || item.source}
                  </span>
                  <span
                    className={`block line-clamp-2 text-sm font-medium leading-snug transition-colors ${
                      isActive ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                    }`}
                  >
                    {item.title}
                  </span>
                  {isActive ? (
                    <div
                      className="absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>

          <button
            onClick={goNext}
            className="hidden w-12 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground sm:flex"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  )
}
