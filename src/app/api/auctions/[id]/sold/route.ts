import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST — Record a player sale: create auction_result, update team budget
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = createAdminClient()
    const { id: auctionId } = await params
    const { playerId, teamId, amount } = await request.json()

    if (!playerId || !teamId || !amount) {
      return NextResponse.json(
        { error: 'playerId, teamId, and amount are required' },
        { status: 400 }
      )
    }

    // Verify auction exists and is LIVE
    const { data: auction } = await supabase
      .from('auctions')
      .select('id, status')
      .eq('id', auctionId)
      .maybeSingle()

    if (!auction || auction.status !== 'LIVE') {
      return NextResponse.json(
        { error: 'Auction not found or not live' },
        { status: 400 }
      )
    }

    // Create auction_result (upsert on auction_id + player_id)
    const { error: resultError } = await supabase
      .from('auction_results')
      .upsert(
        {
          auction_id: auctionId,
          player_id: playerId,
          team_id: teamId,
          winning_bid_amount: amount,
          assigned_at: new Date().toISOString(),
        },
        { onConflict: 'auction_id, player_id' }
      )

    if (resultError) {
      console.error('[sold/POST] Failed to create auction_result:', resultError)
      return NextResponse.json(
        { error: 'Failed to record sale', details: resultError.message },
        { status: 500 }
      )
    }

    // Mark the winning bid
    const { data: openRound } = await supabase
      .from('rounds')
      .select('id')
      .eq('auction_id', auctionId)
      .eq('player_id', playerId)
      .eq('status', 'OPEN')
      .maybeSingle()

    if (openRound) {
      await supabase
        .from('bids')
        .update({ is_winning_bid: true })
        .eq('round_id', openRound.id)
        .eq('team_id', teamId)
        .eq('player_id', playerId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[sold/POST] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
