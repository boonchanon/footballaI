"use client"

import { useState, useEffect, useCallback } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Globe,
  Calendar,
  Trophy,
  Users,
  MapPin,
  Star,
  Clock,
  Flag,
  ChevronRight,
  Sparkles,
  Target,
  Zap,
  X,
  Shield,
  Award,
  User,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { TeamDetailModal } from "@/components/team-detail-modal"

// ข้อมูลรายละเอียดทีมชาติ
type TeamDetail = {
  history: string
  achievements: string[]
  starPlayers: { name: string; position: string; club: string }[]
  formation: string
  manager: string
  fifaRanking: number
  wcAppearances: number
  bestResult: string
}

const teamDetails: Record<string, TeamDetail> = {
  "สหรัฐอเมริกา": {
    history: "ทีมชาติสหรัฐอเมริกาเข้าร่วมฟุตบอลโลกครั้งแรกในปี 1930 ที่อุรุกวัย ผ่านเข้าถึงรอบรองชนะเลิศ เคยเป็นเจ้าภาพฟุตบอลโลก 1994 ที่ประสบความสำเร็จอย่างมากในเรื่องจำนวนผู้เข้าชม",
    achievements: ["รอบรองชนะเลิศ ฟุตบอลโลก 1930", "รอบ 8 ทีม ฟุตบอลโลก 2002", "เจ้าภาพฟุตบอลโลก 1994", "แชมป์ CONCACAF Gold Cup 7 สมัย"],
    starPlayers: [
      { name: "Christian Pulisic", position: "ปีก", club: "AC Milan" },
      { name: "Weston McKennie", position: "กองกลาง", club: "Juventus" },
      { name: "Gio Reyna", position: "กองกลางรุก", club: "Borussia Dortmund" },
    ],
    formation: "4-3-3",
    manager: "Mauricio Pochettino",
    fifaRanking: 16,
    wcAppearances: 11,
    bestResult: "รอบรองชนะเลิศ (1930)",
  },
  "เม็กซิโก": {
    history: "เม็กซิโกเป็นหนึ่งในทีมที่เข้าร่วมฟุตบอลโลกบ่อยที่สุด เคยเป็นเจ้าภาพ 2 ครั้ง (1970, 1986) และมีประวัติศาสตร์อันยาวนานในวงการฟุตบอล แต่ยังไม่เคยผ่านรอบ 8 ทีมสุดท้ายได้",
    achievements: ["เจ้าภาพฟุตบอลโลก 1970 และ 1986", "เข้ารอบ 8 ทีม ฟุตบอลโลก 1970, 1986", "แชมป์ CONCACAF Gold Cup 12 สมัย", "แชมป์ Confederations Cup 1999"],
    starPlayers: [
      { name: "Hirving Lozano", position: "ปีก", club: "PSV" },
      { name: "Edson Alvarez", position: "กองกลาง", club: "West Ham" },
      { name: "Santiago Gimenez", position: "กองหน้า", club: "Feyenoord" },
    ],
    formation: "4-3-3",
    manager: "Javier Aguirre",
    fifaRanking: 15,
    wcAppearances: 17,
    bestResult: "รอบ 8 ทีม (1970, 1986)",
  },
  "แคนาดา": {
    history: "แคนาดาเคยเข้าร่วมฟุตบอลโลกเพียงครั้งเดียวในปี 1986 และกลับมาอีกครั้งในปี 2022 ที่กาตาร์ ถือเป็นทีมที่กำลังพัฒนาอย่างรวดเร็วในวงการฟุตบอลโลก",
    achievements: ["ผ่านเข้ารอบฟุตบอลโลก 2022", "รอบรองชนะเลิศ Copa America 2024", "แชมป์ CONCACAF Gold Cup 2000", "เจ้าภาพร่วมฟุตบอลโลก 2026"],
    starPlayers: [
      { name: "Alphonso Davies", position: "แบ็คซ้าย", club: "Real Madrid" },
      { name: "Jonathan David", position: "กองหน้า", club: "Lille" },
      { name: "Cyle Larin", position: "กองหน้า", club: "Real Valladolid" },
    ],
    formation: "4-4-2",
    manager: "Jesse Marsch",
    fifaRanking: 40,
    wcAppearances: 3,
    bestResult: "รอบแบ่งกลุ่ม (1986, 2022)",
  },
  "อาร์เจนตินา": {
    history: "อาร์เจนตินาเป็นหนึ่งในทีมที่ประสบความสำเร็จมากที่สุดในประวัติศาสตร์ฟุตบอลโลก คว้าแชมป์ 3 สมัย (1978, 1986, 2022) โดยมี Diego Maradona และ Lionel Messi เป็นตำนาน",
    achievements: ["แชมป์ฟุตบอลโลก 3 สมัย (1978, 1986, 2022)", "แชมป์ Copa America 16 สมัย", "แชมป์ Finalissima 2022", "รองแชมป์ฟุตบอลโลก 3 ครั้ง"],
    starPlayers: [
      { name: "Lionel Messi", position: "กองหน้า", club: "Inter Miami" },
      { name: "Julian Alvarez", position: "กองหน้า", club: "Atletico Madrid" },
      { name: "Enzo Fernandez", position: "กองกลาง", club: "Chelsea" },
    ],
    formation: "4-3-3",
    manager: "Lionel Scaloni",
    fifaRanking: 1,
    wcAppearances: 18,
    bestResult: "แชมป์โลก (1978, 1986, 2022)",
  },
  "ฝรั่งเศส": {
    history: "ฝรั่งเศสเป็นทีมมหาอำนาจของฟุตบอลโลกยุคใหม่ คว้าแชมป์ 2 สมัย (1998, 2018) เป็นเจ้าภาพ 2 ครั้ง และเข้าถึงรอบชิงชนะเลิศ 3 จาก 4 ทัวร์นาเมนต์หลังสุด",
    achievements: ["แชมป์ฟุตบอลโลก 2 สมัย (1998, 2018)", "รองแชมป์ฟุตบอลโลก 2022", "แชมป์ยูโร 2 สมัย (1984, 2000)", "แชมป์ Nations League 2021"],
    starPlayers: [
      { name: "Kylian Mbappe", position: "กองหน้า", club: "Real Madrid" },
      { name: "Antoine Griezmann", position: "กองหน้า", club: "Atletico Madrid" },
      { name: "Aurelien Tchouameni", position: "กองกลาง", club: "Real Madrid" },
    ],
    formation: "4-2-3-1",
    manager: "Didier Deschamps",
    fifaRanking: 2,
    wcAppearances: 16,
    bestResult: "แชมป์โลก (1998, 2018)",
  },
  "บราซิล": {
    history: "บราซิลเป็นทีมที่ประสบความสำเร็จมากที่สุดในประวัติศาสตร์ฟุตบอลโลก คว้าแชมป์ 5 สมัย เป็นทีมเดียวที่เข้าร่วมทุกครั้ง ขึ้นชื่อในสไตล์ Jogo Bonito",
    achievements: ["แชมป์ฟุตบอลโลก 5 สมัย (1958, 1962, 1970, 1994, 2002)", "แชมป์ Copa America 9 สมัย", "แชมป์ Confederations Cup 4 สมัย", "เข้าร่วมฟุตบอลโลกทุกครั้ง"],
    starPlayers: [
      { name: "Vinicius Jr", position: "ปีก", club: "Real Madrid" },
      { name: "Rodrygo", position: "ปีก", club: "Real Madrid" },
      { name: "Bruno Guimaraes", position: "กองกลาง", club: "Newcastle" },
    ],
    formation: "4-2-3-1",
    manager: "Dorival Junior",
    fifaRanking: 5,
    wcAppearances: 22,
    bestResult: "แชมป์โลก 5 สมัย",
  },
  "อังกฤษ": {
    history: "อังกฤษเป็นต้นกำเนิดของฟุตบอล คว้าแชมป์โลกครั้งเดียวในปี 1966 บนแผ่นดินบ้านเกิด ช่วงหลังมีผลงานดีต่อเนื่อง เข้ารอบชิงยูโร 2020 และรอบรองฯ ฟุตบอลโลก 2018",
    achievements: ["แชมป์ฟุตบอลโลก 1966", "รองแชมป์ยูโร 2020, 2024", "รอบรองชนะเลิศฟุตบอลโลก 2018", "รอบ 8 ทีม ฟุตบอลโลก 2022"],
    starPlayers: [
      { name: "Jude Bellingham", position: "กองกลางรุก", club: "Real Madrid" },
      { name: "Bukayo Saka", position: "ปีก", club: "Arsenal" },
      { name: "Phil Foden", position: "กองกลางรุก", club: "Man City" },
    ],
    formation: "4-2-3-1",
    manager: "Thomas Tuchel",
    fifaRanking: 4,
    wcAppearances: 16,
    bestResult: "แชมป์โลก (1966)",
  },
  "สเปน": {
    history: "สเปนครองยุคทองในช่วงปี 2008-2012 คว้าแชมป์ยูโร 2 สมัยติดและแชมป์โลก 2010 ด้วยสไตล์ tiki-taka สุดสวยงาม ล่าสุดคว้าแชมป์ยูโร 2024",
    achievements: ["แชมป์ฟุตบอลโลก 2010", "แชมป์ยูโร 3 สมัย (1964, 2008, 2012, 2024)", "แชมป์ Nations League 2023", "รอบรองชนะเลิศฟุตบอลโลก 2-ครั้ง"],
    starPlayers: [
      { name: "Lamine Yamal", position: "ปีก", club: "Barcelona" },
      { name: "Pedri", position: "กองกลาง", club: "Barcelona" },
      { name: "Rodri", position: "กองกลาง", club: "Man City" },
    ],
    formation: "4-3-3",
    manager: "Luis de la Fuente",
    fifaRanking: 3,
    wcAppearances: 16,
    bestResult: "แชมป์โลก (2010)",
  },
  "เยอรมนี": {
    history: "เยอรมนีเป็นหนึ่งในทีมที่ยิ่งใหญ่ที่สุดในประวัติศาสตร์ คว้าแชมป์โลก 4 สมัย มีความสม่ำเสมอสูง แต่ผลงานช่วงหลังตกลงเล็กน้อย ตกรอบแบ่งกลุ่ม 2 ครั้งติดในปี 2018, 2022",
    achievements: ["แชมป์ฟุตบอลโลก 4 สมัย (1954, 1974, 1990, 2014)", "แชมป์ยูโร 3 สมัย", "แชมป์ Confederations Cup 2017", "รองแชมป์ฟุตบอลโลก 4 ครั้ง"],
    starPlayers: [
      { name: "Florian Wirtz", position: "กองกลางรุก", club: "Bayer Leverkusen" },
      { name: "Jamal Musiala", position: "กองกลางรุก", club: "Bayern Munich" },
      { name: "Kai Havertz", position: "กองหน้า", club: "Arsenal" },
    ],
    formation: "4-2-3-1",
    manager: "Julian Nagelsmann",
    fifaRanking: 11,
    wcAppearances: 20,
    bestResult: "แชมป์โลก 4 สมัย",
  },
  "โปรตุเกส": {
    history: "โปรตุเกสเป็นทีมที่เติบโตขึ้นเรื่อยๆ ในเวทีโลก เข้ารอบรองฯ ฟุตบอลโลก 1966 ด้วยฝีเท้าของ Eusebio และคว้าแชมป์ยูโร 2016 เป็นครั้งแรก",
    achievements: ["แชมป์ยูโร 2016", "แชมป์ Nations League 2019", "รอบรองชนะเลิศฟุตบอลโลก 1966, 2006", "อันดับ 3 ฟุตบอลโลก 1966"],
    starPlayers: [
      { name: "Cristiano Ronaldo", position: "กองหน้า", club: "Al Nassr" },
      { name: "Bernardo Silva", position: "กองกลาง", club: "Man City" },
      { name: "Rafael Leao", position: "ปีก", club: "AC Milan" },
    ],
    formation: "4-3-3",
    manager: "Roberto Martinez",
    fifaRanking: 6,
    wcAppearances: 8,
    bestResult: "อันดับ 3 (1966)",
  },
  "เนเธอร์แลนด์": {
    history: "เนเธอร์แลนด์เป็นทีมที่ขึ้นชื่อในฟุตบอล Total Football ของ Johan Cruyff เข้ารอบชิงฟุตบอลโลก 3 ครั้งแต่ไม่เคยคว้าแชมป์ ถือเป็นทีมที่ดีที่สุดที่ยังไม่เคยได้แชมป์โลก",
    achievements: ["รองแชมป์ฟุตบอลโลก 3 ครั้ง (1974, 1978, 2010)", "แชมป์ยูโร 1988", "อันดับ 3 ฟุตบอลโลก 2014", "รอบ 8 ทีม ฟุตบอลโลก 2022"],
    starPlayers: [
      { name: "Virgil van Dijk", position: "กองหลัง", club: "Liverpool" },
      { name: "Cody Gakpo", position: "ปีก", club: "Liverpool" },
      { name: "Xavi Simons", position: "กองกลางรุก", club: "RB Leipzig" },
    ],
    formation: "3-4-1-2",
    manager: "Ronald Koeman",
    fifaRanking: 7,
    wcAppearances: 11,
    bestResult: "รองแชมป์โลก (1974, 1978, 2010)",
  },
  "เบลเยียม": {
    history: "เบลเยียมมีช่วงยุคทองตั้งแต่ปี 2014 เป็นต้นมา เคยขึ้นอันดับ 1 โลก เข้ารอบรองฯ ฟุตบอลโลก 2018 แต่ยังไม่เคยคว้าแชมป์รายการใหญ่",
    achievements: ["อันดับ 3 ฟุตบอลโลก 2018", "อันดับ 1 FIFA Ranking หลายปี", "รอบ 8 ทีม ฟุตบอลโลก 2014", "รอบ 8 ทีม ยูโร 2020, 2024"],
    starPlayers: [
      { name: "Kevin De Bruyne", position: "กองกลาง", club: "Man City" },
      { name: "Jeremy Doku", position: "ปีก", club: "Man City" },
      { name: "Lois Openda", position: "กองหน้า", club: "RB Leipzig" },
    ],
    formation: "4-3-3",
    manager: "Domenico Tedesco",
    fifaRanking: 8,
    wcAppearances: 14,
    bestResult: "อันดับ 3 (2018)",
  },
  "อิตาลี": {
    history: "อิตาลีเป็นหนึ่งในทีมที่ประสบความสำเร็จมากที่สุด คว้าแชมป์โลก 4 สมัย แต่พลาดฟุตบอลโลก 2018 และ 2022 ติดต่อกัน ถือเป็นช่วงตกต่ำที่สุดในประวัติศาสตร์",
    achievements: ["แชมป์ฟุตบอลโลก 4 สมัย (1934, 1938, 1982, 2006)", "แชมป์ยูโร 2 สมัย (1968, 2020)", "แชมป์ Nations League 2025", "รองแชมป์ฟุตบอลโลก 2 ครั้ง"],
    starPlayers: [
      { name: "Nicolo Barella", position: "กองกลาง", club: "Inter Milan" },
      { name: "Federico Chiesa", position: "ปีก", club: "Liverpool" },
      { name: "Gianluca Scamacca", position: "กองหน้า", club: "Atalanta" },
    ],
    formation: "3-5-2",
    manager: "Luciano Spalletti",
    fifaRanking: 9,
    wcAppearances: 18,
    bestResult: "แชมป์โลก 4 สมัย",
  },
  "โครเอเชีย": {
    history: "โครเอเชียเป็นประเทศเล็กที่ทำผลงานน่าทึ่งในฟุตบอลโลก เข้ารอบชิงชนะเลิศ 2018 และอันดับ 3 ในปี 2022 ด้วยทีมที่แข็งแกร่งเหนือความคาดหมาย",
    achievements: ["รองแชมป์ฟุตบอลโลก 2018", "อันดับ 3 ฟุตบอลโลก 2022", "อันดับ 3 ฟุตบอลโลก 1998", "แชมป์ Nations League 2023 (รอบชิงแพ้)"],
    starPlayers: [
      { name: "Luka Modric", position: "กองกลาง", club: "Real Madrid" },
      { name: "Josko Gvardiol", position: "กองหลัง", club: "Man City" },
      { name: "Mateo Kovacic", position: "กองกลาง", club: "Man City" },
    ],
    formation: "4-3-3",
    manager: "Zlatko Dalic",
    fifaRanking: 10,
    wcAppearances: 7,
    bestResult: "รองแชมป์โลก (2018)",
  },
  "อุรุกวัย": {
    history: "อุรุกวัยเป็นแชมป์ฟุตบอลโลกครั้งแรกในประวัติศาสตร์ (1930) และคว้าแชมป์อีกครั้งในปี 1950 แม้จะเป็นประเทศเล็กแต่มีวัฒนธรรมฟุตบอลที่แข็งแกร่งมาก",
    achievements: ["แชมป์ฟุตบอลโลก 2 สมัย (1930, 1950)", "แชมป์ Copa America 15 สมัย", "แชมป์ Olympics 2 สมัย", "อันดับ 4 ฟุตบอลโลก 2010"],
    starPlayers: [
      { name: "Federico Valverde", position: "กองกลาง", club: "Real Madrid" },
      { name: "Darwin Nunez", position: "กองหน้า", club: "Liverpool" },
      { name: "Ronald Araujo", position: "กองหลัง", club: "Barcelona" },
    ],
    formation: "4-3-3",
    manager: "Marcelo Bielsa",
    fifaRanking: 14,
    wcAppearances: 14,
    bestResult: "แชมป์โลก (1930, 1950)",
  },
  "โคลอมเบีย": {
    history: "โคลอมเบียมีประวัติศาสตร์ยาวนานในวงการฟุตบอลอเมริกาใต้ เข้ารอบ 8 ทีมฟุตบอลโลก 2014 และเข้ารอบชิง Copa America 2024 โดยแพ้อาร์เจนตินาในรอบชิง",
    achievements: ["รอบ 8 ทีม ฟุตบอลโลก 2014", "รองแชมป์ Copa America 2024", "แชมป์ Copa America 2001", "เข้ารอบ 16 ทีม ฟุตบอลโลก 2018"],
    starPlayers: [
      { name: "Luis Diaz", position: "ปีก", club: "Liverpool" },
      { name: "James Rodriguez", position: "กองกลางรุก", club: "Leon" },
      { name: "Jhon Duran", position: "กองหน้า", club: "Aston Villa" },
    ],
    formation: "4-2-3-1",
    manager: "Nestor Lorenzo",
    fifaRanking: 12,
    wcAppearances: 6,
    bestResult: "รอบ 8 ทีม (2014)",
  },
  "ญี่ปุ่น": {
    history: "ญี่ปุ่นเป็นทีมชั้นนำของเอเชีย เป็นเจ้าภาพร่วมฟุตบอลโลก 2002 และมีพัฒนาการอย่างต่อเนื่อง ล่าสุดเอาชนะเยอรมนีและสเปนในรอบแบ่งกลุ่มฟุตบอลโลก 2022",
    achievements: ["เจ้าภาพร่วมฟุตบอลโลก 2002", "รอบ 16 ทีม ฟุตบอลโลก 2002, 2018, 2022", "แชมป์ AFC Asian Cup 4 สมัย", "ชนะเยอรมนี-สเปน ในฟุตบอลโลก 2022"],
    starPlayers: [
      { name: "Takefusa Kubo", position: "ปีก", club: "Real Sociedad" },
      { name: "Kaoru Mitoma", position: "ปีก", club: "Brighton" },
      { name: "Wataru Endo", position: "กองกลาง", club: "Liverpool" },
    ],
    formation: "4-2-3-1",
    manager: "Hajime Moriyasu",
    fifaRanking: 18,
    wcAppearances: 7,
    bestResult: "รอบ 16 ทีม (2002, 2018, 2022)",
  },
  "เกาหลีใต้": {
    history: "เกาหลีใต้สร้างประวัติศาสตร์อันน่าจดจำในฟุตบอลโลก 2002 บนแผ่นดินบ้านเกิด ผ่านเข้าถึงรอบรองชนะเลิศเป็นทีมเอเชียทีมแรก ภายใต้การคุมทีมของ Guus Hiddink",
    achievements: ["รอบรองชนะเลิศ ฟุตบอลโลก 2002", "เจ้าภาพร่วมฟุตบอลโลก 2002", "แชมป์ AFC Asian Cup 2 สมัย", "รอบ 16 ทีม ฟุตบอลโลก 2010, 2022"],
    starPlayers: [
      { name: "Son Heung-min", position: "กองหน้า", club: "Tottenham" },
      { name: "Kim Min-jae", position: "กองหลัง", club: "Bayern Munich" },
      { name: "Lee Kang-in", position: "กองกลางรุก", club: "PSG" },
    ],
    formation: "4-3-3",
    manager: "Hong Myung-bo",
    fifaRanking: 22,
    wcAppearances: 11,
    bestResult: "รอบรองชนะเลิศ (2002)",
  },
  "ออสเตรเลีย": {
    history: "ออสเตรเลียย้ายจากสมาพันธ์โอเชียเนียมา AFC ในปี 2006 และเข้าร่วมฟุตบอลโลกติดต่อกัน 5 ครั้ง สร้างความประทับใจด้วยการเข้ารอบ 16 ทีมในปี 2022",
    achievements: ["รอบ 16 ทีม ฟุตบอลโลก 2006, 2022", "แชมป์ AFC Asian Cup 2015", "เข้าร่วมฟุตบอลโลก 6 ครั้ง", "แชมป์ OFC Nations Cup 4 สมัย"],
    starPlayers: [
      { name: "Craig Goodwin", position: "ปีก", club: "Adelaide United" },
      { name: "Jackson Irvine", position: "กองกลาง", club: "St. Pauli" },
      { name: "Mathew Ryan", position: "ผู้รักษาประตู", club: "Roma" },
    ],
    formation: "4-4-2",
    manager: "Tony Popovic",
    fifaRanking: 24,
    wcAppearances: 6,
    bestResult: "รอบ 16 ทีม (2006, 2022)",
  },
  "ซาอุดีอาระเบีย": {
    history: "ซาอุดีอาระเบียเป็นทีมชั้นนำของเอเชีย เคยเข้าร่วมฟุตบอลโลก 7 ครั้ง สร้างความตื่นตะลึงด้วยการเอาชนะอาร์เจนตินา 2-1 ในฟุตบอลโลก 2022",
    achievements: ["ชนะอาร์เจนตินา 2-1 ในฟุตบอลโลก 2022", "แชมป์ AFC Asian Cup 3 สมัย", "รอบ 16 ทีม ฟุตบอลโลก 1994", "เข้าร่วมฟุตบอลโลก 7 ครั้ง"],
    starPlayers: [
      { name: "Salem Al-Dawsari", position: "ปีก", club: "Al Hilal" },
      { name: "Mohammed Al-Owais", position: "ผู้รักษาประตู", club: "Al Hilal" },
      { name: "Firas Al-Buraikan", position: "กองหน้า", club: "Al Ahli" },
    ],
    formation: "4-3-3",
    manager: "Roberto Mancini",
    fifaRanking: 56,
    wcAppearances: 7,
    bestResult: "รอบ 16 ทีม (1994)",
  },
  "อิหร่าน": {
    history: "อิหร่านเป็นทีมชั้นนำของเอเชียตะวันตก เข้าร่วมฟุตบอลโลก 6 ครั้ง แม้จะยังไม่เคยผ่านรอบแบ่งกลุ่ม แต่มักสร้างเกมที่สูสีกับทีมใหญ่",
    achievements: ["เข้าร่วมฟุตบอลโลก 6 ครั้ง", "แชมป์ AFC Asian Cup 3 สมัย", "ชนะสหรัฐอเมริกา ในฟุตบอลโลก 1998", "แชมป์ WAFF 3 สมัย"],
    starPlayers: [
      { name: "Mehdi Taremi", position: "กองหน้า", club: "Inter Milan" },
      { name: "Sardar Azmoun", position: "กองหน้า", club: "Roma" },
      { name: "Alireza Jahanbakhsh", position: "ปีก", club: "Feyenoord" },
    ],
    formation: "4-4-2",
    manager: "Amir Ghalenoei",
    fifaRanking: 20,
    wcAppearances: 6,
    bestResult: "รอบแบ่งกลุ่ม",
  },
  "โมร็อกโก": {
    history: "โมร็อกโกสร้างประวัติศาสตร์อันยิ่งใหญ่ในฟุตบอลโลก 2022 เข้าถึงรอบรองชนะเลิศเป็นทีมแอฟริกาทีมแรก เอาชนะเบลเยียม สเปน และโปรตุเกส",
    achievements: ["รอบรองชนะเลิศ ฟุตบอลโลก 2022 (ทีมแอฟริกาแรก)", "แชมป์ AFCON 1976", "รอบ 16 ทีม ฟุตบอลโลก 1986", "ชนะเบลเยียม สเปน โปรตุเกส ในฟุตบอลโลก 2022"],
    starPlayers: [
      { name: "Achraf Hakimi", position: "แบ็คขวา", club: "PSG" },
      { name: "Hakim Ziyech", position: "ปีก", club: "Galatasaray" },
      { name: "Youssef En-Nesyri", position: "กองหน้า", club: "Fenerbahce" },
    ],
    formation: "4-3-3",
    manager: "Walid Regragui",
    fifaRanking: 13,
    wcAppearances: 6,
    bestResult: "รอบรองชนะเลิศ (2022)",
  },
  "เซเนกัล": {
    history: "เซเนกัลสร้างชื่อในฟุตบอลโลก 2002 ด้วยการเอาชนะฝรั่งเศสในนัดเปิดสนาม และเข้าถึงรอบ 8 ทีม ล่าสุดคว้าแชมป์ AFCON 2021 เป็นครั้งแรกในประวัติศาสตร์",
    achievements: ["แชมป์ AFCON 2021 (ครั้งแรก)", "รอบ 8 ทีม ฟุตบอลโลก 2002", "รองแชมป์ AFCON 2019", "ชนะฝรั่งเศส ในฟุตบอลโลก 2002"],
    starPlayers: [
      { name: "Sadio Mane", position: "ปีก", club: "Al Nassr" },
      { name: "Kalidou Koulibaly", position: "กองหลัง", club: "Al Hilal" },
      { name: "Ismaila Sarr", position: "ปีก", club: "Crystal Palace" },
    ],
    formation: "4-3-3",
    manager: "Aliou Cisse",
    fifaRanking: 17,
    wcAppearances: 3,
    bestResult: "รอบ 8 ทีม (2002)",
  },
  "ไนจีเรีย": {
    history: "ไนจีเรียเป็นหนึ่งในทีมที่แข็งแกร่งที่สุดของแอฟริกา เข้ารอบ 16 ทีมฟุตบอลโลก 3 ครั้ง และคว้าแชมป์ AFCON 3 สมัย รวมถึงเหรียญทอง Olympics 1996",
    achievements: ["แชมป์ AFCON 3 สมัย", "รอบ 16 ทีม ฟุตบอลโลก 1994, 1998, 2014", "เหรียญทอง Olympics 1996", "เข้าร่วมฟุตบอลโลก 7 ครั้ง"],
    starPlayers: [
      { name: "Victor Osimhen", position: "กองหน้า", club: "Galatasaray" },
      { name: "Samuel Chukwueze", position: "ปีก", club: "AC Milan" },
      { name: "Wilfred Ndidi", position: "กองกลาง", club: "Leicester" },
    ],
    formation: "4-3-3",
    manager: "Finidi George",
    fifaRanking: 28,
    wcAppearances: 7,
    bestResult: "รอบ 16 ทีม (1994, 1998, 2014)",
  },
  "เอกวาดอร์": {
    history: "เอกวาดอร์เริ่มมีบทบาทในฟุตบอลโลกตั้งแต่ปี 2002 และทำผลงานดีที่สุดในปี 2006 เข้ารอบ 16 ทีม เป็นทีมที่มีพัฒนาการดีในอเมริกาใต้",
    achievements: ["รอบ 16 ทีม ฟุตบอลโลก 2006", "เข้าร่วมฟุตบอลโลก 4 ครั้ง", "รอบแบ่งกลุ่ม ฟุตบอลโลก 2022", "อันดับ 4 Copa America 2016"],
    starPlayers: [
      { name: "Moises Caicedo", position: "กองกลาง", club: "Chelsea" },
      { name: "Piero Hincapie", position: "กองหลัง", club: "Bayer Leverkusen" },
      { name: "Enner Valencia", position: "กองหน้า", club: "Internacional" },
    ],
    formation: "4-4-2",
    manager: "Sebastian Beccacece",
    fifaRanking: 30,
    wcAppearances: 4,
    bestResult: "รอบ 16 ทีม (2006)",
  },
  "ปารากวัย": {
    history: "ปารากวัยมีประวัติศาสตร์ที่น่าสนใจในฟุตบอลโลก ผ่านเข้ารอบ 8 ครั้ง ทำผลงานดีที่สุดในปี 2010 เข้าถึงรอบ 8 ทีม แต่พลาดฟุตบอลโลก 2014, 2018, 2022",
    achievements: ["รอบ 8 ทีม ฟุตบอลโลก 2010", "แชมป์ Copa America 2 สมัย", "รอบ 16 ทีม ฟุตบอลโลก 1998, 2002, 2006", "เข้าร่วมฟุตบอลโลก 8 ครั้ง"],
    starPlayers: [
      { name: "Miguel Almiron", position: "กองกลางรุก", club: "Newcastle" },
      { name: "Julio Enciso", position: "ปีก", club: "Brighton" },
      { name: "Omar Alderete", position: "กองหลัง", club: "Getafe" },
    ],
    formation: "4-4-2",
    manager: "Alfaro Moreno",
    fifaRanking: 55,
    wcAppearances: 8,
    bestResult: "รอบ 8 ทีม (2010)",
  },
  "เวเนซุเอลา": {
    history: "เวเนซุเอลาเป็นทีมที่ไม่เคยผ่านเข้ารอบฟุตบอลโลกมาก่อน หากผ่านเข้ารอบได้จะเป็นครั้งแรกในประวัติศาสตร์ ถือเป็นทีมม้ามืดของอเมริกาใต้",
    achievements: ["อันดับ 4 Copa America 2011", "ไม่เคยผ่านเข้ารอบฟุตบอลโลก (อาจเป็นครั้งแรก)", "พัฒนาผลงานดีขึ้นต่อเนื่อง", "อันดับ 8 Copa America 2024"],
    starPlayers: [
      { name: "Salomon Rondon", position: "กองหน้า", club: "Pachuca" },
      { name: "Yangel Herrera", position: "กองกลาง", club: "Girona" },
      { name: "Josef Martinez", position: "กองหน้า", club: "Inter Miami" },
    ],
    formation: "4-3-3",
    manager: "Fernando Batista",
    fifaRanking: 54,
    wcAppearances: 0,
    bestResult: "ครั้งแรก (ถ้าผ่านรอบ)",
  },
  "คอสตาริกา": {
    history: "คอสตาริกาสร้างเซอร์ไพรส์ในฟุตบอลโลก 2014 เข้ารอบ 8 ทีม โดยเอาชนะอุรุกวัยและอิตาลี เป็นทีมเล็กที่มักสร้างผลงานเหนือความคาดหมาย",
    achievements: ["รอบ 8 ทีม ฟุตบอลโลก 2014", "แชมป์ CONCACAF Gold Cup 3 ครั้ง (ร่วม)", "เข้าร่วมฟุตบอลโลก 6 ครั้ง", "ชนะอิตาลี อุรุกวัย ในฟุตบอลโลก 2014"],
    starPlayers: [
      { name: "Keylor Navas", position: "ผู้รักษาประตู", club: "Nottingham Forest" },
      { name: "Jewison Bennette", position: "ปีก", club: "Sunderland" },
      { name: "Manfred Ugalde", position: "กองหน้า", club: "Spartak Moscow" },
    ],
    formation: "5-4-1",
    manager: "Claudio Vivas",
    fifaRanking: 48,
    wcAppearances: 6,
    bestResult: "รอบ 8 ทีม (2014)",
  },
  "จาเมกา": {
    history: "จาเมกาเคยเข้าร่วมฟุตบอลโลกเพียงครั้งเดียวในปี 1998 ที่ฝรั่งเศส เป็นทีมที่ขึ้นชื่อในเรื่องความเร็วและร่างกายที่แข็งแกร่ง",
    achievements: ["เข้าร่วมฟุตบอลโลก 1998", "รองแชมป์ CONCACAF Gold Cup 2 ครั้ง", "ชนะญี่ปุ่น ในฟุตบอลโลก 1998", "พัฒนาระบบเยาวชนอย่างต่อเนื่อง"],
    starPlayers: [
      { name: "Leon Bailey", position: "ปีก", club: "Aston Villa" },
      { name: "Michail Antonio", position: "กองหน้า", club: "West Ham" },
      { name: "Bobby De Cordova-Reid", position: "กองกลาง", club: "Leicester" },
    ],
    formation: "4-3-3",
    manager: "Heimir Hallgrimsson",
    fifaRanking: 62,
    wcAppearances: 1,
    bestResult: "รอบแบ่งกลุ่ม (1998)",
  },
  "แคเมอรูน": {
    history: "แคเมอรูนเป็นหนึ่งในทีมที่ยิ่งใหญ่ที่สุดของแอฟริกา สร้างประวัติศาสตร์ในฟุตบอลโลก 1990 เข้ารอบ 8 ทีม ด้วยฝีเท้าของ Roger Milla ตำนานวัย 38 ปี",
    achievements: ["รอบ 8 ทีม ฟุตบอลโลก 1990", "แชมป์ AFCON 5 สมัย", "เหรียญทอง Olympics 2000", "เข้าร่วมฟุตบอลโลก 8 ครั้ง"],
    starPlayers: [
      { name: "Andre-Frank Zambo Anguissa", position: "กองกลาง", club: "Napoli" },
      { name: "Eric Maxim Choupo-Moting", position: "กองหน้า", club: "Bayern Munich" },
      { name: "Bryan Mbeumo", position: "ปีก", club: "Brentford" },
    ],
    formation: "4-3-3",
    manager: "Marc Brys",
    fifaRanking: 45,
    wcAppearances: 8,
    bestResult: "รอบ 8 ทีม (1990)",
  },
  "กานา": {
    history: "กานาเป็นทีมที่มีชื่อเสียงในแอฟริกา เข้ารอบ 8 ทีมฟุตบอลโลก 2010 และพลาดรอบรองชนะเลิศอย่างเจ็บปวดด้วยมือของ Luis Suarez",
    achievements: ["รอบ 8 ทีม ฟุตบอลโลก 2010", "แชมป์ AFCON 4 สมัย", "เข้าร่วมฟุตบอลโลก 4 ครั้ง", "รอบ 16 ทีม ฟุตบอลโลก 2006"],
    starPlayers: [
      { name: "Mohammed Kudus", position: "กองกลางรุก", club: "West Ham" },
      { name: "Thomas Partey", position: "กองกลาง", club: "Arsenal" },
      { name: "Antoine Semenyo", position: "ปีก", club: "Bournemouth" },
    ],
    formation: "4-2-3-1",
    manager: "Otto Addo",
    fifaRanking: 35,
    wcAppearances: 4,
    bestResult: "รอบ 8 ทีม (2010)",
  },
  "ตูนิเซีย": {
    history: "ตูนิเซียเป็นทีมที่เข้าร่วมฟุตบอลโลกบ่อยที่สุดทีมหนึ่งจากแอฟริกา เข้าร่วม 6 ครั้ง สร้างความตื่นเต้นในฟุตบอลโลก 2022 ด้วยการเอาชนะฝรั่งเศส",
    achievements: ["ชนะฝรั่งเศส ในฟุตบอลโลก 2022", "แชมป์ AFCON 2004", "เข้าร่วมฟุตบอลโลก 6 ครั้ง", "ชนะปานามา ในฟุตบอลโลก 2018"],
    starPlayers: [
      { name: "Aissa Laidouni", position: "กองกลาง", club: "Union Berlin" },
      { name: "Youssef Msakni", position: "กองหน้า", club: "Al Arabi" },
      { name: "Hannibal Mejbri", position: "กองกลาง", club: "Burnley" },
    ],
    formation: "4-3-3",
    manager: "Faouzi Benzarti",
    fifaRanking: 42,
    wcAppearances: 6,
    bestResult: "รอบแบ่งกลุ่ม",
  },
}

// ข้อมูลทีมที่ผ่านเข้ารอบ (อัปเดตล่าสุด)
const qualifiedTeams = {
  pot1: [
    { name: "สหรัฐอเมริกา", flag: "🇺🇸", confederation: "CONCACAF", status: "เจ้าภาพ" },
    { name: "เม็กซิโก", flag: "🇲🇽", confederation: "CONCACAF", status: "เจ้าภาพ" },
    { name: "แคนาดา", flag: "🇨🇦", confederation: "CONCACAF", status: "เจ้าภาพ" },
    { name: "อาร์เจนตินา", flag: "🇦🇷", confederation: "CONMEBOL", status: "แชมป์โลก" },
    { name: "ฝรั่งเศส", flag: "🇫🇷", confederation: "UEFA", status: "รองแชมป์โลก" },
    { name: "บราซิล", flag: "🇧🇷", confederation: "CONMEBOL", status: "ผ่านรอบคัดเลือก" },
    { name: "อังกฤษ", flag: "🇬🇧", confederation: "UEFA", status: "ผ่านรอบคัดเลือก" },
    { name: "สเปน", flag: "🇪🇸", confederation: "UEFA", status: "ผ่านรอบคัดเลือก" },
  ],
  pot2: [
    { name: "เยอรมนี", flag: "🇩🇪", confederation: "UEFA", status: "ผ่านรอบคัดเลือก" },
    { name: "โปรตุเกส", flag: "🇵🇹", confederation: "UEFA", status: "ผ่านรอบคัดเลือก" },
    { name: "เนเธอร์แลนด์", flag: "🇳🇱", confederation: "UEFA", status: "ผ่านรอบคัดเลือก" },
    { name: "เบลเยียม", flag: "🇧🇪", confederation: "UEFA", status: "ผ่านรอบคัดเลือก" },
    { name: "อิตาลี", flag: "🇮🇹", confederation: "UEFA", status: "ผ่านรอบคัดเลือก" },
    { name: "โครเอเชีย", flag: "🇭🇷", confederation: "UEFA", status: "ผ่านรอบคัดเลือก" },
    { name: "อุรุกวัย", flag: "🇺🇾", confederation: "CONMEBOL", status: "ผ่านรอบคัดเลือก" },
    { name: "โคลอมเบีย", flag: "🇨🇴", confederation: "CONMEBOL", status: "ผ่านรอบคัดเลือก" },
  ],
  pot3: [
    { name: "ญี่ปุ่น", flag: "🇯🇵", confederation: "AFC", status: "ผ่านรอบคัดเลือก" },
    { name: "เกาหลีใต้", flag: "🇰🇷", confederation: "AFC", status: "ผ่านรอบคัดเลือก" },
    { name: "ออสเตรเลีย", flag: "🇦🇺", confederation: "AFC", status: "ผ่านรอบคัดเลือก" },
    { name: "ซาอุดีอาระเบีย", flag: "🇸🇦", confederation: "AFC", status: "ผ่านรอบคัดเลือก" },
    { name: "อิหร่าน", flag: "🇮🇷", confederation: "AFC", status: "ผ่านรอบคัดเลือก" },
    { name: "โมร็อกโก", flag: "🇲🇦", confederation: "CAF", status: "ผ่านรอบคัดเลือก" },
    { name: "เซเนกัล", flag: "🇸🇳", confederation: "CAF", status: "ผ่านรอบคัดเลือก" },
    { name: "ไนจีเรีย", flag: "🇳🇬", confederation: "CAF", status: "ผ่านรอบคัดเลือก" },
  ],
  pot4: [
    { name: "เอกวาดอร์", flag: "🇪🇨", confederation: "CONMEBOL", status: "ผ่านรอบคัดเลือก" },
    { name: "ปารากวัย", flag: "🇵🇾", confederation: "CONMEBOL", status: "ผ่านรอบคัดเลือก" },
    { name: "เวเนซุเอลา", flag: "🇻🇪", confederation: "CONMEBOL", status: "ผ่านรอบคัดเลือก" },
    { name: "คอสตาริกา", flag: "🇨🇷", confederation: "CONCACAF", status: "ผ่านรอบคัดเลือก" },
    { name: "จาเมกา", flag: "🇯🇲", confederation: "CONCACAF", status: "ผ่านรอบคัดเลือก" },
    { name: "แคเมอรูน", flag: "🇨🇲", confederation: "CAF", status: "ผ่านรอบคัดเลือก" },
    { name: "กานา", flag: "🇬🇭", confederation: "CAF", status: "ผ่านรอบคัดเลือก" },
    { name: "ตูนิเซีย", flag: "🇹🇳", confederation: "CAF", status: "ผ่านรอบคัดเลือก" },
  ],
}

// สนามแข่งขัน
const venues = [
  { city: "นิวยอร์ก/นิวเจอร์ซีย์", stadium: "MetLife Stadium", capacity: "82,500", country: "USA", matches: "รอบชิงชนะเลิศ" },
  { city: "ลอสแองเจลิส", stadium: "SoFi Stadium", capacity: "70,240", country: "USA", matches: "รอบรองชนะเลิศ" },
  { city: "ดัลลัส", stadium: "AT&T Stadium", capacity: "80,000", country: "USA", matches: "รอบรองชนะเลิศ" },
  { city: "ไมอามี่", stadium: "Hard Rock Stadium", capacity: "65,326", country: "USA", matches: "รอบ 8 ทีม" },
  { city: "แอตแลนตา", stadium: "Mercedes-Benz Stadium", capacity: "71,000", country: "USA", matches: "รอบ 8 ทีม" },
  { city: "เม็กซิโกซิตี้", stadium: "Estadio Azteca", capacity: "87,523", country: "MEX", matches: "แมตช์เปิดสนาม" },
  { city: "โทรอนโต", stadium: "BMO Field", capacity: "45,736", country: "CAN", matches: "รอบแบ่งกลุ่ม" },
  { city: "แวนคูเวอร์", stadium: "BC Place", capacity: "54,500", country: "CAN", matches: "รอบแบ่งกลุ่ม" },
]

// กำหนดการสำคัญ
const keyDates = [
  { date: "13 ธันวาคม 2025", event: "การจับสลากแบ่งกลุ่ม", location: "ลอสแองเจลิส, สหรัฐอเมริกา", status: "upcoming" },
  { date: "11 มิถุนายน 2026", event: "แมตช์เปิดสนาม", location: "เม็กซิโกซิตี้, เม็กซิโก", status: "upcoming" },
  { date: "12 มิ.ย. - 28 มิ.ย. 2026", event: "รอบแบ่งกลุ่ม", location: "16 เมือง", status: "upcoming" },
  { date: "29 มิ.ย. - 2 ก.ค. 2026", event: "รอบ 32 ทีม", location: "16 เมือง", status: "upcoming" },
  { date: "5-6 กรกฎาคม 2026", event: "รอบ 16 ทีม", location: "8 เมือง", status: "upcoming" },
  { date: "9-10 กรกฎาคม 2026", event: "รอบ 8 ทีม", location: "4 เมือง", status: "upcoming" },
  { date: "14-15 กรกฎาคม 2026", event: "รอบรองชนะเลิศ", location: "ดัลลัส & ลอสแองเจลิส", status: "upcoming" },
  { date: "19 กรกฎาคม 2026", event: "รอบชิงชนะเลิศ", location: "นิวยอร์ก/นิวเจอร์ซีย์", status: "final" },
]

// ไฮไลต์และจุดน่าสนใจ
const highlights = [
  {
    icon: Users,
    title: "48 ทีม",
    description: "ครั้งแรกในประวัติศาสตร์ที่ขยายเป็น 48 ทีม จากเดิม 32 ทีม",
  },
  {
    icon: Globe,
    title: "3 ประเทศเจ้าภาพ",
    description: "สหรัฐอเมริกา, เม็กซิโก และแคนาดา ร่วมเป็นเจ้าภาพ",
  },
  {
    icon: MapPin,
    title: "16 เมือง",
    description: "จัดแข่งขันใน 16 เมืองทั่ว 3 ประเทศ รวม 104 แมตช์",
  },
  {
    icon: Trophy,
    title: "รูปแบบใหม่",
    description: "12 กลุ่ม กลุ่มละ 4 ทีม อันดับ 1-2 และอันดับ 3 ที่ดีที่สุด 8 ทีมผ่านเข้ารอบ",
  },
]

// ดาวเด่นที่น่าจับตามอง
const starsToWatch = [
  { name: "Kylian Mbappé", team: "ฝรั่งเศส", position: "กองหน้า", image: "/players/mbappe.jpg" },
  { name: "Erling Haaland", team: "นอร์เวย์", position: "กองหน้า", image: "/players/haaland.webp" },
  { name: "Jude Bellingham", team: "อังกฤษ", position: "กองกลาง", image: "/players/bellingham.jpg" },
  { name: "Vinícius Jr", team: "บราซิล", position: "ปีก", image: "/players/vinicius.jpg" },
  { name: "Lionel Messi", team: "อาร์เจนตินา", position: "กองหน้า", image: "/players/messi.jpg" },
]

const heroImages = [
  "/worldcup/messi2022.jpg",
  "/worldcup/worldcup2010.webp",
  "/worldcup/worldcup4.webp",
  "/worldcup/france2018.jpg",
  "/worldcup/worldcup2006.jpg",
  "/worldcup/trophy.jpg",
]

export default function WorldCup2026Page() {
  const [selectedTeam, setSelectedTeam] = useState<{
    team: { name: string; flag: string; confederation: string; status: string }
    detail: (typeof teamDetails)[string]
  } | null>(null)

  const [highlightModal, setHighlightModal] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % heroImages.length)
  }, [])

  useEffect(() => {
    const interval = setInterval(nextImage, 5000)
    return () => clearInterval(interval)
  }, [nextImage])

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background slideshow */}
        {heroImages.map((src, index) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: index === currentImageIndex ? 1 : 0 }}
          >
            <Image
              src={src}
              alt={`World Cup moment ${index + 1}`}
              fill
              className="object-cover"
              priority={index === 0}
            />
          </div>
        ))}
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-4 h-4 bg-primary/30 rounded-full animate-float" />
          <div className="absolute top-40 right-20 w-6 h-6 bg-primary/20 rounded-full animate-float-delayed" />
          <div className="absolute bottom-40 left-1/4 w-3 h-3 bg-accent/30 rounded-full animate-float" />
        </div>

        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full text-sm font-medium text-primary border border-primary/20 mb-6">
              <Globe className="w-4 h-4" />
              FIFA World Cup 2026
              <Sparkles className="w-4 h-4" />
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-display tracking-tight mb-6">
              <span className="text-foreground">WORLD CUP</span>
              <br />
              <span className="text-primary">2026</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-4">
              United 2026 - สหรัฐอเมริกา | เม็กซิโก | แคนาดา
            </p>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              มหกรรมฟุตบอลโลกครั้งยิ่งใหญ่ที่สุดในประวัติศาสตร์ กับ 48 ทีมชาติ ใน 3 ประเทศ
            </p>

            {/* Countdown or Date */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl px-6 py-4 text-center">
                <p className="text-3xl md:text-4xl font-display text-primary">11</p>
                <p className="text-sm text-muted-foreground">มิ.ย. 2026</p>
              </div>
              <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl px-6 py-4 text-center">
                <p className="text-3xl md:text-4xl font-display text-foreground">-</p>
                <p className="text-sm text-muted-foreground">ถึง</p>
              </div>
              <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl px-6 py-4 text-center">
                <p className="text-3xl md:text-4xl font-display text-primary">19</p>
                <p className="text-sm text-muted-foreground">ก.ค. 2026</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { value: "48", label: "ทีมชาติ" },
                { value: "104", label: "แมตช์" },
                { value: "16", label: "เมืองเจ้าภาพ" },
                { value: "39", label: "วัน" },
              ].map((stat, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-4">
                  <p className="text-2xl md:text-3xl font-display text-primary">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Zap className="w-3 h-3 mr-1" />
              ไฮไลต์
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display">จุดเด่นของทัวร์นาเมนต์</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((item, i) => (
              <Card
                key={i}
                className="border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group cursor-pointer hover:-translate-y-1"
                onClick={() => setHighlightModal(item.title)}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-display text-primary mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <p className="text-xs text-primary/50 mt-3 group-hover:text-primary/80 transition-colors">
                    {"กดเพื่อดูรายละเอียด"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tournament Format Section */}
      <section className="py-16 bg-muted/30 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Target className="w-3 h-3 mr-1" />
              รูปแบบการแข่งขัน
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display">รูปแบบใหม่ 48 ทีม</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  รอบแบ่งกลุ่ม
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    12 กลุ่ม กลุ่มละ 4 ทีม
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    แต่ละทีมแข่ง 3 นัด
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    รวม 48 แมตช์
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-accent/30 bg-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  ทีมผ่านเข้ารอบ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    อันดับ 1 และ 2 ทุกกลุ่ม (24 ทีม)
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    อันดับ 3 ที่ดีที่สุด 8 ทีม
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    รวม 32 ทีมเข้ารอบน็อคเอาท์
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-muted text-foreground rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  รอบน็อคเอาท์
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    รอบ 32 ทีม → 16 แมตช์
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    รอบ 16, 8, รองฯ, ชิงฯ
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    รวม 56 แมตช์น็อคเอาท์
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Teams Section */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Flag className="w-3 h-3 mr-1" />
              ทีมที่ผ่านเข้ารอบ
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display mb-4">โถจับสลาก (คาดการณ์)</h2>
            <p className="text-muted-foreground">รายชื่อทีมที่ผ่านเข้ารอบและคาดว่าจะอยู่ในแต่ละโถ</p>
          </div>

          <Tabs defaultValue="pot1" className="max-w-4xl mx-auto">
            <TabsList className="grid grid-cols-4 w-full mb-8">
              <TabsTrigger value="pot1" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                โถ 1
              </TabsTrigger>
              <TabsTrigger value="pot2">โถ 2</TabsTrigger>
              <TabsTrigger value="pot3">โถ 3</TabsTrigger>
              <TabsTrigger value="pot4">โถ 4</TabsTrigger>
            </TabsList>

            {Object.entries(qualifiedTeams).map(([pot, teams]) => (
              <TabsContent key={pot} value={pot}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {teams.map((team, i) => {
                    const hasDetail = !!teamDetails[team.name]
                    return (
                      <Card
                        key={i}
                        className={`border-border/50 hover:border-primary/50 transition-all ${hasDetail ? "cursor-pointer hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5" : ""}`}
                        onClick={() => {
                          if (hasDetail) {
                            setSelectedTeam({ team, detail: teamDetails[team.name] })
                          }
                        }}
                      >
                        <CardContent className="p-4 text-center">
                          <span className="text-4xl mb-2 block">{team.flag}</span>
                          <h3 className="font-semibold text-sm mb-1">{team.name}</h3>
                          <Badge variant="secondary" className="text-xs mb-1">
                            {team.confederation}
                          </Badge>
                          {team.status === "เจ้าภาพ" && (
                            <Badge variant="default" className="text-xs block mt-1">
                              {"เจ้าภาพ"}
                            </Badge>
                          )}
                          {team.status === "แชมป์โลก" && (
                            <Badge className="text-xs block mt-1 bg-primary/20 text-primary border-primary/30">
                              {"แชมป์โลก"}
                            </Badge>
                          )}
                          {hasDetail && (
                            <p className="text-xs text-primary/60 mt-2">{"กดเพื่อดูข้อมูล"}</p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Key Dates Section */}
      <section className="py-16 bg-muted/30 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Calendar className="w-3 h-3 mr-1" />
              กำหนดการ
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display">ตารางเวลาสำคัญ</h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-border md:-translate-x-1/2" />

              {keyDates.map((item, i) => (
                <div key={i} className={`relative flex items-center mb-8 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                  {/* Timeline dot */}
                  <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-primary rounded-full md:-translate-x-1/2 z-10" />
                  
                  {/* Content */}
                  <div className={`ml-12 md:ml-0 md:w-1/2 ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                    <Card className={`border-border/50 ${item.status === "final" ? "border-primary bg-primary/5" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2 justify-start md:justify-end">
                          {i % 2 !== 0 && <Clock className="w-4 h-4 text-primary md:hidden" />}
                          <span className="text-sm font-medium text-primary">{item.date}</span>
                          {i % 2 === 0 && <Clock className="w-4 h-4 text-primary hidden md:block" />}
                        </div>
                        <h3 className="font-semibold mb-1">{item.event}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Venues Section */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <MapPin className="w-3 h-3 mr-1" />
              สนามแข่งขัน
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display">สถานที่จัดการแข่งขัน</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {venues.map((venue, i) => (
              <Card key={i} className="border-border/50 hover:border-primary/50 transition-colors overflow-hidden group">
                <div className="h-32 bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors" />
                  <div className="absolute bottom-2 right-2">
                    <Badge variant="secondary" className="text-xs">
                      {venue.country}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-1">{venue.stadium}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{venue.city}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      <Users className="w-3 h-3 inline mr-1" />
                      {venue.capacity}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {venue.matches}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary/10 via-background to-accent/10 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <Globe className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-display mb-4">พร้อมลุ้นไปกับฟุตบอลโลก 2026?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            ติดตามข่าวสาร รอบคัดเลือก และเตรียมพร้อมสำหรับทัวร์นาเมนต์ที่ยิ่งใหญ่ที่สุดในประวัติศาสตร์
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 rounded-lg shadow-lg shadow-primary/20">
              <Link href="/ai-prediction">
                <Star className="w-4 h-4 mr-2" />
                ทำนายผลด้วย AI
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 rounded-lg bg-transparent">
              <Link href="/news">
                ติดตามข่าวสาร
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      {/* Highlight Detail Modal */}
      {highlightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setHighlightModal(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setHighlightModal(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {highlightModal === "48 ทีม" && (
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display text-primary">{"48 ทีมชาติ"}</h2>
                    <p className="text-sm text-muted-foreground">{"ครั้งแรกในประวัติศาสตร์ฟุตบอลโลก"}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-muted/30 rounded-xl p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      {"การขยายจำนวนทีม"}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {"FIFA ประกาศขยายจำนวนทีมจาก 32 เป็น 48 ทีม ตั้งแต่เดือนมกราคม 2017 ถือเป็นการเปลี่ยนแปลงครั้งใหญ่ที่สุดของฟุตบอลโลกนับตั้งแต่ขยายจาก 24 เป็น 32 ทีมในปี 1998 เปิดโอกาสให้ทีมจากหลายทวีปได้เข้าร่วมมากขึ้น"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">{"โควตาแต่ละสมาพันธ์"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { conf: "UEFA (ยุโรป)", slots: "16 ทีม", prev: "13 ทีม", flag: "🇪🇺" },
                        { conf: "CAF (แอฟริกา)", slots: "9.5 ทีม", prev: "5 ทีม", flag: "🌍" },
                        { conf: "AFC (เอเชีย)", slots: "8.5 ทีม", prev: "4.5 ทีม", flag: "🌏" },
                        { conf: "CONMEBOL (อเมริกาใต้)", slots: "6.5 ทีม", prev: "4.5 ทีม", flag: "🌎" },
                        { conf: "CONCACAF (อเมริกาเหนือ-กลาง)", slots: "6.5 ทีม", prev: "3.5 ทีม", flag: "🌎" },
                        { conf: "OFC (โอเชียเนีย)", slots: "1.5 ทีม", prev: "0.5 ทีม", flag: "🌊" },
                      ].map((item) => (
                        <div key={item.conf} className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
                          <span className="text-2xl">{item.flag}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.conf}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="line-through">{item.prev}</span>
                              <ChevronRight className="w-3 h-3 text-primary" />
                              <span className="text-primary font-semibold">{item.slots}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <h3 className="font-semibold mb-2 text-primary">{"ข้อเท็จจริงน่าสนใจ"}</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />{"เจ้าภาพ (USA, MEX, CAN) ได้สิทธิ์เข้าร่วมอัตโนมัติ"}</li>
                      <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />{"ชาติเพิ่มเติมที่ลุ้นเข้าร่วมครั้งแรก เช่น อินโดนีเซีย, ไอร์แลนด์, จอร์เจีย"}</li>
                      <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />{"จำนวนแมตช์รวมทั้งหมด 104 นัด เพิ่มจาก 64 นัด"}</li>
                      <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />{"แต่ละทีมลงแข่งรอบแบ่งกลุ่มอย่างน้อย 3 นัดเหมือนเดิม"}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {highlightModal === "3 ประเทศเจ้าภาพ" && (
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display text-primary">{"3 ประเทศเจ้าภาพ"}</h2>
                    <p className="text-sm text-muted-foreground">{"United 2026 - สหรัฐอเมริกา | เม็กซิโก | แคนาดา"}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      country: "สหรัฐอเมริกา 🇺🇸",
                      matches: 78,
                      cities: "นิวยอร์ก/นิวเจอร์ซีย์, ลอสแองเจลิส, ดัลลัส, ไมอามี่, แอตแลนตา, ซีแอตเทิล, ฮิวสตัน, ฟิลาเดลเฟีย, แคนซัสซิตี้, ซานฟรานซิสโก, บอสตัน",
                      hostStadiums: 11,
                      keyMatches: "รอบรองชนะเลิศ, รอบชิงชนะเลิศ, รอบชิงอันดับ 3",
                      prevHost: "เคยเป็นเจ้าภาพ: ฟุตบอลโลก 1994",
                      desc: "เป็นเจ้าภาพหลักรับผิดชอบ 78 จาก 104 นัด รวมถึงรอบชิงชนะเลิศที่ MetLife Stadium นิวยอร์ก",
                    },
                    {
                      country: "เม็กซิโก 🇲🇽",
                      matches: 13,
                      cities: "เม็กซิโกซิตี้, กัวดาลาฮารา, มอนเตร์เรย์",
                      hostStadiums: 3,
                      keyMatches: "แมตช์เปิดสนาม, รอบแบ่งกลุ่ม",
                      prevHost: "เคยเป็นเจ้าภาพ: ฟุตบอลโลก 1970, 1986",
                      desc: "เม็กซิโกจะเป็นชาติแรกที่เป็นเจ้าภาพฟุตบอลโลกถึง 3 ครั้ง รวมถึงแมตช์เปิดสนามที่ Estadio Azteca สนามในตำนาน",
                    },
                    {
                      country: "แคนาดา 🇨🇦",
                      matches: 13,
                      cities: "โทรอนโต, แวนคูเวอร์",
                      hostStadiums: 2,
                      keyMatches: "รอบแบ่งกลุ่ม, รอบ 32 ทีม",
                      prevHost: "เจ้าภาพครั้งแรก",
                      desc: "แคนาดาเป็นเจ้าภาพฟุตบอลโลกชายครั้งแรก หลังจากเคยเป็นเจ้าภาพฟุตบอลโลกหญิง 2015 ที่ประสบความสำเร็จ",
                    },
                  ].map((host) => (
                    <div key={host.country} className="bg-muted/30 rounded-xl p-4">
                      <h3 className="font-semibold mb-2 text-lg">{host.country}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{host.desc}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-background/50 rounded-lg p-2.5">
                          <p className="text-xs text-muted-foreground">{"จำนวนแมตช์"}</p>
                          <p className="text-lg font-display text-primary">{host.matches} {"นัด"}</p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2.5">
                          <p className="text-xs text-muted-foreground">{"จำนวนสนาม"}</p>
                          <p className="text-lg font-display text-primary">{host.hostStadiums} {"สนาม"}</p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                        <p><MapPin className="w-3 h-3 inline mr-1 text-primary" />{host.cities}</p>
                        <p><Trophy className="w-3 h-3 inline mr-1 text-primary" />{host.keyMatches}</p>
                        <p><Star className="w-3 h-3 inline mr-1 text-primary" />{host.prevHost}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {highlightModal === "16 เมือง" && (
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display text-primary">{"16 เมืองเจ้าภาพ"}</h2>
                    <p className="text-sm text-muted-foreground">{"สนามแข่งขันทั่ว 3 ประเทศ"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">{"สหรัฐอเมริกา (11 เมือง)"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {[
                        { city: "นิวยอร์ก/นิวเจอร์ซีย์", stadium: "MetLife Stadium", cap: "82,500", round: "รอบชิงชนะเลิศ" },
                        { city: "ลอสแองเจลิส", stadium: "SoFi Stadium", cap: "70,240", round: "รอบรองชนะเลิศ" },
                        { city: "ดัลลัส", stadium: "AT&T Stadium", cap: "80,000", round: "รอบรองชนะเลิศ" },
                        { city: "ไมอามี่", stadium: "Hard Rock Stadium", cap: "65,326", round: "รอบ 8 ทีม" },
                        { city: "แอตแลนตา", stadium: "Mercedes-Benz Stadium", cap: "71,000", round: "รอบ 8 ทีม" },
                        { city: "ซีแอตเทิล", stadium: "Lumen Field", cap: "68,740", round: "รอบ 16 ทีม" },
                        { city: "ฮิวสตัน", stadium: "NRG Stadium", cap: "72,220", round: "รอบ 16 ทีม" },
                        { city: "ฟิลาเดลเฟีย", stadium: "Lincoln Financial Field", cap: "69,176", round: "รอบ 32 ทีม" },
                        { city: "แคนซัสซิตี้", stadium: "Arrowhead Stadium", cap: "76,416", round: "รอบแบ่งกลุ่ม" },
                        { city: "ซานฟรานซิสโก", stadium: "Levi's Stadium", cap: "68,500", round: "รอบ 8 ทีม" },
                        { city: "บอสตัน", stadium: "Gillette Stadium", cap: "65,878", round: "รอบแบ่งกลุ่ม" },
                      ].map((v) => (
                        <div key={v.city} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{v.city}</p>
                            <p className="text-xs text-muted-foreground">{v.stadium}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge variant="outline" className="text-xs">{v.round}</Badge>
                            <p className="text-xs text-muted-foreground mt-0.5"><Users className="w-3 h-3 inline mr-0.5" />{v.cap}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">{"เม็กซิโก (3 เมือง)"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {[
                        { city: "เม็กซิโกซิตี้", stadium: "Estadio Azteca", cap: "87,523", round: "แมตช์เปิดสนาม" },
                        { city: "กัวดาลาฮารา", stadium: "Estadio Akron", cap: "49,850", round: "รอบแบ่งกลุ่ม" },
                        { city: "มอนเตร์เรย์", stadium: "Estadio BBVA", cap: "53,500", round: "รอบแบ่งกลุ่ม" },
                      ].map((v) => (
                        <div key={v.city} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{v.city}</p>
                            <p className="text-xs text-muted-foreground">{v.stadium}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge variant="outline" className="text-xs">{v.round}</Badge>
                            <p className="text-xs text-muted-foreground mt-0.5"><Users className="w-3 h-3 inline mr-0.5" />{v.cap}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">{"แคนาดา (2 เมือง)"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {[
                        { city: "โทรอนโต", stadium: "BMO Field", cap: "45,736", round: "รอบแบ่งกลุ่ม" },
                        { city: "แวนคูเวอร์", stadium: "BC Place", cap: "54,500", round: "รอบแบ่งกลุ่ม" },
                      ].map((v) => (
                        <div key={v.city} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{v.city}</p>
                            <p className="text-xs text-muted-foreground">{v.stadium}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge variant="outline" className="text-xs">{v.round}</Badge>
                            <p className="text-xs text-muted-foreground mt-0.5"><Users className="w-3 h-3 inline mr-0.5" />{v.cap}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <h3 className="font-semibold mb-2 text-primary">{"สถิติสนาม"}</h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-display text-primary">{"87,523"}</p>
                        <p className="text-xs text-muted-foreground">{"ความจุสูงสุด"}</p>
                        <p className="text-xs text-muted-foreground">{"(Estadio Azteca)"}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-display text-primary">{"16"}</p>
                        <p className="text-xs text-muted-foreground">{"สนามแข่งขัน"}</p>
                        <p className="text-xs text-muted-foreground">{"ใน 3 ประเทศ"}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-display text-primary">{"104"}</p>
                        <p className="text-xs text-muted-foreground">{"แมตช์ทั้งหมด"}</p>
                        <p className="text-xs text-muted-foreground">{"39 วัน"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {highlightModal === "รูปแบบใหม่" && (
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display text-primary">{"รูปแบบการแข่งขันใหม่"}</h2>
                    <p className="text-sm text-muted-foreground">{"เปลี่ยนแปลงครั้งใหญ่จาก 32 เป็น 48 ทีม"}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      round: "รอบแบ่งกลุ่ม",
                      color: "primary",
                      details: [
                        "12 กลุ่ม กลุ่มละ 4 ทีม (เปลี่ยนจาก 8 กลุ่ม)",
                        "แต่ละทีมลงแข่ง 3 นัดในรอบแบ่งกลุ่ม",
                        "อันดับ 1 และ 2 ของทุกกลุ่ม (24 ทีม) ผ่านเข้ารอบต่อไป",
                        "อันดับ 3 ที่ดีที่สุด 8 ทีม ผ่านเข้ารอบเพิ่มเติม",
                        "รวม 32 ทีมเข้าสู่รอบน็อคเอาท์",
                        "จำนวนแมตช์: 48 นัด (12 มิ.ย. - 28 มิ.ย. 2026)",
                      ],
                    },
                    {
                      round: "รอบ 32 ทีม (ใหม่)",
                      color: "accent",
                      details: [
                        "เพิ่มขึ้นมาใหม่เป็นรอบแรกของน็อคเอาท์",
                        "16 คู่ แข่งนัดเดียว แพ้คัดออก",
                        "จำนวนแมตช์: 16 นัด (29 มิ.ย. - 2 ก.ค. 2026)",
                      ],
                    },
                    {
                      round: "รอบ 16 ทีม",
                      color: "primary",
                      details: [
                        "8 คู่ แข่งนัดเดียว แพ้คัดออก",
                        "จำนวนแมตช์: 8 นัด (5-6 ก.ค. 2026)",
                      ],
                    },
                    {
                      round: "รอบ 8 ทีม",
                      color: "accent",
                      details: [
                        "4 คู่ แข่งนัดเดียว แพ้คัดออก",
                        "จำนวนแมตช์: 4 นัด (9-10 ก.ค. 2026)",
                      ],
                    },
                    {
                      round: "รอบรองชนะเลิศ",
                      color: "primary",
                      details: [
                        "2 คู่ แข่งนัดเดียว แพ้คัดออก",
                        "จำนวนแมตช์: 2 นัด (14-15 ก.ค. 2026)",
                        "สนาม: AT&T Stadium, SoFi Stadium",
                      ],
                    },
                    {
                      round: "รอบชิงชนะเลิศ",
                      color: "accent",
                      details: [
                        "นัดชิงอันดับ 3: 18 ก.ค. 2026",
                        "นัดชิงชนะเลิศ: 19 ก.ค. 2026 ที่ MetLife Stadium",
                        "จำนวนแมตช์: 2 นัด",
                      ],
                    },
                  ].map((stage, idx) => (
                    <div key={stage.round} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${stage.color === "primary" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                          {idx + 1}
                        </div>
                        {idx < 5 && <div className="w-0.5 flex-1 bg-border mt-2" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <h3 className="font-semibold mb-2">{stage.round}</h3>
                        <ul className="space-y-1.5">
                          {stage.details.map((d, di) => (
                            <li key={di} className="text-sm text-muted-foreground flex items-start gap-2">
                              <ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}

                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <h3 className="font-semibold mb-2 text-primary">{"เปรียบเทียบกับรูปแบบเดิม"}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 text-muted-foreground font-medium">{""}</th>
                            <th className="text-center py-2 text-muted-foreground font-medium">{"2022 (เดิม)"}</th>
                            <th className="text-center py-2 text-primary font-medium">{"2026 (ใหม่)"}</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/50"><td className="py-2">{"จำนวนทีม"}</td><td className="text-center">{"32"}</td><td className="text-center text-primary font-semibold">{"48"}</td></tr>
                          <tr className="border-b border-border/50"><td className="py-2">{"จำนวนกลุ่ม"}</td><td className="text-center">{"8"}</td><td className="text-center text-primary font-semibold">{"12"}</td></tr>
                          <tr className="border-b border-border/50"><td className="py-2">{"แมตช์ทั้งหมด"}</td><td className="text-center">{"64"}</td><td className="text-center text-primary font-semibold">{"104"}</td></tr>
                          <tr className="border-b border-border/50"><td className="py-2">{"ระยะเวลา"}</td><td className="text-center">{"29 วัน"}</td><td className="text-center text-primary font-semibold">{"39 วัน"}</td></tr>
                          <tr><td className="py-2">{"รอบน็อคเอาท์"}</td><td className="text-center">{"16 ทีม"}</td><td className="text-center text-primary font-semibold">{"32 ทีม"}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Detail Modal */}
      <TeamDetailModal
        team={selectedTeam?.team ?? null}
        detail={selectedTeam?.detail ?? null}
        onClose={() => setSelectedTeam(null)}
      />

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
