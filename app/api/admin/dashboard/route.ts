import { NextRequest } from "next/server"

import { requireAdminUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http-utils"
import { Admin, Comment, CommunityPost, CommunityReport, Favorite, Prediction, User } from "@/lib/server/models"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminUser(request)

    const [
      totalUsers,
      totalAdmins,
      totalPredictions,
      totalFavorites,
      totalPosts,
      totalComments,
      totalReports,
      pendingReports,
      hiddenPosts,
      latestUsers,
      latestPosts,
      latestReports,
    ] = await Promise.all([
      User.countDocuments({}),
      Admin.countDocuments({}),
      Prediction.countDocuments({}),
      Favorite.countDocuments({}),
      CommunityPost.countDocuments({}),
      Comment.countDocuments({}),
      CommunityReport.countDocuments({}),
      CommunityReport.countDocuments({ status: "pending" }),
      CommunityPost.countDocuments({ status: "hidden" }),
      User.find({}).sort({ createdAt: -1 }).limit(3).select("name email createdAt"),
      CommunityPost.find({}).sort({ createdAt: -1 }).limit(3).populate("author", "name").select("title createdAt author"),
      CommunityReport.find({})
        .sort({ createdAt: -1 })
        .limit(4)
        .populate("reporter", "name")
        .populate({ path: "post", select: "title" })
        .select("createdAt reporter post"),
    ])

    const recentActivity = [
      ...latestUsers.map((user: any) => ({
        id: `user-${user._id.toString()}`,
        action: "ผู้ใช้สมัครสมาชิกใหม่",
        actor: user.name || user.email,
        target: user.email,
        createdAt: user.createdAt,
        timeAgo: getTimeAgoThai(user.createdAt),
      })),
      ...latestPosts.map((post: any) => ({
        id: `post-${post._id.toString()}`,
        action: "มีโพสต์ใหม่ในคอมมูนิตี้",
        actor: post.author?.name || "ผู้ใช้งาน",
        target: post.title,
        createdAt: post.createdAt,
        timeAgo: getTimeAgoThai(post.createdAt),
      })),
      ...latestReports.map((report: any) => ({
        id: `report-${report._id.toString()}`,
        action: "มีการรายงานโพสต์",
        actor: report.reporter?.name || "ผู้ใช้งาน",
        target: report.post?.title || "โพสต์",
        createdAt: report.createdAt,
        timeAgo: getTimeAgoThai(report.createdAt),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)

    return ok({
      stats: {
        totalUsers,
        totalAdmins,
        totalPosts,
        totalComments,
        totalReports,
        pendingReports,
        hiddenPosts,
        totalPredictions,
        totalFavorites,
      },
      recentActivity,
      topSections: [
        { label: "คอมมูนิตี้", value: totalPosts, description: "จำนวนโพสต์ทั้งหมด" },
        { label: "ความคิดเห็น", value: totalComments, description: "คอมเมนต์ที่ถูกบันทึก" },
        { label: "รายงาน", value: totalReports, description: "รายการที่ผู้ใช้แจ้งเข้ามา" },
        { label: "การทำนาย AI", value: totalPredictions, description: "ประวัติการทำนายทั้งหมด" },
      ],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load admin dashboard"
    return errorResponse(message, message === "Admin authentication required" ? 401 : 500)
  }
}
