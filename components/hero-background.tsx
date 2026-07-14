"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"

// Alternating stadium and player images
const heroSlides = [
  { type: "stadium", src: "/stadiums/old-trafford.jpg", name: "Old Trafford" },
  { type: "player", src: "/players/haaland.webp", name: "Erling Haaland", team: "Manchester City" },
  { type: "stadium", src: "/stadiums/emirates-interior.jpg", name: "Emirates Stadium" },
  { type: "player", src: "/players/saka.webp", name: "Bukayo Saka", team: "Arsenal" },
  { type: "stadium", src: "/stadiums/anfield.png", name: "Anfield" },
  { type: "player", src: "/players/wirtz.jpg", name: "Florian Wirtz", team: "Liverpool" },
  { type: "stadium", src: "/stadiums/etihad.jpg", name: "Etihad Stadium" },
  { type: "player", src: "/players/palmer.webp", name: "Cole Palmer", team: "Chelsea" },
  { type: "player", src: "/players/rice.jpg", name: "Declan Rice", team: "Arsenal" },
  { type: "stadium", src: "/stadiums/emirates-exterior.jpg", name: "Emirates Stadium" },
  { type: "player", src: "/players/romero.webp", name: "Cristian Romero", team: "Tottenham" },
  { type: "player", src: "/players/gyokeres.jpg", name: "Viktor Gyokeres", team: "Arsenal" },
  { type: "player", src: "/players/sesko.jpg", name: "Benjamin Sesko", team: "Manchester United" },
  { type: "player", src: "/players/isak.jpg", name: "Alexander Isak", team: "Liverpool" },
]

export function HeroBackground() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [direction, setDirection] = useState<"left" | "right">("right")

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setDirection(index > currentIndex ? "right" : "left")
    setCurrentIndex(index)
    setTimeout(() => setIsTransitioning(false), 1200)
  }, [currentIndex, isTransitioning])

  const nextSlide = useCallback(() => {
    goToSlide((currentIndex + 1) % heroSlides.length)
  }, [currentIndex, goToSlide])

  useEffect(() => {
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [nextSlide])

  const currentSlide = heroSlides[currentIndex]

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Background Images with Ken Burns effect */}
      {heroSlides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-1000 ease-out ${
            index === currentIndex 
              ? "opacity-100 scale-100" 
              : "opacity-0 scale-105"
          }`}
          style={{
            transform: index === currentIndex 
              ? "scale(1)" 
              : direction === "right" 
                ? "scale(1.1) translateX(5%)" 
                : "scale(1.1) translateX(-5%)",
          }}
        >
          <div 
            className={`absolute inset-0 ${
              index === currentIndex ? "animate-ken-burns" : ""
            }`}
          >
            <Image 
              src={slide.src || "/placeholder.svg"} 
              alt={slide.name} 
              fill 
              className={`object-cover ${
                slide.type === "player" ? "object-top" : "object-center"
              }`}
              priority={index === 0} 
            />
          </div>
        </div>
      ))}

      {/* Animated Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      
      {/* Animated scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(184,255,0,0.035)_50%)] dark:bg-[linear-gradient(transparent_50%,rgba(255,255,255,0.03)_50%)] bg-[length:100%_4px] animate-scan-lines" />
      </div>

      {/* Glowing accent based on current slide */}
      <div 
        className={`absolute -right-1/4 top-1/4 w-[600px] h-[600px] rounded-full blur-[150px] transition-all duration-1000 ${
          currentSlide.type === "player" 
            ? "bg-primary/20 scale-110" 
            : "bg-primary/10 scale-100"
        }`}
      />

      {/* Player name overlay for player slides */}
      {currentSlide.type === "player" && (
        <div className="absolute bottom-24 right-8 md:right-16 text-right z-10">
          <div className="overflow-hidden">
            <p 
              className="text-xs md:text-sm text-primary/80 uppercase tracking-[0.3em] font-medium animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              {currentSlide.team}
            </p>
          </div>
          <div className="overflow-hidden">
            <h3 
              className="text-2xl md:text-4xl lg:text-5xl font-bold text-foreground/90 animate-slide-up"
              style={{ animationDelay: "0.4s" }}
            >
              {currentSlide.name}
            </h3>
          </div>
        </div>
      )}

      {/* Stadium name for stadium slides */}
      {currentSlide.type === "stadium" && (
        <div className="absolute bottom-24 right-8 md:right-16 text-right z-10">
          <div className="overflow-hidden">
            <p 
              className="text-xs md:text-sm text-muted-foreground/60 uppercase tracking-[0.3em] font-medium animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              Stadium
            </p>
          </div>
          <div className="overflow-hidden">
            <h3 
              className="text-xl md:text-2xl lg:text-3xl font-light text-foreground/70 animate-slide-up"
              style={{ animationDelay: "0.4s" }}
            >
              {currentSlide.name}
            </h3>
          </div>
        </div>
      )}

      {/* Progress bar indicator */}
      <div className="absolute bottom-8 left-8 right-8 md:left-16 md:right-16 z-10">
        <div className="flex items-center gap-2">
          {/* Slide type indicators */}
          <div className="flex gap-1.5">
            {heroSlides.map((slide, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`group relative h-1 transition-all duration-300 ${
                  index === currentIndex 
                    ? "w-8 md:w-12" 
                    : "w-1.5 hover:w-3"
                }`}
                aria-label={`Go to slide ${index + 1}: ${slide.name}`}
              >
                <div 
                  className={`absolute inset-0 rounded-full transition-colors ${
                    slide.type === "player" 
                      ? index === currentIndex 
                        ? "bg-primary" 
                        : "bg-primary/30 group-hover:bg-primary/50"
                      : index === currentIndex
                        ? "bg-foreground/80"
                        : "bg-foreground/20 group-hover:bg-foreground/40"
                  }`}
                />
                {index === currentIndex && (
                  <div 
                    className="absolute inset-0 rounded-full bg-primary/35 animate-progress-fill origin-left"
                    style={{ animationDuration: "5s" }}
                  />
                )}
              </button>
            ))}
          </div>
          
          {/* Current slide counter */}
          <div className="ml-auto text-xs text-muted-foreground/50 font-mono">
            <span className="text-foreground/80">{String(currentIndex + 1).padStart(2, "0")}</span>
            <span className="mx-1">/</span>
            <span>{String(heroSlides.length).padStart(2, "0")}</span>
          </div>
        </div>
      </div>

      {/* Decorative corner elements */}
      <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-primary/20 rounded-tr-lg" />
      <div className="absolute bottom-20 left-8 w-16 h-16 border-b-2 border-l-2 border-primary/20 rounded-bl-lg" />
    </div>
  )
}

interface NewsHeroBackgroundProps {
  images: string[]
}

export function NewsHeroBackground({ images }: NewsHeroBackgroundProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const displayImages = images.length > 0 ? images.slice(0, 5) : []

  useEffect(() => {
    if (displayImages.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayImages.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [displayImages.length])

  if (displayImages.length === 0) {
    return <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Background Images from News API */}
      {displayImages.map((src, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={src || "/placeholder.svg"}
            alt=""
            fill
            className="object-cover"
            priority={index === 0}
            unoptimized={src.startsWith("http")}
          />
        </div>
      ))}

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />

      {/* Slide Indicators */}
      {displayImages.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {displayImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? "bg-primary w-6" : "bg-primary/30 hover:bg-primary/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
