import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET — Return all bids for the current open round
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = createAdminClient()
    const { id: auctionId } = await params

    // Find current OPEN round
    const { data: openRound } = await supabase
      .from('rounds')
      .select('id, player_id, tier_id')
      .eq('auction_id', auctionId)
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!openRound) {
      return NextResponse.json({ bids: [], roundId: null })
    }

    // Fetch all bids for this round with team info
    const { data: bids, error } = await supabase
      .from('bids')
      .select('id, amount, submitted_at, team_id, player_id, team:teams!team_id(id, name)')
      .eq('round_id', openRound.id)
      .order('amount', { ascending: false })

    if (error) {
      console.error('[bids/GET] Failed to fetch bids:', error)
      return NextResponse.json({ bids: [], roundId: openRound.id })
    }

    const formattedBids = (bids || []).map(bid => {
      const team = bid.team as unknown as { id: string; name: string } | null
      return {
        id: bid.id,
        teamId: team?.id || bid.team_id,
        teamName: team?.name || 'Unknown',
        amount: bid.amount,
        submittedAt: bid.submitted_at,
      }
    })

    return NextResponse.json({
      bids: formattedBids,
      roundId: openRound.id,
      playerId: openRound.player_id,
    })
  } catch (error) {
    console.error('[bids/GET] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bids' },
      { status: 500 }
    )
  }
}
