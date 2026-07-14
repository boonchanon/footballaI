import { NextRequest } from "next/server"

import { getAuthUser, requireAuthUser } from "@/lib/server/auth"
import { mapSocialUser, toPlainId } from "@/lib/server/community-social"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http"
import { CommunityStory } from "@/lib/server/models"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const viewer = await getAuthUser(request)
    const now = new Date()

    const stories = await CommunityStory.find({ expiresAt: { $gt: now } })
      .populate("author", "name avatar favoriteTeam bio")
      .sort({ createdAt: -1 })
      .limit(40)

    const grouped = new Map<string, any>()

    for (const story of stories) {
      const author = mapSocialUser(story.author)
      const authorId = toPlainId(story.author?._id)
      const viewerId = viewer ? toPlainId(viewer._id) : ""
      const viewedBy = Array.isArray(story.viewedBy) ? story.viewedBy.map((item: any) => toPlainId(item)) : []
      const isViewed = viewerId ? viewedBy.includes(viewerId) : false
      const item = {
        id: toPlainId(story._id),
        image: story.image || "",
        caption: story.caption || "",
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        timeAgo: getTimeAgoThai(story.createdAt),
        views: Number(story.viewsCount || 0),
        isViewed,
        isOwn: viewer ? authorId === toPlainId(viewer._id) : false,
        author,
      }

      if (!grouped.has(authorId)) {
        grouped.set(authorId, {
          id: authorId,
          isOwn: item.isOwn,
          author,
          latestCreatedAt: story.createdAt,
          latestTimeAgo: item.timeAgo,
          latestImage: item.image,
          hasUnviewed: false,
          stories: [],
        })
      }

      grouped.get(authorId).stories.push(item)
    }

    const items = Array.from(grouped.values())
      .map((group) => ({
        ...group,
        stories: group.stories.sort(
          (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
        hasUnviewed: group.stories.some((story: any) => !story.isViewed),
      }))
      .sort((a, b) => {
        if (a.isOwn && !b.isOwn) return -1
        if (!a.isOwn && b.isOwn) return 1
        return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
      })

    return ok({ items })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load stories"
    return errorResponse(message, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const body = await request.json()
    const image = String(body.image || "").trim()
    const caption = String(body.caption || "").trim()

    if (!image) return errorResponse("Story image is required", 422)
    if (caption.length > 180) return errorResponse("Story caption is too long", 422)

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const story = await CommunityStory.create({
      author: user._id,
      image,
      caption,
      expiresAt,
    })

    const populated = await CommunityStory.findById(story._id).populate("author", "name avatar favoriteTeam bio")

    return ok(
      {
        item: {
          id: toPlainId(populated?._id),
          image: populated?.image || "",
          caption: populated?.caption || "",
          createdAt: populated?.createdAt,
          expiresAt: populated?.expiresAt,
          timeAgo: getTimeAgoThai(populated?.createdAt),
          views: Number(populated?.viewsCount || 0),
          isOwn: true,
          author: mapSocialUser(populated?.author),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create story"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await getAuthUser(request)
    const body = await request.json().catch(() => ({}))
    const storyId = String(body.storyId || "").trim()

    if (!storyId) return errorResponse("Story id is required", 422)

    const story = await CommunityStory.findById(storyId)
    if (!story) return errorResponse("Story not found", 404)

    if (!user?._id) {
      return ok({
        item: {
          id: toPlainId(story._id),
          views: Number(story.viewsCount || 0),
          counted: false,
        },
      })
    }

    const viewerId = toPlainId(user._id)
    const viewedBy = Array.isArray(story.viewedBy) ? story.viewedBy.map((item: any) => toPlainId(item)) : []
    const hasViewed = viewedBy.includes(viewerId)

    if (!hasViewed) {
      story.viewedBy = [...(story.viewedBy || []), user._id]
      story.viewsCount = Number(story.viewsCount || 0) + 1
      await story.save()
    }

    return ok({
      item: {
        id: toPlainId(story._id),
        views: Number(story.viewsCount || 0),
        counted: !hasViewed,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to count story view"
    return errorResponse(message, 500)
  }
}
