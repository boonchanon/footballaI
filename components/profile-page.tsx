"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { motion } from "framer-motion"
import { Bell, Bookmark, Edit, Heart, KeyRound, LogOut, Mail, MessageSquare, Save, Settings, Shield, Trash2, Trophy } from "lucide-react"

import { apiUrl, fetchJson } from "@/lib/api-client"
import { saveAuthSession } from "@/lib/auth-client"
import { useAuthSession } from "@/hooks/use-auth-session"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

function authorizedFetcher<T>(url: string, token: string) {
  return fetch(apiUrl(url), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((res) => res.json())
}

export function ProfilePage() {
  const { token, user, logout } = useAuthSession()
  const { toast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [postTab, setPostTab] = useState<"posts" | "reposts">("posts")
  const [profileForm, setProfileForm] = useState({
    name: "",
    avatar: "",
    favoriteTeam: "",
    bio: "",
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  })
  const [deleteForm, setDeleteForm] = useState({
    currentPassword: "",
  })

  const { data: profileData, mutate: mutateProfile } = useSWR(
    token ? ["/auth/me", token] : null,
    ([url, authToken]) => authorizedFetcher<{ user: any }>(url, authToken),
  )
  const { data: favoritesData, mutate: mutateFavorites } = useSWR(
    token ? ["/favorites", token] : null,
    ([url, authToken]) => authorizedFetcher<{ items: any[] }>(url, authToken),
  )
  const { data: predictionsData, mutate: mutatePredictions } = useSWR(
    token ? ["/predictions", token] : null,
    ([url, authToken]) => authorizedFetcher<{ items: any[] }>(url, authToken),
  )
  const { data: postsData } = useSWR(
    token ? ["/community/posts?mine=true&limit=12", token] : null,
    ([url, authToken]) => authorizedFetcher<{ items: any[] }>(url, authToken),
  )
  const { data: activityData, mutate: mutateActivity } = useSWR(
    token ? ["/users/me/activity", token] : null,
    ([url, authToken]) => authorizedFetcher<any>(url, authToken),
  )

  const currentUser = profileData?.user || user
  const displayName = currentUser?.name || "ผู้ใช้งาน"
  const displayEmail = currentUser?.email || "-"
  const displayAvatar = currentUser?.avatar || "/placeholder-user.jpg"

  useEffect(() => {
    if (!currentUser) return
    setProfileForm({
      name: currentUser.name || "",
      avatar: currentUser.avatar || "",
      favoriteTeam: currentUser.favoriteTeam || "",
      bio: currentUser.bio || "",
    })
  }, [currentUser])

  const favoriteTeams = useMemo(
    () => (favoritesData?.items || []).filter((item) => item.itemType === "team").map((item) => item.title).slice(0, 5),
    [favoritesData?.items],
  )
  const ownPosts = useMemo(
    () => (postsData?.items || []).filter((item) => item.sharedItem?.type !== "post"),
    [postsData?.items],
  )
  const ownReposts = useMemo(
    () => (postsData?.items || []).filter((item) => item.sharedItem?.type === "post"),
    [postsData?.items],
  )

  async function handleSaveProfile() {
    if (!token) return
    setSavingProfile(true)
    try {
      const data = await fetchJson<{ user: any }>("/auth/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      })
      saveAuthSession({ token, user: data.user })
      await mutateProfile()
      setEditOpen(false)
      toast({ title: "บันทึกโปรไฟล์แล้ว", description: "ข้อมูลของคุณถูกอัปเดตเรียบร้อย" })
    } catch (error) {
      toast({
        title: "บันทึกโปรไฟล์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    if (!token) return
    setSavingPassword(true)
    try {
      await fetchJson("/auth/change-password", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwordForm),
      })
      setPasswordForm({ currentPassword: "", newPassword: "" })
      setPasswordOpen(false)
      toast({ title: "เปลี่ยนรหัสผ่านแล้ว", description: "รหัสผ่านใหม่ถูกบันทึกเรียบร้อย" })
    } catch (error) {
      toast({
        title: "เปลี่ยนรหัสผ่านไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleDeleteAccount() {
    if (!token) return
    setDeletingAccount(true)
    try {
      await fetchJson("/auth/me", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deleteForm),
      })
      logout()
      setDeleteOpen(false)
      toast({
        title: "ลบบัญชีเรียบร้อย",
        description: "บัญชีและข้อมูลที่เกี่ยวข้องถูกลบออกจากระบบแล้ว",
      })
      window.location.href = "/"
    } catch (error) {
      toast({
        title: "ลบบัญชีไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setDeletingAccount(false)
    }
  }

  async function handleRemoveFavorite(favoriteId: string) {
    if (!token) return

    try {
      await fetchJson(`/favorites/${favoriteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      await Promise.all([mutateFavorites(), mutateActivity()])
      toast({ title: "ลบรายการโปรดแล้ว", description: "รายการที่บันทึกถูกลบเรียบร้อย" })
    } catch (error) {
      toast({
        title: "ลบรายการโปรดไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  async function handleDeletePrediction(predictionId: string) {
    if (!token) return

    try {
      await fetchJson(`/predictions/${predictionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      await Promise.all([mutatePredictions(), mutateActivity()])
      toast({ title: "ลบประวัติการทายผลแล้ว", description: "รายการนี้ถูกลบเรียบร้อย" })
    } catch (error) {
      toast({
        title: "ลบประวัติการทายผลไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!token) return

    try {
      await fetchJson(`/community/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      await mutateActivity()
      toast({ title: "ลบคอมเมนต์แล้ว", description: "ความคิดเห็นถูกลบเรียบร้อย" })
    } catch (error) {
      toast({
        title: "ลบคอมเมนต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="border-border/50">
          <CardContent className="space-y-4 py-10 text-center">
            <p className="text-lg font-medium">ยังไม่ได้เข้าสู่ระบบ</p>
            <p className="text-muted-foreground">กรุณาเข้าสู่ระบบก่อนใช้งานหน้าโปรไฟล์</p>
            <Button asChild>
              <a href="/login">เข้าสู่ระบบ</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
        <Card className="overflow-hidden border-border/50">
          <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
          <CardContent className="relative pb-6 pt-0">
            <div className="-mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback className="bg-primary text-2xl font-display text-primary-foreground">
                  {displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 pt-4 sm:pt-0">
                <h1 className="mb-1 text-2xl font-display">{displayName}</h1>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {displayEmail}
                </p>
                {currentUser.bio && <p className="mt-2 text-sm text-muted-foreground">{currentUser.bio}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Edit className="h-4 w-4" />
                      แก้ไขโปรไฟล์
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>แก้ไขโปรไฟล์</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">ชื่อ</Label>
                        <Input id="name" value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="avatar">ลิงก์รูปโปรไฟล์</Label>
                        <Input id="avatar" value={profileForm.avatar} onChange={(e) => setProfileForm((prev) => ({ ...prev, avatar: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="favoriteTeam">ทีมโปรดหลัก</Label>
                        <Input
                          id="favoriteTeam"
                          value={profileForm.favoriteTeam}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, favoriteTeam: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea id="bio" value={profileForm.bio} onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                          ยกเลิก
                        </Button>
                        <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
                          <Save className="h-4 w-4" />
                          {savingProfile ? "กำลังบันทึก..." : "บันทึก"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
                      <KeyRound className="h-4 w-4" />
                      เปลี่ยนรหัสผ่าน
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>เปลี่ยนรหัสผ่าน</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setPasswordOpen(false)}>
                          ยกเลิก
                        </Button>
                        <Button onClick={handleChangePassword} disabled={savingPassword}>
                          {savingPassword ? "กำลังบันทึก..." : "บันทึก"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      ลบบัญชี
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>ยืนยันการลบบัญชี</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        การลบบัญชีจะลบโปรไฟล์ รายการโปรด ประวัติการทำนาย และข้อมูลชุมชนที่เกี่ยวข้องออกจากระบบถาวร
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="deletePassword">รหัสผ่านปัจจุบัน</Label>
                        <Input
                          id="deletePassword"
                          type="password"
                          value={deleteForm.currentPassword}
                          onChange={(e) => setDeleteForm({ currentPassword: e.target.value })}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                          ยกเลิก
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount}>
                          {deletingAccount ? "กำลังลบบัญชี..." : "ยืนยันการลบ"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Profile Feed</CardTitle>
                <CardDescription>Switch between your original posts and reposted posts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="inline-flex rounded-full border border-border/60 bg-muted/30 p-1">
                  <button
                    type="button"
                    onClick={() => setPostTab("posts")}
                    className={`rounded-full px-3 py-1 text-xs transition ${postTab === "posts" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    Posts
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostTab("reposts")}
                    className={`rounded-full px-3 py-1 text-xs transition ${postTab === "reposts" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    Reposts
                  </button>
                </div>

                {(postTab === "posts" ? ownPosts : ownReposts).length > 0 ? (
                  (postTab === "posts" ? ownPosts : ownReposts).map((post: any) => (
                    <div key={`profile-feed-${post.id}`} className="rounded-lg border border-border/50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="outline">{post.categoryLabel}</Badge>
                        {post.sharedItem?.type === "post" ? <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Reposted</Badge> : null}
                        <span className="text-xs text-muted-foreground">{post.timeAgo}</span>
                      </div>
                      <p className="font-medium">{post.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{post.excerpt}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{postTab === "posts" ? "No profile posts yet." : "No reposts on this profile yet."}</p>
                )}
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="h-5 w-5 text-primary" />
                  ทีมโปรด
                </CardTitle>
                <CardDescription>ทีมฟุตบอลที่คุณติดตาม</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {favoriteTeams.length > 0 ? (
                    favoriteTeams.map((team) => (
                      <Badge key={team} variant="secondary" className="px-3 py-1.5">
                        {team}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">ยังไม่มีรายการทีมโปรด</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-primary" />
                  สถิติการใช้งาน
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <p className="text-3xl font-display text-primary">{predictionsData?.items?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">การทำนาย</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <p className="text-3xl font-display text-primary">{favoritesData?.items?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">รายการโปรด</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <p className="text-3xl font-display text-primary">{postsData?.items?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">โพสต์ชุมชน</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">โพสต์ล่าสุดของคุณ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(postsData?.items || []).length > 0 ? (
                  postsData.items.map((post: any) => (
                    <div key={post.id} className="rounded-lg border border-border/50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="outline">{post.categoryLabel}</Badge>
                        <span className="text-xs text-muted-foreground">{post.timeAgo}</span>
                      </div>
                      <p className="font-medium">{post.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{post.excerpt}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีโพสต์จากบัญชีนี้</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  ความคิดเห็นล่าสุด
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(activityData?.comments || []).length > 0 ? (
                  activityData.comments.map((item: any) => (
                    <div key={item.id} className="rounded-lg border border-border/50 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <Badge variant="outline">{item.targetType}</Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{item.timeAgo}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteComment(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการคอมเมนต์</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  ข้อมูลบัญชี
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">สถานะ</p>
                  <p className="font-medium">{currentUser.role === "admin" ? "ผู้ดูแลระบบ" : "สมาชิกปกติ"}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">ทีมโปรดหลัก</p>
                  <p className="font-medium">{currentUser.favoriteTeam || "-"}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">สมาชิกตั้งแต่</p>
                  <p className="font-medium">{currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString("th-TH") : "-"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bookmark className="h-5 w-5 text-primary" />
                  รายการที่บันทึกไว้
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">ข่าวที่บันทึกไว้</p>
                  <div className="space-y-2">
                    {(activityData?.saved?.articles || []).slice(0, 3).map((item: any) => (
                      <div key={item.id} className="rounded-lg border border-border/50 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.timeAgo}</p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemoveFavorite(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(activityData?.saved?.articles || []).length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีข่าวที่บันทึกไว้</p>}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">โพสต์ที่บันทึกไว้</p>
                  <div className="space-y-2">
                    {(activityData?.saved?.posts || []).slice(0, 3).map((item: any) => (
                      <div key={item.id} className="rounded-lg border border-border/50 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.subtitle || item.timeAgo}</p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemoveFavorite(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(activityData?.saved?.posts || []).length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีโพสต์ที่บันทึกไว้</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">ประวัติการทายผล</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(activityData?.predictions || []).length > 0 ? (
                  activityData.predictions.map((item: any) => (
                    <div key={item.id} className="rounded-lg border border-border/50 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {item.homeTeam} vs {item.awayTeam}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{item.timeAgo}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeletePrediction(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ทายสกอร์ {item.predictedScore?.home ?? 0} - {item.predictedScore?.away ?? 0} · ความมั่นใจ {item.confidence ?? 0}%
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการทำนาย</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">การตั้งค่า</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="h-10 w-full justify-start gap-2" disabled>
                  <Settings className="h-4 w-4" />
                  ตั้งค่าบัญชี
                </Button>
                <Button variant="ghost" className="h-10 w-full justify-start gap-2" disabled>
                  <Bell className="h-4 w-4" />
                  การแจ้งเตือน
                </Button>
                <Separator />
                <Button variant="ghost" className="h-10 w-full justify-start gap-2 text-destructive hover:text-destructive" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  ออกจากระบบ
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
