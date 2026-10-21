import mongoose from "mongoose"

import { CommunityPost } from "./models"

export const UNAVAILABLE_FAVORITE_MESSAGE = "เนื้อหานี้ถูกลบหรือไม่พร้อมใช้งานแล้ว"

// Saved posts keep a copy of the title, so check the source post still exists and is public.
export async function getUnavailablePostIds(favorites: Array<{ itemType?: string; itemId?: string }>) {
  const postIds = favorites.filter((item) => item.itemType === "post").map((item) => String(item.itemId || ""))
  const validIds = postIds.filter((id) => mongoose.isValidObjectId(id))
  const available = validIds.length
    ? await CommunityPost.find({ _id: { $in: validIds }, status: "published" }).select("_id").lean<Array<{ _id: unknown }>>()
    : []
  const availableIds = new Set(available.map((post) => String(post._id)))
  return new Set(postIds.filter((id) => !availableIds.has(id)))
}

export async function withFavoriteAvailability<T extends { itemType?: string; itemId?: string }>(favorites: T[]) {
  const unavailable = await getUnavailablePostIds(favorites)
  return favorites.map((item) => {
    const isAvailable = !(item.itemType === "post" && unavailable.has(String(item.itemId || "")))
    return { ...item, isAvailable, ...(isAvailable ? {} : { unavailableReason: UNAVAILABLE_FAVORITE_MESSAGE }) }
  })
}
