"use client"

import { useEffect, useState } from "react"
import { Loader2, Save } from "lucide-react"

import { ADMIN_ROLE_LABELS, ADMIN_ROLES, ADMIN_SECTIONS, type AdminRole, type AdminSection, getAdminSections } from "@/lib/admin-access"
import { fetchJson } from "@/lib/api-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AdminAccount = {
  id: string
  email: string
  role: AdminRole
  permissions: AdminSection[]
  isActive: boolean
}

type Draft = { role: AdminRole; permissions: AdminSection[] }
type Notice = { type: "success" | "error"; message: string } | null

// Admins saved before permissions were editable have an empty list; start them from their role's defaults.
function draftOf(admin: AdminAccount): Draft {
  return { role: admin.role, permissions: admin.permissions.length ? admin.permissions : getAdminSections(admin.role) }
}

function sameDraft(a: Draft, b: Draft) {
  return a.role === b.role && a.permissions.length === b.permissions.length && a.permissions.every((section) => b.permissions.includes(section))
}

export default function RolesPage() {
  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice>(null)

  useEffect(() => {
    void loadAdmins()
  }, [])

  async function loadAdmins() {
    setLoading(true)
    try {
      const response = await fetchJson<{ items: AdminAccount[] }>("/admin/admins")
      const items = response.items ?? []
      setAdmins(items)
      setDrafts(Object.fromEntries(items.map((admin) => [admin.id, draftOf(admin)])))
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "โหลดรายชื่อผู้ดูแลระบบไม่สำเร็จ" })
    } finally {
      setLoading(false)
    }
  }

  function setRole(id: string, role: AdminRole) {
    setDrafts((current) => ({ ...current, [id]: { role, permissions: getAdminSections(role) } }))
  }

  function togglePermission(id: string, section: AdminSection, checked: boolean) {
    setDrafts((current) => {
      const draft = current[id]
      const permissions = checked ? [...draft.permissions, section] : draft.permissions.filter((item) => item !== section)
      return { ...current, [id]: { ...draft, permissions: ADMIN_SECTIONS.filter((item) => permissions.includes(item)) } }
    })
  }

  async function save(admin: AdminAccount) {
    const draft = drafts[admin.id]
    if (!draft) return
    setSavingId(admin.id)
    setNotice(null)
    try {
      const response = await fetchJson<{ item: AdminAccount }>(`/admin/admins/${admin.id}`, {
        method: "PATCH",
        body: JSON.stringify(draft),
      })
      setAdmins((current) => current.map((item) => (item.id === admin.id ? response.item : item)))
      setDrafts((current) => ({ ...current, [admin.id]: draftOf(response.item) }))
      setNotice({ type: "success", message: `บันทึกสิทธิ์ของ ${admin.email} เรียบร้อยแล้ว` })
    } catch (error) {
      setNotice({ type: "error", message: `บันทึกไม่สำเร็จ: ${error instanceof Error ? error.message : "เกิดข้อผิดพลาด"}` })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Roles & Permissions</h1>
        <p className="mt-1 text-muted-foreground">กำหนดบทบาทและสิทธิ์การเข้าถึงแต่ละส่วนของผู้ดูแลระบบ (บันทึกใน Collection admins)</p>
      </div>

      {notice && (
        <Alert variant={notice.type === "error" ? "destructive" : "default"} className={notice.type === "success" ? "border-emerald-500/40 text-emerald-600" : undefined}>
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {ADMIN_ROLES.map((role) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle>{ADMIN_ROLE_LABELS[role]}</CardTitle>
              <CardDescription>สิทธิ์เริ่มต้นของบทบาท {role}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {getAdminSections(role).map((section) => (
                <Badge key={section} variant="outline">{section}</Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ผู้ดูแลระบบ</CardTitle>
          <CardDescription>เลือกบทบาทและติ๊กส่วนที่อนุญาต แล้วกดบันทึกทีละบัญชี</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />กำลังโหลด...</div>
          ) : admins.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">ยังไม่มีผู้ดูแลระบบ</p>
          ) : (
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-3">Admin</th>
                  <th className="p-3">Role</th>
                  {ADMIN_SECTIONS.map((section) => <th key={section} className="p-3 text-center">{section}</th>)}
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => {
                  const draft = drafts[admin.id] ?? draftOf(admin)
                  const dirty = !sameDraft(draft, draftOf(admin))
                  return (
                    <tr key={admin.id} className="border-b border-border/60">
                      <td className="p-3">
                        <p className="font-medium">{admin.email}</p>
                        {admin.isActive ? <Badge className="mt-1 bg-emerald-500/10 text-emerald-500">Active</Badge> : <Badge variant="secondary" className="mt-1">Inactive</Badge>}
                      </td>
                      <td className="p-3">
                        <Select value={draft.role} onValueChange={(role) => setRole(admin.id, role as AdminRole)}>
                          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ADMIN_ROLES.map((role) => <SelectItem key={role} value={role}>{ADMIN_ROLE_LABELS[role]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      {ADMIN_SECTIONS.map((section) => (
                        <td key={section} className="p-3 text-center">
                          <Checkbox
                            aria-label={`${admin.email} ${section}`}
                            checked={draft.permissions.includes(section)}
                            onCheckedChange={(checked) => togglePermission(admin.id, section, checked === true)}
                          />
                        </td>
                      ))}
                      <td className="p-3">
                        <Button size="sm" disabled={!dirty || savingId === admin.id} onClick={() => void save(admin)}>
                          {savingId === admin.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          บันทึก
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
