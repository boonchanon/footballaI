import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import {
  getCommunityPreferenceOptions,
  getSelectedPreferenceDetails,
  validateCommunityPreferences,
} from "@/lib/server/community-preferences"
import { DEFAULT_MATCH_NOTIFICATION_PREFERENCES, getMatchNotificationPreferences } from "@/lib/server/community-notifications"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"

function mapPreferences(user: any, options: Awaited<ReturnType<typeof getCommunityPreferenceOptions>>) {
  const favoriteTeamIds = Array.isArray(user.favoriteTeamIds) ? user.favoriteTeamIds : []
  const favoritePlayerIds = Array.isArray(user.favoritePlayerIds) ? user.favoritePlayerIds : []
  const preferredContentTypes = Array.isArray(user.preferredContentTypes) ? user.preferredContentTypes : []

  return {
    favoriteTeamIds,
    favoritePlayerIds,
    preferredContentTypes,
    favoriteTeams: getSelectedPreferenceDetails(favoriteTeamIds, options.teams),
    favoritePlayers: getSelectedPreferenceDetails(favoritePlayerIds, options.players),
    preferredContentTypeDetails: getSelectedPreferenceDetails(preferredContentTypes, options.contentTypes as any),
    notificationPreferences: {
      matchRoom: getMatchNotificationPreferences(user),
    },
  }
}

function normalizeMatchRoomNotificationPreferences(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const source = value as Record<string, unknown>
  return Object.fromEntries(
    Object.keys(DEFAULT_MATCH_NOTIFICATION_PREFERENCES).map((key) => [
      key,
      typeof source[key] === "boolean" ? source[key] : DEFAULT_MATCH_NOTIFICATION_PREFERENCES[key as keyof typeof DEFAULT_MATCH_NOTIFICATION_PREFERENCES],
    ]),
  )
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const options = await getCommunityPreferenceOptions()

    return ok({
      preferences: mapPreferences(user, options),
      options,
      limits: {
        favoriteTeams: 5,
        favoritePlayers: 20,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load preferences"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const body = await request.json()
    const validated = await validateCommunityPreferences({
      favoriteTeamIds: body.favoriteTeamIds,
      favoritePlayerIds: body.favoritePlayerIds,
      preferredContentTypes: body.preferredContentTypes,
    })

    user.favoriteTeamIds = validated.favoriteTeamIds
    user.favoritePlayerIds = validated.favoritePlayerIds
    user.preferredContentTypes = validated.preferredContentTypes
    const matchRoomNotificationPreferences = normalizeMatchRoomNotificationPreferences(body.notificationPreferences?.matchRoom || body.matchRoomNotifications)
    if (matchRoomNotificationPreferences) {
      user.notificationPreferences = {
        ...(user.notificationPreferences && typeof user.notificationPreferences === "object" ? user.notificationPreferences : {}),
        matchRoom: matchRoomNotificationPreferences,
      }
    }
    await user.save?.()

    return ok({
      preferences: mapPreferences(user, validated.options),
      options: validated.options,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update preferences"
    return errorResponse(
      message,
      message === "Authentication required" ? 401 : message.includes("Invalid favorite") ? 422 : 500,
    )
  }
}
