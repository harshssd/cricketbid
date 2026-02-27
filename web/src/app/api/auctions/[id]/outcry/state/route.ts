import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateNextBid, calculateIncrement, type OutcryConfig } from '@/lib/outcry-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id: auctionId } = await params

    // Get auction + open round in parallel
    const [auctionResult, roundResult] = await Promise.all([
      supabase
        .from('auctions')
        .select('id, bidding_type, outcry_config')
        .eq('id', auctionId)
        .maybeSingle(),
      supabase
        .from('rounds')
        .select('id, player_id, base_price, current_bid_amount, current_bid_team_id, bid_count, status, closed_at')
        .eq('auction_id', auctionId)
        .eq('status', 'OPEN')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const auction = auctionResult.data
    const round = roundResult.data

    if (!auction || auction.bidding_type !== 'OPEN_OUTCRY') {
      return NextResponse.json({ error: 'Not an open outcry auction' }, { status: 400 })
    }

    if (!round) {
      return NextResponse.json({ roundId: null, status: 'no_round' })
    }

    const config = auction.outcry_config as OutcryConfig | null
    const basePrice = round.base_price || 0
    const currentBid = round.current_bid_amount || basePrice
    const increment = config ? calculateIncrement(currentBid, basePrice, config) : basePrice
    const nextBidAmount = config ? calculateNextBid(currentBid, basePrice, config) : currentBid + basePrice

    // Get current bid team name
    let currentBidTeamName: string | null = null
    if (round.current_bid_team_id) {
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', round.current_bid_team_id)
        .maybeSingle()
      currentBidTeamName = team?.name || null
    }

    // Get recent bids (last 10)
    const { data: recentBids } = await supabase
      .from('bids')
      .select('id, amount, team_id, sequence_number, submitted_at, team:teams!team_id(name)')
      .eq('round_id', round.id)
      .not('sequence_number', 'is', null)
      .order('sequence_number', { ascending: false })
      .limit(10)

    const formattedBids = (recentBids || []).map(b => ({
      id: b.id,
      amount: b.amount,
      teamId: b.team_id,
      teamName: (b.team as unknown as { name: string })?.name || 'Unknown',
      sequence: b.sequence_number,
      at: b.submitted_at,
    }))

    return NextResponse.json({
      roundId: round.id,
      playerId: round.player_id,
      basePrice,
      currentBid,
      currentBidTeamId: round.current_bid_team_id,
      currentBidTeamName,
      nextBidAmount,
      increment,
      bidCount: round.bid_count || 0,
      timerExpiresAt: round.closed_at,
      recentBids: formattedBids,
    })
  } catch (error) {
    console.error('[outcry/state] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
