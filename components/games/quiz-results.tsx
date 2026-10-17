"use client"

import { useState, useSyncExternalStore } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Brain, ChevronLeft, ChevronRight, User } from "lucide-react"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken, subscribeToAuthSession } from "@/lib/auth-client"
import { quizCategoryLabels, type QuizHistory, type QuizLeaderboard, type QuizPeriod } from "@/lib/games/quiz-results"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

function LoadError({ retry }: { retry: () => void }) {
  return <div role="alert" className="p-5 text-sm text-destructive">โหลดข้อมูลไม่สำเร็จ <Button variant="outline" onClick={retry}>ลองอีกครั้ง</Button></div>
}

export function QuizLeaderboardPanel() {
  const [period, setPeriod] = useState<QuizPeriod>("weekly")
  const { data, error, isLoading, mutate } = useSWR<QuizLeaderboard>(`/games/quiz/leaderboard?period=${period}`, fetchJson)
  return <div className="lg:col-span-3 min-w-0">
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div><Badge variant="outline" className="mb-2">Football Quiz + Who Am I · Top 50</Badge><h2 className="text-3xl md:text-4xl font-display">ลีดเดอร์บอร์ด</h2></div>
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg" role="group" aria-label="ช่วงเวลาอันดับ">
        {(["weekly", "monthly", "season"] as const).map(value => <button key={value} type="button" aria-pressed={period === value}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setPeriod(value)}>{value === "weekly" ? "สัปดาห์" : value === "monthly" ? "เดือน" : "ฤดูกาล"}</button>)}
      </div>
    </div>
    <Card className="border-border/50"><CardContent className="p-0" aria-busy={isLoading}>
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_2.5rem] sm:grid-cols-[3rem_minmax(0,1fr)_6rem_3rem] gap-2 px-3 sm:px-5 py-3 border-b border-border/50 text-xs text-muted-foreground font-medium bg-muted/30">
        <span>อันดับ</span><span>ผู้เล่น</span><span className="text-right">แต้มรวม</span><span className="text-right">รอบ</span>
      </div>
      {isLoading ? <p role="status" className="p-5 text-sm text-muted-foreground">กำลังโหลดอันดับ...</p> : error ? <LoadError retry={() => { void mutate() }} /> : !data?.players.length ? <p className="p-5 text-sm text-muted-foreground">ยังไม่มีผลเกมที่เล่นจบในช่วงเวลานี้</p> : data.players.map(player => <div key={player.rank} className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_2.5rem] sm:grid-cols-[3rem_minmax(0,1fr)_6rem_3rem] gap-2 px-3 sm:px-5 py-4 items-center border-b last:border-b-0 border-border/30 hover:bg-muted/30">
        <span className={`font-display text-lg ${player.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>{player.rank}</span>
        <div className="min-w-0 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
            {player.avatar ? <img src={player.avatar} alt="" width={40} height={40} className="object-cover w-full h-full" onError={event => { event.currentTarget.style.display = "none" }} /> : <User className="w-5 h-5 text-muted-foreground" />}
          </div><span className="font-medium truncate" title={player.name}>{player.name}</span>
        </div>
        <span className="font-display text-lg sm:text-xl text-primary text-right break-all">{player.points.toLocaleString("th-TH")}</span>
        <span className="text-sm text-muted-foreground text-right break-all">{player.games.toLocaleString("th-TH")}</span>
      </div>)}
    </CardContent></Card>
  </div>
}

export function QuizHistoryPanel() {
  const token = useSyncExternalStore(subscribeToAuthSession, getAuthToken, () => null)
  // A new account gets its own page state and cache key; another user's history is never retained.
  return <QuizHistoryForUser key={token || "guest"} token={token} />
}

function QuizHistoryForUser({ token }: { token: string | null }) {
  const [page, setPage] = useState(1)
  const { data, error, isLoading, mutate } = useSWR<QuizHistory>(token ? [`/games/quiz/history?page=${page}`, token] : null,
    ([path, auth]: [string, string]) => fetchJson<QuizHistory>(path, { headers: { Authorization: `Bearer ${auth}` } }))
  const loginRequired = !token || error?.status === 401
  return <div id="quiz-history">
    <h3 className="text-2xl font-display mb-4">ประวัติการเล่นเกม</h3>
    <Card className="border-border/50"><CardContent className="p-5 space-y-3" aria-busy={isLoading}>
      {loginRequired ? <p className="text-sm text-muted-foreground"><Link href="/login" className="text-primary underline">เข้าสู่ระบบ</Link> เพื่อดูประวัติของคุณ</p>
        : isLoading ? <p role="status" className="text-sm text-muted-foreground">กำลังโหลดประวัติ...</p>
        : error ? <LoadError retry={() => { void mutate() }} />
        : !data?.results.length ? <p className="text-sm text-muted-foreground">{page === 1 ? "คุณยังไม่ได้เล่นเกมจบสักรอบ" : "ไม่มีผลเกมในหน้านี้"}</p>
        : data.results.map(result => <Link key={result.id} href={`/games/${result.gameType === "who-am-i" ? "who-am-i" : "quiz"}?session=${result.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 hover:bg-muted/50">
          <Brain className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{result.gameType === "who-am-i" ? "Who Am I" : "Football Quiz"} · {quizCategoryLabels[result.category] || result.category}{result.gameType === "football-quiz" && result.difficulty ? ` · ${quizCategoryLabels[result.difficulty] || result.difficulty}` : ""}</p>
            <p className="text-xs text-muted-foreground">ตอบถูก {result.correctCount}/{result.totalQuestions} ข้อ</p>
            <time dateTime={result.completedAt} className="text-xs text-muted-foreground">{new Date(result.completedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</time>
          </div><span className="text-sm font-semibold text-primary shrink-0">+{result.score}</span>
        </Link>)}
      {!loginRequired && (page > 1 || (data && data.total > data.pageSize)) && <div className="flex items-center justify-between gap-3">
        <Button size="icon" variant="outline" title="หน้าก่อนหน้า" aria-label="หน้าก่อนหน้า" disabled={page === 1 || isLoading} onClick={() => setPage(value => value - 1)}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="text-xs text-muted-foreground">หน้า {page}</span>
        <Button size="icon" variant="outline" title="หน้าถัดไป" aria-label="หน้าถัดไป" disabled={!data || page * data.pageSize >= data.total || isLoading} onClick={() => setPage(value => value + 1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>}
    </CardContent></Card>
  </div>
}
