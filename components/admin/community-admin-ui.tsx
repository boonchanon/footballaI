"use client"

import type React from "react"

import { RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type StatusTone = "active" | "pending" | "restricted" | "banned" | "muted" | "info" | "destructive"

const toneClasses: Record<StatusTone, string> = {
  active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  restricted: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  banned: "border-red-500/20 bg-red-500/10 text-red-300",
  muted: "border-zinc-500/20 bg-zinc-500/10 text-zinc-300",
  info: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  destructive: "border-red-500/30 bg-red-500/15 text-red-200",
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  tone = "active",
}: {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  tone?: StatusTone
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardContent className="flex items-center gap-3 p-5">
        <div className={cn("rounded-xl border p-2", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminSectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn("border-border/70 bg-card/80", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function AdminStatusBadge({ children, tone = "muted" }: { children: React.ReactNode; tone?: StatusTone }) {
  return <Badge className={cn("border font-medium", toneClasses[tone])}>{children}</Badge>
}

export function getCommunityStatusTone(status: string): StatusTone {
  if (["active", "published", "approved", "resolved"].includes(status)) return "active"
  if (["pending", "pending_review", "processing", "flagged"].includes(status)) return "pending"
  if (["restricted"].includes(status)) return "restricted"
  if (["banned", "suspended", "rejected", "failed"].includes(status)) return "banned"
  if (["hidden", "dismissed"].includes(status)) return "muted"
  return "info"
}

export function AdminEmptyState({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center">
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  )
}

export function AdminRetryButton({ onRetry, label = "Retry" }: { onRetry: () => void; label?: string }) {
  return (
    <Button variant="outline" onClick={onRetry}>
      <RefreshCw className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}

export function AdminPagination({
  page,
  totalPages,
  loading,
  onPageChange,
}: {
  page: number
  totalPages: number
  loading?: boolean
  onPageChange: (page: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" disabled={page <= 1 || loading} onClick={() => onPageChange(Math.max(1, page - 1))}>
        ก่อนหน้า
      </Button>
      <span className="text-sm text-muted-foreground">
        หน้า {page} / {totalPages}
      </span>
      <Button variant="outline" disabled={page >= totalPages || loading} onClick={() => onPageChange(page + 1)}>
        ถัดไป
      </Button>
    </div>
  )
}

export function AdminActionDialog({
  open,
  title,
  description,
  target,
  reason,
  destructive,
  busy,
  confirmLabel,
  onReasonChange,
  onCancel,
  onConfirm,
  impact,
}: {
  open: boolean
  title: string
  description?: string
  target?: string
  reason: string
  destructive?: boolean
  busy?: boolean
  confirmLabel: string
  onReasonChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
  impact?: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onCancel() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {target ? (
          <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
            <span className="text-muted-foreground">User: </span>
            <span className="font-medium">{target}</span>
          </div>
        ) : null}
        {impact ? <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground">{impact}</div> : null}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="admin-action-reason">
            Reason *
          </label>
          <Textarea
            id="admin-action-reason"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="บันทึกเหตุผลอย่างน้อย 6 ตัวอักษร"
            className="min-h-28"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={busy || reason.trim().length < 6} onClick={onConfirm}>
            {busy ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
