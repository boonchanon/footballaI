"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  transfer: "ข่าวย้ายทีม",
  preview: "พรีวิว",
  match: "แมตช์",
  general: "ข่าวทั่วไป",
}

function HeroImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false)

  if (error || !src) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-background flex items-center justify-center">
        <ImageOff className="w-12 h-12 text-muted-foreground/30" />
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

  // Reset progress when index changes
  useEffect(() => {
    setProgress(0)
    setIsTransitioning(true)
    const timeout = setTimeout(() => setIsTransitioning(false), 600)
    return () => clearTimeout(timeout)
  }, [currentIndex])

  // Restart timer on manual navigation
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

  // Show 4 items in the bottom carousel, starting from current
  const bottomItems = Array.from({ length: Math.min(4, heroArticles.length) }, (_, i) => {
    const idx = (currentIndex + i) % heroArticles.length
    return { ...heroArticles[idx], _idx: idx }
  })

  return (
    <section className="relative w-full bg-[#0a0a0a] overflow-hidden">
      {/* Main Hero Area */}
      <div className="relative flex flex-col lg:flex-row min-h-[420px] lg:min-h-[520px]">
        {/* Left: Text Content */}
        <div className="relative z-10 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 lg:py-16 lg:w-[50%] xl:w-[45%]">
          {/* Category Badge */}
          <div
            className={`transition-all duration-500 ${isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
            style={{ transitionDelay: "100ms" }}
          >
            <span className="text-sm font-medium text-muted-foreground tracking-wide">
              {categoryLabels[current.category || "general"] || current.source}
            </span>
          </div>

          {/* Title */}
          <h2
            className={`mt-4 text-2xl sm:text-3xl lg:text-4xl xl:text-[2.6rem] font-bold leading-tight text-foreground transition-all duration-500 ${isTransitioning ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"}`}
            style={{ transitionDelay: "200ms" }}
          >
            {current.title}
          </h2>

          {/* Description */}
          {current.description && (
            <p
              className={`mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-3 max-w-lg transition-all duration-500 ${isTransitioning ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"}`}
              style={{ transitionDelay: "300ms" }}
            >
              {current.description}
            </p>
          )}

          {/* Read More Button */}
          <div
            className={`mt-8 transition-all duration-500 ${isTransitioning ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"}`}
            style={{ transitionDelay: "400ms" }}
          >
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 rounded-full bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
            >
              {"อ่านเพิ่มเติม"}
            </a>
          </div>
        </div>

        {/* Right: Main Image */}
        <div className="relative lg:w-[50%] xl:w-[45%] min-h-[260px] lg:min-h-full">
          {heroArticles.map((article, index) => (
            <div
              key={article.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <HeroImage src={article.image} alt={article.title} />
            </div>
          ))}
          {/* Gradient fade from left */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-transparent lg:w-1/3" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent lg:hidden" />
        </div>

        {/* Far Right: Next Up Preview (desktop only) */}
        {heroArticles.length > 1 && (
          <div className="hidden xl:flex flex-col xl:w-[10%] min-w-[140px] relative">
            <div className="absolute inset-0">
              <HeroImage src={nextArticle.image} alt={nextArticle.title} />
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />
            </div>
            <div className="relative z-10 flex flex-col justify-center px-4 py-8 h-full">
              <span className="text-xs text-muted-foreground/70 font-medium">{"ถัดไป"}</span>
              <p className="mt-1 text-sm font-semibold text-foreground leading-snug line-clamp-4">
                {nextArticle.title}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Carousel Navigation */}
      <div className="relative bg-[#0a0a0a] border-t border-border/30">
        <div className="flex items-stretch">
          {/* Prev Arrow */}
          <button
            onClick={goPrev}
            className="hidden sm:flex items-center justify-center w-12 shrink-0 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/30"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Navigation Items */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4">
            {bottomItems.map((item, i) => {
              const isActive = i === 0
              return (
                <button
                  key={`${item.id}-${i}`}
                  onClick={() => goToSlide(item._idx)}
                  className={`relative text-left px-4 py-4 sm:px-5 sm:py-5 transition-colors group ${
                    isActive ? "bg-muted/20" : "hover:bg-muted/10"
                  }`}
                >
                  <span className="block text-xs text-muted-foreground mb-1 truncate">
                    {categoryLabels[item.category || "general"] || item.source}
                  </span>
                  <span
                    className={`block text-sm font-medium leading-snug line-clamp-2 transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {item.title}
                  </span>

                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-border/30">
                    <div
                      className={`h-full transition-all ${isActive ? "bg-primary" : "bg-transparent"}`}
                      style={{
                        width: isActive ? `${progress}%` : "0%",
                        transition: isActive ? "width 0.1s linear" : "none",
                      }}
                    />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Next Arrow */}
          <button
            onClick={goNext}
            className="hidden sm:flex items-center justify-center w-12 shrink-0 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/30"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  )
}
