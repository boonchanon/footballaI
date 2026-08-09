import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BLOCKED_GAMBLING_DOMAINS,
  GAMBLING_PROMOTION_PATTERNS,
  GAMBLING_TERMS,
  HARASSMENT_PATTERNS,
  PROFANITY_TERMS,
  THREAT_PATTERNS,
} from "@/lib/server/content-moderation"

const groups = [
  { title: "Profanity Terms", items: PROFANITY_TERMS, category: "profanity" },
  { title: "Harassment Patterns", items: HARASSMENT_PATTERNS, category: "harassment" },
  { title: "Threat Patterns", items: THREAT_PATTERNS, category: "threat" },
  { title: "Gambling Terms", items: GAMBLING_TERMS, category: "gambling" },
  { title: "Gambling Promotion Patterns", items: GAMBLING_PROMOTION_PATTERNS, category: "promotion" },
  { title: "Blocked Gambling Domains", items: BLOCKED_GAMBLING_DOMAINS, category: "domain" },
]

export default function AdminBannedWordsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Banned Words</h1>
        <p className="text-muted-foreground">Read-only view ของ moderation engine จริง ไม่มี mock/local-only save</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Persistence Status</CardTitle>
          <CardDescription>ระบบปัจจุบันใช้ static server-side lists ใน content moderation helper</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>ยังไม่มี database-backed moderation configuration เดิมให้เชื่อมต่ออย่างปลอดภัยใน sprint นี้</p>
          <p>จึงถอดปุ่ม add/import/export/delete ที่เคยเป็น mock ออก เพื่อไม่ให้ admin เข้าใจว่าบันทึกจริง</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              <CardDescription>{group.items.length} entries</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <Badge key={item} variant="outline">
                  {group.category}: {item}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
