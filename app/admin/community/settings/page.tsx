import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { COMMUNITY_RESTRICTION_DURATIONS } from "@/lib/server/content-moderation"

const supportedPolicies = [
  ["Community Ban", "Blocks community interactions until admin unbans. Login/read access remains allowed."],
  ["Suspension", "Blocks community interactions while suspendedAt is set. No expiry field exists yet."],
  ["Restriction", "Blocks content creation using postingRestrictedUntil. Duration is calculated server-side from allowlist."],
  ["Reports", "Banned users can still report content; duplicate policy remains on report routes."],
  ["Moderation Queue", "Post/comment/story/media/room_message/thread_root/match_poll are reviewed through existing moderation flow."],
]

export default function AdminCommunitySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Community Settings</h1>
        <p className="text-muted-foreground">ไม่มี mock toggles หรือปุ่ม save ปลอม เหลือเฉพาะ policy ที่ backend รองรับจริง</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Implemented Policies</CardTitle>
          <CardDescription>ค่าที่ระบบใช้จริงจาก code และ models เดิม</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {supportedPolicies.map(([title, description]) => (
            <div key={title} className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-400">REAL</Badge>
                <p className="font-semibold">{title}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restriction Duration Allowlist</CardTitle>
          <CardDescription>Client ส่ง label เท่านั้น Server เป็นผู้คำนวณ timestamp</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(COMMUNITY_RESTRICTION_DURATIONS).map(([key, value]) => (
            <Badge key={key} variant="outline">{key}: {Math.round(value / 36e5)} hours</Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Not Implemented As Settings</CardTitle>
          <CardDescription>ซ่อน control ที่ backend ยังไม่มี logic รองรับ แทนการทำ toggle หลอก</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>No persisted moderation thresholds UI yet.</p>
          <p>No database-backed community posting policy toggles yet.</p>
          <p>No admin notification preferences system in this scope.</p>
        </CardContent>
      </Card>
    </div>
  )
}
