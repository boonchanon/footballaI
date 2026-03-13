"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Brain,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  ChevronRight,
  RotateCcw,
  Timer,
  Zap,
  Star,
  TrendingUp,
  CircleDot,
  ArrowRight,
  Flame,
} from "lucide-react"

// ─── Question Banks ───

const worldCupQuestions = [
  { id: "wc1", question: "ฟุตบอลโลก 2022 จัดที่ประเทศใด?", options: ["ซาอุดิอาระเบีย", "กาตาร์", "สหรัฐอาหรับเอมิเรตส์", "บาห์เรน"], answer: 1 },
  { id: "wc2", question: "ทีมใดชนะฟุตบอลโลกมากที่สุด (5 สมัย)?", options: ["เยอรมนี", "อิตาลี", "บราซิล", "อาร์เจนตินา"], answer: 2 },
  { id: "wc3", question: "ฟุตบอลโลก 2026 จะจัดที่ประเทศใดร่วมกัน?", options: ["สหรัฐ, แคนาดา, เม็กซิโก", "จีน, ญี่ปุ่น, เกาหลี", "อังกฤษ, สกอตแลนด์, เวลส์", "สเปน, โปรตุเกส, โมร็อกโก"], answer: 0 },
  { id: "wc4", question: "ใครเป็นดาวซัลโวฟุตบอลโลกตลอดกาล?", options: ["Ronaldo (บราซิล)", "Miroslav Klose", "Pele", "Gerd Muller"], answer: 1 },
  { id: "wc5", question: "ฟุตบอลโลกครั้งแรกจัดขึ้นที่ประเทศใดในปี 1930?", options: ["บราซิล", "อิตาลี", "อุรุกวัย", "ฝรั่งเศส"], answer: 2 },
  { id: "wc6", question: "ทีมใดแพ้รอบชิงชนะเลิศฟุตบอลโลกมากที่สุด?", options: ["เนเธอร์แลนด์", "เยอรมนี", "อาร์เจนตินา", "บราซิล"], answer: 1 },
  { id: "wc7", question: "ใครทำประตูในรอบชิงชนะเลิศฟุตบอลโลก 2022 ทำ Hat-trick?", options: ["Lionel Messi", "Kylian Mbappe", "Julian Alvarez", "Olivier Giroud"], answer: 1 },
  { id: "wc8", question: "ฟุตบอลโลก 2018 จัดที่ประเทศใด?", options: ["บราซิล", "แอฟริกาใต้", "รัสเซีย", "กาตาร์"], answer: 2 },
  { id: "wc9", question: "ทีมชาติใดที่ไม่เคยผ่านรอบแบ่งกลุ่มฟุตบอลโลกเลย?", options: ["อินเดีย", "จีน", "แคนาดา", "ถูกทุกข้อ"], answer: 3 },
  { id: "wc10", question: "ใครเป็นผู้รักษาประตูที่ได้รางวัล Golden Glove ในฟุตบอลโลก 2022?", options: ["Hugo Lloris", "Emiliano Martinez", "Yassine Bounou", "Dominik Livakovic"], answer: 1 },
  { id: "wc11", question: "ฟุตบอลโลก 2014 จัดที่ประเทศใด?", options: ["แอฟริกาใต้", "บราซิล", "รัสเซีย", "เยอรมนี"], answer: 1 },
  { id: "wc12", question: "เยอรมนีเอาชนะบราซิล 7-1 ในฟุตบอลโลกปีใด?", options: ["2010", "2014", "2018", "2006"], answer: 1 },
  { id: "wc13", question: "ทีมใดชนะฟุตบอลโลก 2010?", options: ["เนเธอร์แลนด์", "เยอรมนี", "สเปน", "บราซิล"], answer: 2 },
  { id: "wc14", question: "Zinedine Zidane โดนใบแดงในรอบชิงชนะเลิศฟุตบอลโลกปีใด?", options: ["1998", "2002", "2006", "2010"], answer: 2 },
  { id: "wc15", question: "ทีมเจ้าภาพฟุตบอลโลกที่ตกรอบเร็วที่สุดในรอบแบ่งกลุ่มคือทีมใด?", options: ["แอฟริกาใต้ 2010", "ญี่ปุ่น 2002", "กาตาร์ 2022", "รัสเซีย 2018"], answer: 2 },
  { id: "wc16", question: "ประเทศใดเป็นแชมป์ฟุตบอลโลก 1998?", options: ["บราซิล", "ฝรั่งเศส", "อิตาลี", "เยอรมนี"], answer: 1 },
  { id: "wc17", question: "ใครทำประตูเร็วที่สุดในประวัติศาสตร์ฟุตบอลโลก (11 วินาที)?", options: ["Hakan Sukur", "Ronaldo", "Clint Dempsey", "Thomas Muller"], answer: 0 },
  { id: "wc18", question: "ฟุตบอลโลกปีใดที่มีการใช้ VAR เป็นครั้งแรก?", options: ["2014", "2018", "2022", "2010"], answer: 1 },
  { id: "wc19", question: "ทีมชาติอังกฤษชนะฟุตบอลโลกครั้งเดียวในปีใด?", options: ["1962", "1966", "1970", "1958"], answer: 1 },
  { id: "wc20", question: "ใครเป็นนักเตะที่ลงเล่นฟุตบอลโลกมากที่สุด?", options: ["Lothar Matthaus", "Paolo Maldini", "Lionel Messi", "Cristiano Ronaldo"], answer: 0 },
]

const legendaryPlayersQuestions = [
  { id: "lp1", question: "Cristiano Ronaldo ทำประตูสูงสุดให้ทีมชาติใด?", options: ["บราซิล", "อาร์เจนตินา", "โปรตุเกส", "ฝรั่งเศส"], answer: 2 },
  { id: "lp2", question: "Lionel Messi เคยเล่นให้สโมสรใดในสเปน?", options: ["เรอัล มาดริด", "บาร์เซโลนา", "แอตเลติโก มาดริด", "เซบีย่า"], answer: 1 },
  { id: "lp3", question: "Zinedine Zidane มีสัญชาติอะไร?", options: ["อิตาลี", "สเปน", "ฝรั่งเศส", "โปรตุเกส"], answer: 2 },
  { id: "lp4", question: "Pele ทำประตูให้ทีมชาติบราซิลกี่ลูก (อย่างเป็นทางการ)?", options: ["67", "77", "87", "97"], answer: 1 },
  { id: "lp5", question: "Diego Maradona มีชื่อเสียงจากเหตุการณ์ 'Hand of God' ในเกมกับทีมใด?", options: ["เยอรมนี", "อิตาลี", "อังกฤษ", "บราซิล"], answer: 2 },
  { id: "lp6", question: "Ronaldinho เคยเล่นให้สโมสรใดในอังกฤษ?", options: ["แมนยู", "เชลซี", "ไม่เคยเล่นในอังกฤษ", "อาร์เซนอล"], answer: 2 },
  { id: "lp7", question: "Thierry Henry เป็นดาวซัลโวตลอดกาลของสโมสรใด?", options: ["บาร์เซโลนา", "โมนาโก", "อาร์เซนอล", "นิวยอร์ก เรดบูลส์"], answer: 2 },
  { id: "lp8", question: "David Beckham สวมเสื้อหมายเลขอะไรที่แมนยู?", options: ["7", "10", "23", "9"], answer: 0 },
  { id: "lp9", question: "Ronaldo (R9) มาจากประเทศใด?", options: ["โปรตุเกส", "สเปน", "บราซิล", "อาร์เจนตินา"], answer: 2 },
  { id: "lp10", question: "Franz Beckenbauer มีชื่อเล่นว่าอะไร?", options: ["Der Bomber", "Der Kaiser", "Die Maschine", "Der Titan"], answer: 1 },
  { id: "lp11", question: "Johan Cruyff มาจากประเทศใด?", options: ["เบลเยียม", "เยอรมนี", "เนเธอร์แลนด์", "เดนมาร์ก"], answer: 2 },
  { id: "lp12", question: "ใครได้รับรางวัล Ballon d'Or มากที่สุดในประวัติศาสตร์?", options: ["Cristiano Ronaldo", "Lionel Messi", "Michel Platini", "Johan Cruyff"], answer: 1 },
  { id: "lp13", question: "George Best เล่นให้สโมสรใดในอังกฤษ?", options: ["ลิเวอร์พูล", "แมนยู", "เชลซี", "สเปอร์ส"], answer: 1 },
  { id: "lp14", question: "Roberto Carlos มีชื่อเสียงจากฟรีคิกกับทีมชาติใด?", options: ["อาร์เจนตินา", "ฝรั่งเศส", "อังกฤษ", "บราซิล"], answer: 3 },
  { id: "lp15", question: "ใครเป็นผู้ทำประตูสูงสุดในหนึ่งปีปฏิทิน (91 ประตูในปี 2012)?", options: ["Cristiano Ronaldo", "Lionel Messi", "Gerd Muller", "Robert Lewandowski"], answer: 1 },
]

const premierLeagueStatsQuestions = [
  { id: "pl1", question: "ใครเป็นผู้ทำประตูสูงสุดตลอดกาลในพรีเมียร์ลีก?", options: ["Wayne Rooney", "Thierry Henry", "Alan Shearer", "Andrew Cole"], answer: 2 },
  { id: "pl2", question: "สโมสรใดชนะพรีเมียร์ลีกโดยไม่แพ้ใครตลอดฤดูกาล (The Invincibles)?", options: ["เชลซี", "แมนยู", "แมนซิตี้", "อาร์เซนอล"], answer: 3 },
  { id: "pl3", question: "ทีมใดชนะพรีเมียร์ลีกมากที่สุด?", options: ["ลิเวอร์พูล", "อาร์เซนอล", "แมนยู", "เชลซี"], answer: 2 },
  { id: "pl4", question: "เลสเตอร์ ซิตี้ คว้าแชมป์พรีเมียร์ลีกในฤดูกาลใด?", options: ["2013/14", "2014/15", "2015/16", "2016/17"], answer: 2 },
  { id: "pl5", question: "ใครเป็นผู้ทำแอสซิสต์สูงสุดตลอดกาลในพรีเมียร์ลีก?", options: ["Ryan Giggs", "David Beckham", "Frank Lampard", "Cesc Fabregas"], answer: 0 },
  { id: "pl6", question: "สโมสรใดเลื่อนชั้นขึ้นมาแล้วจบอันดับ 1 ในพรีเมียร์ลีก?", options: ["เลสเตอร์ ซิตี้", "น็อตติ้งแฮม ฟอเรสต์", "ไม่มีทีมไหนทำได้", "อิปสวิช ทาวน์"], answer: 2 },
  { id: "pl7", question: "ใครทำ Hat-trick เร็วที่สุดในพรีเมียร์ลีก (2 นาที 56 วินาที)?", options: ["Robbie Fowler", "Sadio Mane", "Alan Shearer", "Erling Haaland"], answer: 1 },
  { id: "pl8", question: "ใครเป็นผู้รักษาประตูที่เก็บ Clean Sheet มากที่สุดในพรีเมียร์ลีก?", options: ["David Seaman", "Edwin van der Sar", "Petr Cech", "Peter Schmeichel"], answer: 2 },
  { id: "pl9", question: "ผลแมตช์ที่เป็นชัยชนะด้วยคะแนนที่ห่างที่สุดในพรีเมียร์ลีกคือเท่าใด?", options: ["8-0", "9-0", "10-0", "7-0"], answer: 1 },
  { id: "pl10", question: "ทีมใดเก็บแต้มมากที่สุดในหนึ่งฤดูกาลพรีเมียร์ลีก (100 แต้ม)?", options: ["เชลซี", "ลิเวอร์พูล", "อาร์เซนอล", "แมนซิตี้"], answer: 3 },
  { id: "pl11", question: "ใครเป็นผู้จัดการทีมที่ชนะพรีเมียร์ลีกมากที่สุด?", options: ["Jose Mourinho", "Pep Guardiola", "Sir Alex Ferguson", "Arsene Wenger"], answer: 2 },
  { id: "pl12", question: "ในฤดูกาล 2023/24 ใครเป็นดาวซัลโวของพรีเมียร์ลีก?", options: ["Erling Haaland", "Cole Palmer", "Alexander Isak", "Mohamed Salah"], answer: 0 },
  { id: "pl13", question: "ใครทำประตูไกลที่สุดในพรีเมียร์ลีก?", options: ["David Beckham", "Xabi Alonso", "Asmir Begovic", "Wayne Rooney"], answer: 2 },
  { id: "pl14", question: "ทีมใดได้รับใบแดงมากที่สุดในหนึ่งฤดูกาลพรีเมียร์ลีก?", options: ["ซันเดอร์แลนด์", "อาร์เซนอล", "เอฟเวอร์ตัน", "เชลซี"], answer: 0 },
  { id: "pl15", question: "ใครเป็นผู้เล่นที่อายุน้อยที่สุดที่ยิงประตูในพรีเมียร์ลีก?", options: ["Wayne Rooney", "Michael Owen", "James Vaughan", "Theo Walcott"], answer: 2 },
  { id: "pl16", question: "พรีเมียร์ลีกก่อตั้งขึ้นในปีใด?", options: ["1990", "1991", "1992", "1993"], answer: 2 },
  { id: "pl17", question: "ทีมใดทำประตูมากที่สุดในหนึ่งฤดูกาลพรีเมียร์ลีก?", options: ["ลิเวอร์พูล", "แมนซิตี้", "เชลซี", "แมนยู"], answer: 1 },
  { id: "pl18", question: "ใครเป็นผู้เล่นต่างชาติคนแรกที่ยิง 100 ประตูในพรีเมียร์ลีก?", options: ["Thierry Henry", "Dwight Yorke", "Gianfranco Zola", "Dennis Bergkamp"], answer: 0 },
  { id: "pl19", question: "ในฤดูกาล 2015/16 เลสเตอร์ ซิตี้ เป็นแชมป์ด้วยราคาต่อรองเท่าใด?", options: ["500/1", "1000/1", "2000/1", "5000/1"], answer: 3 },
  { id: "pl20", question: "ใครเป็นผู้เล่นที่ลงเล่นมากที่สุดในพรีเมียร์ลีก?", options: ["Ryan Giggs", "Gareth Barry", "Frank Lampard", "James Milner"], answer: 1 },
  { id: "pl21", question: "ทีมใดเป็นแชมป์พรีเมียร์ลีกฤดูกาลแรกในปี 1992/93?", options: ["อาร์เซนอล", "แมนยู", "แบล็คเบิร์น", "ลิเวอร์พูล"], answer: 1 },
  { id: "pl22", question: "Jamie Vardy ทำประตูติดต่อกันกี่แมตช์ในพรีเมียร์ลีก?", options: ["9", "10", "11", "12"], answer: 2 },
  { id: "pl23", question: "ทีมใดเสียประตูน้อยที่สุดในหนึ่งฤดูกาล (15 ประตู)?", options: ["อาร์เซนอล", "เชลซี", "แมนยู", "ลิเวอร์พูล"], answer: 1 },
  { id: "pl24", question: "Sergio Aguero ยิงประตูแชมป์ในนาทีสุดท้ายของฤดูกาลใด?", options: ["2010/11", "2011/12", "2012/13", "2013/14"], answer: 1 },
  { id: "pl25", question: "ใครเป็นนักเตะที่โดนใบเหลืองมากที่สุดในประวัติศาสตร์พรีเมียร์ลีก?", options: ["Lee Bowyer", "Gareth Barry", "Kevin Davies", "Lee Cattermole"], answer: 1 },
]

const clubsAndStadiumsQuestions = [
  { id: "cs1", question: "สนามเหย้าของ Manchester United ชื่อว่าอะไร?", options: ["Anfield", "Etihad Stadium", "Old Trafford", "Stamford Bridge"], answer: 2 },
  { id: "cs2", question: "สนาม Anfield เป็นสนามเหย้าของสโมสรใด?", options: ["Everton", "Liverpool", "Manchester City", "Tottenham"], answer: 1 },
  { id: "cs3", question: "สนาม Emirates Stadium เป็นสนามเหย้าของทีมใด?", options: ["แมนซิตี้", "เชลซี", "อาร์เซนอล", "สเปอร์ส"], answer: 2 },
  { id: "cs4", question: "สนาม Camp Nou อยู่ที่เมืองใด?", options: ["มาดริด", "บาร์เซโลนา", "ลิสบอน", "มิลาน"], answer: 1 },
  { id: "cs5", question: "สนาม Santiago Bernabeu เป็นสนามเหย้าของทีมใด?", options: ["บาร์เซโลนา", "แอตเลติโก มาดริด", "เรอัล มาดริด", "เซบีย่า"], answer: 2 },
  { id: "cs6", question: "สนาม San Siro ตั้งอยู่ที่เมืองใด?", options: ["โรม", "ตูริน", "มิลาน", "เนเปิลส์"], answer: 2 },
  { id: "cs7", question: "Tottenham Hotspur Stadium จุคนได้กี่คน (โดยประมาณ)?", options: ["52,000", "58,000", "62,000", "68,000"], answer: 2 },
  { id: "cs8", question: "สโมสร Everton จะย้ายไปเล่นที่สนามใหม่ชื่อว่าอะไร?", options: ["Goodison Park", "Bramley-Moore Dock", "Stanley Park", "Walton Hall"], answer: 1 },
  { id: "cs9", question: "สนาม Stamford Bridge เป็นสนามเหย้าของทีมใด?", options: ["อาร์เซนอล", "สเปอร์ส", "แมนยู", "เชลซี"], answer: 3 },
  { id: "cs10", question: "สนาม Wembley จุคนได้กี่คน?", options: ["80,000", "85,000", "90,000", "95,000"], answer: 2 },
  { id: "cs11", question: "สนาม Etihad Stadium เป็นสนามเหย้าของทีมใด?", options: ["แมนยู", "แมนซิตี้", "ลิเวอร์พูล", "เชลซี"], answer: 1 },
  { id: "cs12", question: "สนาม Maracana อยู่ที่เมืองใด?", options: ["เซาเปาโล", "บัวโนสไอเรส", "รีโอเดจาเนโร", "ลิมา"], answer: 2 },
  { id: "cs13", question: "สโมสรใดมีฉายาว่า 'The Gunners'?", options: ["สเปอร์ส", "เชลซี", "อาร์เซนอล", "เวสต์แฮม"], answer: 2 },
  { id: "cs14", question: "สโมสรใดมีฉายาว่า 'The Red Devils'?", options: ["ลิเวอร์พูล", "แมนยู", "อาร์เซนอล", "เซาแธมป์ตัน"], answer: 1 },
  { id: "cs15", question: "สนาม Signal Iduna Park เป็นสนามเหย้าของทีมใด?", options: ["บาเยิร์น มิวนิก", "โบรุสเซีย ดอร์ทมุนด์", "แอร์เบ ไลป์ซิก", "ชาลเก้ 04"], answer: 1 },
]

const categoryMap: Record<string, {
  title: string
  questions: typeof worldCupQuestions
  difficulty: string
  icon: typeof Trophy
  color: string
  bgColor: string
}> = {
  "world-cup": {
    title: "ประวัติศาสตร์ฟุตบอลโลก",
    questions: worldCupQuestions,
    difficulty: "ยาก",
    icon: Trophy,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  "legendary-players": {
    title: "นักเตะในตำนาน",
    questions: legendaryPlayersQuestions,
    difficulty: "ปานกลาง",
    icon: Star,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  "premier-league-stats": {
    title: "สถิติพรีเมียร์ลีก",
    questions: premierLeagueStatsQuestions,
    difficulty: "ง่าย",
    icon: TrendingUp,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  "clubs-stadiums": {
    title: "สโมสรและสนาม",
    questions: clubsAndStadiumsQuestions,
    difficulty: "ปานกลาง",
    icon: CircleDot,
    color: "text-sky-500",
    bgColor: "bg-sky-500/10",
  },
}

const categories = [
  { key: "world-cup", title: "ประวัติศาสตร์ฟุตบอลโลก", questions: 20, difficulty: "ยาก", icon: Trophy, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  { key: "legendary-players", title: "นักเตะในตำนาน", questions: 15, difficulty: "ปานกลาง", icon: Star, color: "text-primary", bgColor: "bg-primary/10" },
  { key: "premier-league-stats", title: "สถิติพรีเมียร์ลีก", questions: 25, difficulty: "ง่าย", icon: TrendingUp, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  { key: "clubs-stadiums", title: "สโมสรและสนาม", questions: 15, difficulty: "ปานกลาง", icon: CircleDot, color: "text-sky-500", bgColor: "bg-sky-500/10" },
]

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const TIME_PER_QUESTION = 15

export default function QuizPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <QuizPage />
    </Suspense>
  )
}

function QuizPage() {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get("category")

  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam)
  const [gameStarted, setGameStarted] = useState(false)
  const [questions, setQuestions] = useState<typeof worldCupQuestions>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<Array<{ correct: boolean; question: string }>>([])
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentQuestion = questions[currentIndex]
  const isFinished = gameStarted && currentIndex >= questions.length

  // Timer countdown
  useEffect(() => {
    if (gameStarted && !showResult && !isFinished && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up - auto submit wrong answer
            clearInterval(timerRef.current!)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [gameStarted, showResult, isFinished, currentIndex])

  // Handle time's up
  useEffect(() => {
    if (timeLeft === 0 && gameStarted && !showResult && !isFinished) {
      setShowResult(true)
      setAnswers((prev) => [...prev, { correct: false, question: currentQuestion.question }])
      setStreak(0)
    }
  }, [timeLeft, gameStarted, showResult, isFinished])

  const startGame = useCallback((catKey: string) => {
    const cat = categoryMap[catKey]
    if (!cat) return
    const shuffled = shuffleArray(cat.questions)
    setQuestions(shuffled)
    setSelectedCategory(catKey)
    setGameStarted(true)
    setCurrentIndex(0)
    setScore(0)
    setAnswers([])
    setSelectedAnswer(null)
    setShowResult(false)
    setTimeLeft(TIME_PER_QUESTION)
    setStreak(0)
    setBestStreak(0)
  }, [])

  const handleAnswer = (optionIndex: number) => {
    if (showResult) return
    if (timerRef.current) clearInterval(timerRef.current)
    setSelectedAnswer(optionIndex)
    setShowResult(true)

    const isCorrect = optionIndex === currentQuestion.answer
    if (isCorrect) {
      const timeBonus = timeLeft >= 10 ? 5 : timeLeft >= 5 ? 3 : 1
      setScore((prev) => prev + 10 + timeBonus)
      setStreak((prev) => {
        const newStreak = prev + 1
        setBestStreak((best) => Math.max(best, newStreak))
        return newStreak
      })
    } else {
      setStreak(0)
    }
    setAnswers((prev) => [...prev, { correct: isCorrect, question: currentQuestion.question }])
  }

  const nextQuestion = () => {
    setSelectedAnswer(null)
    setShowResult(false)
    setCurrentIndex((prev) => prev + 1)
    setTimeLeft(TIME_PER_QUESTION)
  }

  const goBackToCategories = () => {
    setSelectedCategory(null)
    setGameStarted(false)
    setQuestions([])
    setCurrentIndex(0)
    setScore(0)
    setAnswers([])
    setSelectedAnswer(null)
    setShowResult(false)
    setStreak(0)
    setBestStreak(0)
  }

  // ─── Category Selection Screen ───
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="border-b border-border bg-muted/20">
          <div className="container mx-auto px-4 py-6">
            <Link
              href="/games"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับไปหน้าเกม
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display">แบบทดสอบความรู้ฟุตบอล</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  ทดสอบความรู้ฟุตบอลของคุณ สะสมแต้มไต่อันดับ
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-display mb-3">เลือกหมวดหมู่</h2>
              <p className="text-muted-foreground">เลือกหมวดหมู่ที่คุณต้องการทดสอบ คำถามจะถูกสุ่มทุกครั้ง</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {categories.map((cat) => {
                const IconComp = cat.icon
                return (
                  <button
                    key={cat.key}
                    type="button"
                    className="text-left"
                    onClick={() => startGame(cat.key)}
                  >
                    <Card className="border-border/50 hover:border-primary/50 transition-all group cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-xl ${cat.bgColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                            <IconComp className={`w-7 h-7 ${cat.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-1">{cat.title}</h3>
                            <p className="text-sm text-muted-foreground mb-3">{cat.questions} คำถาม</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{cat.difficulty}</Badge>
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                                +10 แต้ม/ข้อ
                              </Badge>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                )
              })}
            </div>

            {/* Rules */}
            <Card className="mt-8 border-border/50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">กฎกติกา</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Timer className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">15 วินาที</p>
                      <p className="text-xs text-muted-foreground">ต่อ 1 คำถาม หมดเวลาถือว่าตอบผิด</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">โบนัสเวลา</p>
                      <p className="text-xs text-muted-foreground">ตอบเร็วได้แต้มโบนัสเพิ่ม +1 ถึง +5</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Flame className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Streak</p>
                      <p className="text-xs text-muted-foreground">ตอบถูกติดต่อกันสะสม Streak</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer />
      </div>
    )
  }

  // ─── Finished Screen ───
  if (isFinished) {
    const totalPossible = questions.length * 15
    const percentage = Math.round((score / totalPossible) * 100)
    const correctCount = answers.filter((a) => a.correct).length
    const catData = selectedCategory ? categoryMap[selectedCategory] : null
    const CatIcon = catData?.icon || Brain

    return (
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="border-primary/30 overflow-hidden">
              <div className="bg-gradient-to-b from-primary/10 to-transparent p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl md:text-4xl font-display mb-2">จบแล้ว!</h2>
                {catData && (
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CatIcon className={`w-4 h-4 ${catData.color}`} />
                    <span className="text-sm text-muted-foreground">{catData.title}</span>
                  </div>
                )}
                <p className="text-muted-foreground">
                  คุณตอบถูก {correctCount} จาก {questions.length} ข้อ
                </p>
              </div>

              <CardContent className="p-6">
                {/* Score display */}
                <div className="flex items-center justify-center gap-6 py-6 mb-6 border-b border-border">
                  <div className="text-center">
                    <p className="text-5xl font-display text-primary">{score}</p>
                    <p className="text-sm text-muted-foreground">แต้มที่ได้</p>
                  </div>
                  <div className="w-px h-12 bg-border" />
                  <div className="text-center">
                    <p className="text-5xl font-display text-foreground">{Math.round((correctCount / questions.length) * 100)}%</p>
                    <p className="text-sm text-muted-foreground">ความแม่นยำ</p>
                  </div>
                  <div className="w-px h-12 bg-border" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Flame className="w-6 h-6 text-amber-500" />
                      <p className="text-5xl font-display text-amber-500">{bestStreak}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Best Streak</p>
                  </div>
                </div>

                {/* Grade */}
                <div className="text-center mb-6">
                  {percentage >= 80 ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-sm px-4 py-1">
                      ยอดเยี่ยม! คุณเป็นผู้เชี่ยวชาญ
                    </Badge>
                  ) : percentage >= 60 ? (
                    <Badge className="bg-sky-500/10 text-sky-500 border-sky-500/20 text-sm px-4 py-1">
                      ดีมาก! ความรู้กว้างขวาง
                    </Badge>
                  ) : percentage >= 40 ? (
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-sm px-4 py-1">
                      พอใช้! ลองอีกครั้งนะ
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-sm px-4 py-1">
                      ต้องฝึกเพิ่ม! ลองอีกครั้ง
                    </Badge>
                  )}
                </div>

                {/* Answer summary */}
                <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto">
                  {answers.map((a, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
                        a.correct ? "bg-emerald-500/5" : "bg-red-500/5"
                      }`}
                    >
                      {a.correct ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <span className="truncate">
                        <span className="text-muted-foreground mr-1">ข้อ {i + 1}.</span>
                        {a.question}
                      </span>
                      <span className={`ml-auto shrink-0 font-medium ${a.correct ? "text-emerald-500" : "text-red-500"}`}>
                        {a.correct ? "ถูก" : "ผิด"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap justify-center gap-3">
                  <Button className="gap-2" onClick={() => selectedCategory && startGame(selectedCategory)}>
                    <RotateCcw className="w-4 h-4" />
                    เล่นหมวดเดิมอีกครั้ง
                  </Button>
                  <Button variant="outline" className="bg-transparent gap-1" onClick={goBackToCategories}>
                    เลือกหมวดอื่น
                  </Button>
                  <Button asChild variant="outline" className="bg-transparent gap-1">
                    <Link href="/games">
                      กลับหน้าเกม <ChevronRight className="w-4 h-4" />
                    </Link>
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

  // ─── Quiz In Progress ───
  const catData = selectedCategory ? categoryMap[selectedCategory] : null
  const CatIcon = catData?.icon || Brain
  const timerPercentage = (timeLeft / TIME_PER_QUESTION) * 100

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Progress bar */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                ข้อ {currentIndex + 1}/{questions.length}
              </span>
              {catData && (
                <Badge variant="outline" className="text-[10px]">
                  <CatIcon className={`w-3 h-3 mr-1 ${catData.color}`} />
                  {catData.title}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              {streak >= 2 && (
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-500">{streak}</span>
                </div>
              )}
              <Badge variant="outline" className="text-xs">
                {score} แต้ม
              </Badge>
            </div>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Timer */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Timer className={`w-4 h-4 ${timeLeft <= 5 ? "text-red-500" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${timeLeft <= 5 ? "text-red-500" : "text-foreground"}`}>
                  {timeLeft} วินาที
                </span>
              </div>
              {timeLeft > 0 && !showResult && (
                <span className="text-xs text-muted-foreground">
                  โบนัสเวลา: +{timeLeft >= 10 ? 5 : timeLeft >= 5 ? 3 : 1}
                </span>
              )}
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${timerPercentage}%` }}
              />
            </div>
          </div>

          {/* Category badge */}
          <Badge variant="outline" className="mb-4 text-xs">
            {currentQuestion.id.startsWith("wc") ? "ประวัติศาสตร์ฟุตบอลโลก" :
             currentQuestion.id.startsWith("lp") ? "นักเตะในตำนาน" :
             currentQuestion.id.startsWith("pl") ? "สถิติพรีเมียร์ลีก" :
             "สโมสรและสนาม"}
          </Badge>

          {/* Question */}
          <h2 className="text-2xl md:text-3xl font-display mb-8">{currentQuestion.question}</h2>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, i) => {
              let optionStyle = "border-border/50 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
              if (showResult) {
                if (i === currentQuestion.answer) {
                  optionStyle = "border-emerald-500 bg-emerald-500/10"
                } else if (i === selectedAnswer && i !== currentQuestion.answer) {
                  optionStyle = "border-red-500 bg-red-500/10"
                } else {
                  optionStyle = "border-border/30 opacity-50"
                }
              } else if (selectedAnswer === i) {
                optionStyle = "border-primary bg-primary/10"
              }

              return (
                <button
                  key={i}
                  type="button"
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${optionStyle} ${
                    showResult ? "pointer-events-none" : ""
                  }`}
                  onClick={() => handleAnswer(i)}
                  disabled={showResult}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-display text-xl ${
                      showResult && i === currentQuestion.answer
                        ? "bg-emerald-500/20 text-emerald-500"
                        : showResult && i === selectedAnswer
                          ? "bg-red-500/20 text-red-500"
                          : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {showResult && i === currentQuestion.answer ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : showResult && i === selectedAnswer && i !== currentQuestion.answer ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </div>
                  <span className="text-base font-medium">{option}</span>
                </button>
              )
            })}
          </div>

          {/* Result feedback */}
          {showResult && (
            <div className="mt-6">
              {selectedAnswer === currentQuestion.answer ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="font-medium">ถูกต้อง! +{10 + (timeLeft >= 10 ? 5 : timeLeft >= 5 ? 3 : 1)} แต้ม</span>
                  {streak >= 2 && (
                    <span className="ml-auto flex items-center gap-1 text-amber-500">
                      <Flame className="w-4 h-4" /> Streak x{streak}
                    </span>
                  )}
                </div>
              ) : timeLeft === 0 && selectedAnswer === null ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  <Timer className="w-5 h-5 shrink-0" />
                  <span className="font-medium">หมดเวลา! คำตอบที่ถูกคือ: {currentQuestion.options[currentQuestion.answer]}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  <XCircle className="w-5 h-5 shrink-0" />
                  <span className="font-medium">ผิด! คำตอบที่ถูกคือ: {currentQuestion.options[currentQuestion.answer]}</span>
                </div>
              )}

              <Button
                size="lg"
                className="w-full h-14 rounded-xl gap-2 text-lg mt-4"
                onClick={nextQuestion}
              >
                {currentIndex < questions.length - 1 ? "ข้อถัดไป" : "ดูผลลัพธ์"}
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
