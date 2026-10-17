"use client"

import { LockKeyhole, MapPin } from "lucide-react"
import type { WhoSessionView } from "@/lib/games/who-am-i"

export function WhoChallenge({ question }: { question: WhoSessionView["currentQuestion"] }) {
  if (question.mode === "stats") {
    return <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-6" aria-live="polite">
      {question.clues.map((clue, i) => <div key={i} className="min-w-0 min-h-24 py-4 border-b border-border/50">
        <p className="text-xs text-muted-foreground mb-2">{question.clueLabels[i] ?? `สถิติที่ ${i + 1}`}</p>
        {clue !== null ? <p className="font-display text-lg text-primary break-words">{clue}</p>
          : <div className="flex items-center gap-2 text-muted-foreground"><LockKeyhole className="w-4 h-4" /><span>???</span></div>}
      </div>)}
    </div>
  }
  if (question.mode === "career") {
    return <ol className="mb-6 ml-3 border-l border-border" aria-live="polite">
      {question.clues.map((clue, i) => <li key={i} className="relative pl-7 py-3 min-h-20">
        <span className={`absolute -left-3 top-4 w-6 h-6 rounded-full flex items-center justify-center ${clue !== null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {clue !== null ? <MapPin className="w-3.5 h-3.5" /> : <LockKeyhole className="w-3 h-3" />}
        </span>
        <p className="text-xs text-muted-foreground mb-1">{question.clueLabels[i] ?? `เส้นทางที่ ${i + 1}`}</p>
        <p className={`text-sm ${clue !== null ? "font-medium" : "text-muted-foreground"}`}>{clue ?? "???"}</p>
      </li>)}
    </ol>
  }
  return <div className="space-y-3 mb-6" aria-live="polite">
    {question.clues.map((clue, i) => <div key={i} className={`flex items-start gap-3 p-3 rounded-lg transition-all ${clue !== null ? "bg-primary/5 border border-primary/20" : "bg-muted/30 border border-border/50"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${clue !== null ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
      <p className={`text-sm leading-relaxed pt-0.5 ${clue === null ? "text-muted-foreground italic" : ""}`}>{clue ?? "???  ???  ???  ???"}</p>
    </div>)}
  </div>
}
