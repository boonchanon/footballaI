"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  ArrowLeft,
  User,
  Timer,
  Trophy,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Lightbulb,
  Shield,
  Sparkles,
} from "lucide-react"

// --- Types ---
interface PlayerChallenge {
  id: number
  clues: string[]
  answer: string
  options: string[]
}

// --- Data: 12 Premier League player challenges with 6 clues each ---
const allChallenges: PlayerChallenge[] = [
  {
    id: 1,
    clues: [
      "ผมเกิดในทวีปยุโรปตอนเหนือ",
      "ผมเป็นกองหน้าตัวเป้าที่สูงกว่า 190 ซม.",
      "พ่อของผมเคยเป็นนักฟุตบอลอาชีพเช่นกัน",
      "ผมเคยเล่นให้ดอร์ทมุนด์ก่อนมาพรีเมียร์ลีก",
      "ผมทำลายสถิติผู้ทำประตูสูงสุดในฤดูกาลเดียวของพรีเมียร์ลีก",
      "ผมเล่นให้แมนเชสเตอร์ ซิตี้ หมายเลข 9",
    ],
    answer: "เออร์ลิง ฮาแลนด์",
    options: ["เออร์ลิง ฮาแลนด์", "อเล็กซานเดอร์ อิซัค", "อีวาน โทนี่", "โดมินิค โซลันเก้"],
  },
  {
    id: 2,
    clues: [
      "ผมเกิดในทวีปแอฟริกา",
      "ผมเป็นผู้เล่นที่เร็วที่สุดคนหนึ่งในพรีเมียร์ลีก",
      "ผมเคยเล่นให้ทีมในลีกอิตาลี ซีรีอา A ก่อน",
      "ผมทำประตูในนัดชิงชนะเลิศแชมเปียนส์ลีก",
      "ผมเป็นดาวซัลโวพรีเมียร์ลีกหลายสมัย",
      "ผมเล่นปีกขวาให้ลิเวอร์พูล หมายเลข 11",
    ],
    answer: "โมฮาเหม็ด ซาลาห์",
    options: ["โมฮาเหม็ด ซาลาห์", "ซาดิโอ มาเน่", "ริยาด มาห์เรซ", "นิโกลัส เปเป้"],
  },
  {
    id: 3,
    clues: [
      "ผมเกิดในประเทศอังกฤษ",
      "ผมเริ่มต้นอาชีพในอะคาเดมีของทีมยักษ์ใหญ่สีฟ้า",
      "ผมย้ายสโมสรเพราะต้องการโอกาสลงเล่นตัวจริง",
      "ผมเป็นที่รู้จักจากท่าดีใจ 'Cold Palmer'",
      "ผมเคยทำ 4 ประตูในครึ่งหลังเกมเดียวในพรีเมียร์ลีก",
      "ผมเล่นให้เชลซี หมายเลข 20",
    ],
    answer: "โคล พาล์มเมอร์",
    options: ["โคล พาล์มเมอร์", "ฟิล โฟเดน", "มาร์คัส แรชฟอร์ด", "แจ็ค กรีลิช"],
  },
  {
    id: 4,
    clues: [
      "ผมเกิดในกรุงลอนดอน",
      "ผมเป็นผลผลิตจากอะคาเดมีของสโมสรที่ผมเล่นอยู่",
      "ผมเคยได้รับเลือกเป็นนักเตะยอดเยี่ยมของพรีเมียร์ลีก",
      "ผมเป็นปีกที่ชอบตัดเข้าในจากฝั่งขวา",
      "ผมเล่นให้ทีมชาติอังกฤษตั้งแต่อายุน้อยมาก",
      "ผมสวมเสื้อหมายเลข 7 ของอาร์เซนอล",
    ],
    answer: "บูคาโย ซาก้า",
    options: ["บูคาโย ซาก้า", "เอมิล สมิธ โรว์", "เรียส เนลสัน", "เอ็ดดี้ เอ็นเคเทียห์"],
  },
  {
    id: 5,
    clues: [
      "ผมเกิดในประเทศเบลเยียม",
      "ผมเป็นมิดฟิลด์ที่โด่งดังเรื่องการส่งบอลยาว",
      "ผมเคยทำแอสซิสต์มากที่สุดในฤดูกาลเดียวของพรีเมียร์ลีก",
      "ผมเคยเล่นให้โวล์ฟสบวร์กในบุนเดสลีกา",
      "ผมเป็นกัปตันทีมชาติของผม",
      "ผมเล่นให้แมนเชสเตอร์ ซิตี้ หมายเลข 17",
    ],
    answer: "เควิน เดอ บรอยน์",
    options: ["เควิน เดอ บรอยน์", "เอเดน อาซาร์", "ยูริ ทีเลอม็องส์", "เลอันโดร ทรอสซาร์ด"],
  },
  {
    id: 6,
    clues: [
      "ผมเกิดในประเทศสวีเดน",
      "ผมเป็นกองหน้าที่เล่นอยู่ทางเหนือของอังกฤษ",
      "ผมเคยเล่นให้เรอัล โซเซียดาดในลาลีกา",
      "ผมมีความสูงเกิน 190 ซม. และเป็นสตไรเกอร์ตัวเป้า",
      "ผมเป็นจ่าฝูงดาวซัลโวของทีมหลายฤดูกาลติด",
      "ผมเล่นให้นิวคาสเซิล ยูไนเต็ด",
    ],
    answer: "อเล็กซานเดอร์ อิซัค",
    options: ["อเล็กซานเดอร์ อิซัค", "เออร์ลิง ฮาแลนด์", "วิกเตอร์ ยอเรสโก", "ราสมุส ฮอยลุนด์"],
  },
  {
    id: 7,
    clues: [
      "ผมเกิดในโปรตุเกส",
      "ผมเป็นมิดฟิลด์ตัวรุก ที่ชอบยิงจากนอกกรอบ",
      "ผมเคยเล่นให้สปอร์ติ้ง ลิสบอน ก่อนมาพรีเมียร์ลีก",
      "ผมเป็นกัปตันทีมและเป็นที่รักของแฟนบอล",
      "ผมขึ้นชื่อเรื่องลูกยิงฟรีคิก",
      "ผมเล่นให้แมนเชสเตอร์ ยูไนเต็ด หมายเลข 8",
    ],
    answer: "บรูโน แฟร์นันเดส",
    options: ["บรูโน แฟร์นันเดส", "แบร์นาร์โด ซิลวา", "เปโดร เนโต้", "ดิโอโก้ โชต้า"],
  },
  {
    id: 8,
    clues: [
      "ผมเกิดในประเทศอังกฤษ",
      "ผมเป็นกองกลางตัวรับ ที่มีพลังงานสูงมาก",
      "ผมเคยเล่นให้เวสต์แฮม ยูไนเต็ด ก่อนย้ายทีม",
      "ผมย้ายทีมด้วยค่าตัวสูงเป็นสถิติของสโมสรใหม่",
      "ผมเล่นทั้งกองกลางและแนวรับได้",
      "ผมเล่นให้อาร์เซนอล หมายเลข 41",
    ],
    answer: "เดคแลน ไรซ์",
    options: ["เดคแลน ไรซ์", "โทมัส ปาร์เตย์", "คาเลบ ฮาเวิร์ทซ", "มาร์ติน โอเดการ์ด"],
  },
  {
    id: 9,
    clues: [
      "ผมเกิดในเกาหลีใต้",
      "ผมเป็นกองหน้าที่มีความเร็วสูงมาก",
      "ผมเคยเล่นให้ฮัมบูร์กและไบเออร์ เลเวอร์คูเซน",
      "ผมเป็นกัปตันทีมชาติของผม",
      "ผมเป็นผู้ทำประตูชาวเอเชียสูงสุดในประวัติศาสตร์พรีเมียร์ลีก",
      "ผมเล่นให้สเปอร์ส หมายเลข 7",
    ],
    answer: "ซน ฮึง-มิน",
    options: ["ซน ฮึง-มิน", "ฮวัง ฮี-ชาน", "อี คัง-อิน", "คิม มิน-แจ"],
  },
  {
    id: 10,
    clues: [
      "ผมเกิดในทวีปอเมริกาใต้",
      "ผมเป็นกองหลังตัวกลางที่ดุดัน",
      "ผมเคยเล่นในลีกอิตาลี ซีรีอา A",
      "ผมเป็นที่รู้จักจากการเข้าสกัดที่รุนแรง",
      "ผมเป็นแกนหลักของแนวรับทีมชาติอาร์เจนตินา",
      "ผมเล่นให้สเปอร์ส หมายเลข 17",
    ],
    answer: "คริสเตียน โรเมโร",
    options: ["คริสเตียน โรเมโร", "ลิซานโดร มาร์ติเนซ", "เอมิลิอาโน มาร์ติเนซ", "อเล็กซิส แม็ค อัลลิสเตอร์"],
  },
  {
    id: 11,
    clues: [
      "ผมเกิดในประเทศอังกฤษ",
      "ผมเป็นมิดฟิลด์ตัวรุกที่ผ่านอะคาเดมีของทีมที่ผมเล่นอยู่",
      "ผมเคยถูกปล่อยไปเล่นยืมให้หลายสโมสร",
      "ผมเพิ่งคว้ารางวัลนักเตะยอดเยี่ยมของ PFA",
      "ผมเป็นดาวรุ่งแห่งปีของพรีเมียร์ลีก",
      "ผมเล่นให้แมนเชสเตอร์ ซิตี้ หมายเลข 47",
    ],
    answer: "ฟิล โฟเดน",
    options: ["ฟิล โฟเดน", "โคล พาล์มเมอร์", "แจ็ค กรีลิช", "เมสัน เมาท์"],
  },
  {
    id: 12,
    clues: [
      "ผมเกิดในนอร์เวย์",
      "ผมเป็นมิดฟิลด์ตัวรุกที่สร้างสรรค์เกมรุก",
      "ผมเคยเล่นให้เรอัล มาดริด ตอนเป็นเยาวชน",
      "ผมย้ายมาจากเรอัล โซเซียดาด",
      "ผมเป็นกัปตันทีมตั้งแต่อายุยังน้อย",
      "ผมเล่นให้อาร์เซนอล หมายเลข 8",
    ],
    answer: "มาร์ติน โอเดการ์ด",
    options: ["มาร์ติน โอเดการ์ด", "เจมส์ แมดดิสัน", "บรูโน แฟร์นันเดส", "เควิน เดอ บรอยน์"],
  },
]

// --- Difficulty Config ---
const difficultyConfig = {
  easy: { label: "ง่าย", time: 420, color: "text-emerald-500", bg: "bg-emerald-500", border: "border-emerald-500/30" },
  medium: { label: "ปานกลาง", time: 300, color: "text-amber-500", bg: "bg-amber-500", border: "border-amber-500/30" },
  hard: { label: "ยาก", time: 180, color: "text-red-500", bg: "bg-red-500", border: "border-red-500/30" },
} as const

type Difficulty = keyof typeof difficultyConfig

// --- Helper: shuffle array ---
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// --- Component ---
export default function WhoAmIPage() {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [challenges, setChallenges] = useState<PlayerChallenge[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealedClues, setRevealedClues] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [results, setResults] = useState<{ correct: boolean; answer: string; selected: string }[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentChallenge = challenges[currentIndex]
  const totalChallenges = 6

  // Start game
  const startGame = useCallback((d: Difficulty) => {
    setDifficulty(d)
    const shuffled = shuffle(allChallenges).slice(0, totalChallenges)
    setChallenges(shuffled)
    setCurrentIndex(0)
    setRevealedClues(1)
    setSelected(null)
    setAnswered(false)
    setScore(0)
    setResults([])
    setTimeLeft(difficultyConfig[d].time)
    setGameOver(false)
    setShuffledOptions(shuffle(shuffled[0].options))
  }, [])

  // Timer
  useEffect(() => {
    if (difficulty && !gameOver) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            setGameOver(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [difficulty, gameOver])

  // Update shuffled options on challenge change
  useEffect(() => {
    if (currentChallenge) {
      setShuffledOptions(shuffle(currentChallenge.options))
    }
  }, [currentChallenge])

  const handleRevealClue = () => {
    if (currentChallenge && revealedClues < currentChallenge.clues.length) {
      setRevealedClues((prev) => prev + 1)
    }
  }

  const handleAnswer = (option: string) => {
    if (answered || gameOver) return
    setSelected(option)
    setAnswered(true)

    const isCorrect = option === currentChallenge.answer
    // Score: more points for fewer clues revealed
    const clueBonus = Math.max(0, 7 - revealedClues)
    const pointsEarned = isCorrect ? 10 + clueBonus * 5 : 0
    setScore((prev) => prev + pointsEarned)
    setResults((prev) => [...prev, { correct: isCorrect, answer: currentChallenge.answer, selected: option }])
  }

  const handleNext = () => {
    if (currentIndex + 1 >= totalChallenges) {
      setGameOver(true)
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      setCurrentIndex((prev) => prev + 1)
      setRevealedClues(1)
      setSelected(null)
      setAnswered(false)
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const totalTime = difficulty ? difficultyConfig[difficulty].time : 1
  const timerPercent = (timeLeft / totalTime) * 100
  const timerColor = timerPercent > 50 ? "bg-emerald-500" : timerPercent > 20 ? "bg-amber-500" : "bg-red-500"

  // --- Screens ---

  // Difficulty select screen
  if (!difficulty) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="border-b border-border bg-muted/20">
          <div className="container mx-auto px-4 py-6">
            <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" />
              กลับไปหน้าเกม
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-display">Who Am I?</h1>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">+40 แต้ม/ข้อ</Badge>
                </div>
                <p className="text-muted-foreground text-sm mt-1">ทายชื่อนักเตะจากคำใบ้ ยิ่งเปิดน้อย ยิ่งได้แต้มเยอะ</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-display mb-3">เลือกระดับความยาก</h2>
              <p className="text-muted-foreground">ระดับที่ยากกว่าจะมีเวลาน้อยลง แต่ได้ความท้าทายมากขึ้น</p>
            </div>

            <div className="grid gap-4">
              {(Object.entries(difficultyConfig) as [Difficulty, typeof difficultyConfig.easy][]).map(([key, config]) => (
                <Card
                  key={key}
                  className={`border-border/50 hover:${config.border} transition-all cursor-pointer group`}
                  onClick={() => startGame(key)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${config.bg}/10 flex items-center justify-center`}>
                          <Timer className={`w-6 h-6 ${config.color}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            {config.label}
                            <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                              {Math.floor(config.time / 60)} นาที
                            </Badge>
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {key === "easy" && "เวลาเยอะ เหมาะสำหรับผู้เล่นใหม่"}
                            {key === "medium" && "ท้าทายพอดี สำหรับคนที่รู้จักนักเตะดี"}
                            {key === "hard" && "เวลาน้อยมาก สำหรับผู้เชี่ยวชาญเท่านั้น"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border/50 mt-8">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  วิธีเล่น
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-semibold mt-0.5">1.</span>
                    คุณจะได้รับคำใบ้เกี่ยวกับนักเตะพรีเมียร์ลีกทีละข้อ
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-semibold mt-0.5">2.</span>
                    กดปุ่ม "เปิดคำใบ้ถัดไป" เพื่อดูคำใบ้เพิ่มเติม
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-semibold mt-0.5">3.</span>
                    เมื่อคิดว่ารู้แล้ว เลือกคำตอบจากตัวเลือก 4 ตัว
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-semibold mt-0.5">4.</span>
                    ยิ่งเปิดคำใบ้น้อย ยิ่งได้คะแนนเยอะ (สูงสุด 40 แต้มต่อข้อ)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-semibold mt-0.5">5.</span>
                    ทั้งหมด 6 ข้อ ต้องตอบให้ทันภายในเวลาที่กำหนด
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer />
      </div>
    )
  }

  // Game over / results screen
  if (gameOver) {
    const answeredCount = results.length
    const correctCount = results.filter((r) => r.correct).length
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0
    const grade =
      accuracy >= 90 ? "S" : accuracy >= 70 ? "A" : accuracy >= 50 ? "B" : accuracy >= 30 ? "C" : "D"
    const gradeColor =
      grade === "S"
        ? "text-amber-500"
        : grade === "A"
          ? "text-emerald-500"
          : grade === "B"
            ? "text-sky-500"
            : grade === "C"
              ? "text-orange-500"
              : "text-red-500"

    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="border-primary/30">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl font-display mb-2">
                  {timeLeft <= 0 ? "หมดเวลา!" : "จบเกม!"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  คุณตอบถูก {correctCount} จาก {answeredCount} ข้อ
                  {answeredCount < totalChallenges && ` (เหลืออีก ${totalChallenges - answeredCount} ข้อที่ยังไม่ได้ตอบ)`}
                </p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-muted/30 rounded-xl p-4">
                    <p className={`text-4xl font-display ${gradeColor}`}>{grade}</p>
                    <p className="text-xs text-muted-foreground mt-1">เกรด</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4">
                    <p className="text-4xl font-display text-primary">{score}</p>
                    <p className="text-xs text-muted-foreground mt-1">คะแนนรวม</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4">
                    <p className="text-4xl font-display text-foreground">{accuracy}%</p>
                    <p className="text-xs text-muted-foreground mt-1">ความแม่นยำ</p>
                  </div>
                </div>

                {/* Results detail */}
                <div className="space-y-3 mb-8 text-left">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        r.correct ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-red-500/5 border border-red-500/20"
                      }`}
                    >
                      {r.correct ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{r.answer}</p>
                        {!r.correct && (
                          <p className="text-xs text-muted-foreground">คุณเลือก: {r.selected}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Show unanswered */}
                  {answeredCount < totalChallenges && (
                    Array.from({ length: totalChallenges - answeredCount }).map((_, i) => (
                      <div key={`unanswered-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <Timer className="w-5 h-5 text-muted-foreground shrink-0" />
                        <p className="text-sm text-muted-foreground">ไม่ได้ตอบ (หมดเวลา)</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  <Button onClick={() => startGame(difficulty)} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    เล่นอีกครั้ง ({difficultyConfig[difficulty].label})
                  </Button>
                  <Button variant="outline" className="bg-transparent gap-2" onClick={() => setDifficulty(null)}>
                    เปลี่ยนระดับ
                  </Button>
                  <Button asChild variant="outline" className="bg-transparent gap-1">
                    <Link href="/games">กลับหน้าเกม</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Active game screen
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Timer bar - sticky at top */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                ข้อ {currentIndex + 1}/{totalChallenges}
              </span>
              <Badge variant="outline" className={`text-[10px] ${difficultyConfig[difficulty].color}`}>
                {difficultyConfig[difficulty].label}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                คะแนน: <span className="text-primary">{score}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <Timer className={`w-4 h-4 ${timerPercent <= 20 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
                <span className={`text-sm font-mono font-semibold ${timerPercent <= 20 ? "text-red-500" : "text-foreground"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerColor}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Question card */}
          <Card className="border-border/50 mb-6">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-display">Who Am I?</h2>
                  <p className="text-xs text-muted-foreground">
                    เปิดคำใบ้แล้ว {revealedClues}/{currentChallenge?.clues.length || 6} ข้อ
                  </p>
                </div>
              </div>

              {/* Clues */}
              <div className="space-y-3 mb-6">
                {currentChallenge?.clues.map((clue, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                      i < revealedClues
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-muted/30 border border-border/50"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      i < revealedClues ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </div>
                    {i < revealedClues ? (
                      <p className="text-sm leading-relaxed pt-0.5">{clue}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground pt-0.5 italic">{"???  ???  ???  ???"}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Reveal button */}
              {!answered && currentChallenge && revealedClues < currentChallenge.clues.length && (
                <Button variant="outline" className="w-full bg-transparent gap-2 mb-6" onClick={handleRevealClue}>
                  <Eye className="w-4 h-4" />
                  เปิดคำใบ้ถัดไป (คำใบ้ที่ {revealedClues + 1})
                </Button>
              )}

              {/* Score indicator */}
              {!answered && (
                <div className="text-center mb-4">
                  <p className="text-xs text-muted-foreground">
                    ตอบตอนนี้จะได้{" "}
                    <span className="text-primary font-semibold">
                      {10 + Math.max(0, 7 - revealedClues) * 5} แต้ม
                    </span>
                  </p>
                </div>
              )}

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shuffledOptions.map((option) => {
                  const isCorrectAnswer = option === currentChallenge?.answer
                  const isSelected = option === selected

                  let buttonStyle = "bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                  if (answered) {
                    if (isCorrectAnswer) {
                      buttonStyle = "bg-emerald-500/10 border-emerald-500/50 text-emerald-500"
                    } else if (isSelected && !isCorrectAnswer) {
                      buttonStyle = "bg-red-500/10 border-red-500/50 text-red-500"
                    } else {
                      buttonStyle = "opacity-50"
                    }
                  }

                  return (
                    <Button
                      key={option}
                      variant="outline"
                      className={`h-auto py-3 px-4 rounded-lg transition-all justify-start text-left ${buttonStyle}`}
                      onClick={() => handleAnswer(option)}
                      disabled={answered}
                    >
                      <div className="flex items-center gap-2">
                        {answered && isCorrectAnswer && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                        {answered && isSelected && !isCorrectAnswer && <XCircle className="w-4 h-4 shrink-0" />}
                        {!answered && <Shield className="w-4 h-4 text-muted-foreground shrink-0" />}
                        <span className="text-sm">{option}</span>
                      </div>
                    </Button>
                  )
                })}
              </div>

              {/* Result feedback */}
              {answered && (
                <div className={`mt-6 p-4 rounded-lg text-center ${
                  selected === currentChallenge?.answer
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-red-500/10 border border-red-500/20"
                }`}>
                  {selected === currentChallenge?.answer ? (
                    <>
                      <p className="text-emerald-500 font-semibold">ถูกต้อง!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        +{10 + Math.max(0, 7 - revealedClues) * 5} แต้ม (ใช้คำใบ้ {revealedClues} ข้อ)
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-red-500 font-semibold">ผิด!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        คำตอบที่ถูกคือ <span className="font-semibold text-foreground">{currentChallenge?.answer}</span>
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next button */}
          {answered && (
            <Button size="lg" className="w-full h-14 rounded-xl shadow-lg shadow-primary/20 gap-2 text-lg" onClick={handleNext}>
              {currentIndex + 1 >= totalChallenges ? (
                <>
                  <Trophy className="w-5 h-5" />
                  ดูผลลัพธ์
                </>
              ) : (
                <>
                  ข้อถัดไป
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
