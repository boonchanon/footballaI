import { MatchRoomThreadDetail } from "@/components/community-match-rooms"

export default async function CommunityMatchThreadPage({
  params,
}: {
  params: Promise<{ matchId: string; threadId: string }>
}) {
  const { matchId, threadId } = await params
  return <MatchRoomThreadDetail matchId={matchId} threadId={threadId} />
}
