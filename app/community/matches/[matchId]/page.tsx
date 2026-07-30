import { MatchRoomDetail } from "@/components/community-match-rooms"

export default async function CommunityMatchRoomPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  return <MatchRoomDetail matchId={matchId} />
}
