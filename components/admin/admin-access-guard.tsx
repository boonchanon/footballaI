"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAuthSession } from "@/hooks/use-auth-session"
import { canAccessAdminPath, getDefaultAdminRoute, isAdminRole } from "@/lib/admin-access"

export function AdminAccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, user } = useAuthSession()
  const isLoginPage = pathname === "/admin/login"

  useEffect(() => {
    if (isLoginPage) {
      if (isLoggedIn && isAdminRole(user?.role)) {
        router.replace(getDefaultAdminRoute(user.role))
      }
      return
    }

    if (!isLoggedIn || !isAdminRole(user?.role)) {
      router.replace("/admin/login")
      return
    }

    if (!canAccessAdminPath(user.role, pathname)) {
      router.replace(getDefaultAdminRoute(user.role))
    }
  }, [isLoggedIn, isLoginPage, pathname, router, user?.role])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (!isLoggedIn || !isAdminRole(user?.role) || !canAccessAdminPath(user.role, pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">กำลังตรวจสอบสิทธิ์แอดมิน...</p>
          <p className="text-sm text-muted-foreground">ถ้าบัญชีนี้ไม่มีสิทธิ์ ระบบจะพาไปหน้าที่เหมาะสมอัตโนมัติ</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
