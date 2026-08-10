import { ADMIN_ROLE_LABELS, ADMIN_ROLES, canManageCommunityAdmin, getAdminSections } from "@/lib/admin-access"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const allSections = ["dashboard", "leagues", "matches", "teams", "players", "heatmap", "ai", "community", "users", "settings"] as const

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Roles & Permissions</h1>
        <p className="mt-1 text-muted-foreground">Read-only matrix จาก server policy จริงใน lib/admin-access.ts</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ADMIN_ROLES.map((role) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle>{ADMIN_ROLE_LABELS[role]}</CardTitle>
              <CardDescription>{role}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {getAdminSections(role).map((section) => (
                  <Badge key={section} variant="outline">{section}</Badge>
                ))}
              </div>
              {canManageCommunityAdmin(role) ? <Badge className="bg-emerald-500/10 text-emerald-400">Can manage Community Admin</Badge> : <Badge variant="secondary">No Community write access</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>ไม่มี create/edit/delete role mock ในหน้านี้แล้ว</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3">Section</th>
                {ADMIN_ROLES.map((role) => <th key={role} className="p-3">{ADMIN_ROLE_LABELS[role]}</th>)}
              </tr>
            </thead>
            <tbody>
              {allSections.map((section) => (
                <tr key={section} className="border-b border-border/60">
                  <td className="p-3 font-medium">{section}</td>
                  {ADMIN_ROLES.map((role) => (
                    <td key={`${role}-${section}`} className="p-3">
                      {getAdminSections(role).includes(section) ? <Badge className="bg-emerald-500/10 text-emerald-400">Allowed</Badge> : <Badge variant="secondary">Blocked</Badge>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
