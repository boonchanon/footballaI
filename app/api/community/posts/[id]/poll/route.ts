import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { awardCommunityFanBadges } from "@/lib/server/community-fan-profile"
import { createCommunityNotification } from "@/lib/server/community-notifications"
import { assertCommunityInteractionAllowed } from "@/lib/server/content-moderation"
import { isFinishedMatchStatus } from "@/lib/server/community-match-room"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { CommunityPost } from "@/lib/server/models"

function mapPollResponse(post: any, viewerVote: string) {
  const totalVotes = Number(post.poll?.totalVotes || 0)
  return {
    question: post.poll?.question || "",
    totalVotes,
    viewerVote,
    options: (post.poll?.options || []).map((item: any) => ({
      id: item.id,
      text: item.text,
      votes: Number(item.votes || 0),
      percent: totalVotes > 0 ? Math.round((Number(item.votes || 0) / totalVotes) * 100) : 0,
    })),
  }
}

function getOptionIndex(post: any, optionId: string) {
  return Array.isArray(post.poll?.options) ? post.poll.options.findIndex((item: any) => item.id === optionId) : -1
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    await assertCommunityInteractionAllowed(user._id.toString(), "vote_poll")
    const { id } = await context.params
    const body = await request.json()
    const optionId = String(body.optionId || "").trim()

    if (!optionId) return errorResponse("Poll option is required", 422)

    const post = await CommunityPost.findById(id)
    if (!post || post.status !== "published" || post.moderation?.status !== "approved") {
      return errorResponse("Post not found", 404)
    }
    if (!post.poll?.question || !Array.isArray(post.poll.options) || post.poll.options.length < 2) {
      return errorResponse("This post does not have a poll", 422)
    }
    if (post.matchId && !isFinishedMatchStatus(String(post.matchContext?.status || ""))) {
      return errorResponse("Post-match poll opens after the match is finished", 422)
    }

    const optionIndex = getOptionIndex(post, optionId)
    if (optionIndex < 0) return errorResponse("Poll option not found", 422)

    const userId = user._id.toString()
    const currentVotes = Array.isArray(post.pollVotes) ? post.pollVotes : []
    const existingVote = currentVotes.find((vote: any) => vote?.user?.toString?.() === userId)
    if (existingVote) {
      if (existingVote.optionId === optionId) {
        return ok({ poll: mapPollResponse(post, optionId), idempotent: true })
      }

      const previousOptionIndex = getOptionIndex(post, existingVote.optionId)
      if (previousOptionIndex < 0) {
        return errorResponse("Previous poll option not found", 409)
      }

      const updatedPost = await CommunityPost.findOneAndUpdate(
        {
          _id: id,
          status: "published",
          "moderation.status": "approved",
          "pollVotes.user": user._id,
        },
        {
          $set: {
            "pollVotes.$.optionId": optionId,
            "pollVotes.$.votedAt": new Date(),
          },
          $inc: {
            [`poll.options.${previousOptionIndex}.votes`]: -1,
            [`poll.options.${optionIndex}.votes`]: 1,
          },
        },
        { new: true },
      )

      if (!updatedPost) {
        const freshPost = await CommunityPost.findById(id)
        const freshVote = (freshPost?.pollVotes || []).find((vote: any) => vote?.user?.toString?.() === userId)
        return ok({ poll: mapPollResponse(freshPost || post, freshVote?.optionId || existingVote.optionId), idempotent: true })
      }

      return ok({ poll: mapPollResponse(updatedPost, optionId), changed: true })
    }

    const updatedPost = await CommunityPost.findOneAndUpdate(
      {
        _id: id,
        status: "published",
        "moderation.status": "approved",
        "poll.options.id": optionId,
        "pollVotes.user": { $ne: user._id },
      },
      {
        $inc: {
          "poll.totalVotes": 1,
          [`poll.options.${optionIndex}.votes`]: 1,
        },
        $push: {
          pollVotes: { user: user._id, optionId, votedAt: new Date() },
        },
      },
      { new: true },
    )

    if (!updatedPost) {
      const freshPost = await CommunityPost.findById(id)
      const freshVote = (freshPost?.pollVotes || []).find((vote: any) => vote?.user?.toString?.() === userId)
      if (freshVote) return ok({ poll: mapPollResponse(freshPost, freshVote.optionId), idempotent: true })
      return errorResponse("Failed to record poll vote", 409)
    }

    await awardCommunityFanBadges({
      userId,
      action: "poll_voted",
      eventKey: `poll-vote:${post._id.toString()}:${userId}`,
      postId: post._id.toString(),
      matchId: post.matchId || "",
    })

    const authorId = post.author?.toString?.() || ""
    if (authorId && authorId !== userId) {
      await createCommunityNotification({
        recipientId: authorId,
        actorId: userId,
        postId: post._id.toString(),
        type: "post_poll_vote",
        referenceType: "poll",
        message: "มีคนร่วมโหวตโพลของคุณ",
        dedupeKey: `poll-vote:${post._id.toString()}:${userId}:${authorId}`,
      })
    }

    return ok({
      poll: mapPollResponse(updatedPost, optionId),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to vote poll"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
