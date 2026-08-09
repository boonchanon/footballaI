import Link from "next/link"
import { ArrowLeft, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AddUserPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/admin/users"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">เพิ่มผู้ใช้ใหม่</h1>
          <p className="text-muted-foreground">หน้านี้ถูกปิด mock save แล้ว</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            User creation is not implemented
          </CardTitle>
          <CardDescription>ไม่มี API สร้าง user/admin account จริงใน scope Admin Community Completion นี้</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>ระบบเดิมมี `seed:admins` สำหรับ seed admin accounts และมี `/admin/users` สำหรับอ่านข้อมูลจริง</p>
          <p>เพื่อป้องกันความเข้าใจผิด จึงเอา form ที่เคย alert สำเร็จแบบ mock ออกแล้ว</p>
          <Button asChild variant="outline">
            <Link href="/admin/users">กลับไป User List</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
