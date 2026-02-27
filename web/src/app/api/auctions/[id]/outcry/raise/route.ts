import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, verifyTeamAdminAccess } from '@/lib/auth'
import { calculateNextBid, type OutcryConfig } from '@/lib/outcry-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id: auctionId } = await params
    const body = await request.json()
    const { teamId } = body as { teamId: string }

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    }

    // Auth check
    const { userId, userEmail } = getAuthenticatedUser(request)
    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const authResult = await verifyTeamAdminAccess(userId, userEmail, teamId, auctionId)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error, details: authResult.details },
        { status: authResult.statusCode || 403 }
      )
    }

    // Validate auction is LIVE + OPEN_OUTCRY
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('id, status, bidding_type, outcry_config, budget_per_team')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }
    if (auction.status !== 'LIVE') {
      return NextResponse.json({ error: 'Auction is not live' }, { status: 400 })
    }
    if (auction.bidding_type !== 'OPEN_OUTCRY') {
      return NextResponse.json({ error: 'This auction does not use open outcry bidding' }, { status: 400 })
    }

    // Get current open round
    const { data: round } = await supabase
      .from('rounds')
      .select('id, player_id, base_price, current_bid_amount, current_bid_team_id, bid_count, status')
      .eq('auction_id', auctionId)
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!round) {
      return NextResponse.json({ error: 'No open round' }, { status: 400 })
    }

    if (round.current_bid_team_id === teamId) {
      return NextResponse.json({ error: 'Your team already holds the highest bid' }, { status: 400 })
    }

    // Budget check
    const outcryConfig = auction.outcry_config as OutcryConfig | null
    const basePrice = round.base_price || 0
    const currentBid = round.current_bid_amount || basePrice
    const nextBid = round.bid_count === 0
      ? basePrice
      : (outcryConfig ? calculateNextBid(currentBid, basePrice, outcryConfig) : currentBid + basePrice)

    const { data: teamBudget } = await supabase
      .from('team_budgets')
      .select('budget_remaining')
      .eq('team_id', teamId)
      .maybeSingle()

    const remaining = teamBudget?.budget_remaining ?? auction.budget_per_team
    if (nextBid > remaining) {
      return NextResponse.json(
        { error: 'Insufficient budget for this bid', nextBid, remaining },
        { status: 400 }
      )
    }

    // Call raise_paddle RPC for atomic bid
    const timerSeconds = outcryConfig?.timer_seconds ?? null
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('raise_paddle', {
        p_round_id: round.id,
        p_team_id: teamId,
        p_player_id: round.player_id,
        p_auction_id: auctionId,
        p_timer_seconds: timerSeconds,
      })

    if (rpcError) {
      console.error('[outcry/raise] RPC error:', rpcError)
      return NextResponse.json(
        { error: rpcError.message || 'Failed to raise paddle' },
        { status: 400 }
      )
    }

    const result = rpcResult?.[0] || rpcResult
    const newAmount = result?.new_amount
    const newSequence = result?.new_sequence
    const bidId = result?.bid_id

    // Get team name for broadcast
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .maybeSingle()

    // Calculate timer expiry for broadcast
    const timerExpiresAt = timerSeconds
      ? new Date(Date.now() + timerSeconds * 1000).toISOString()
      : null

    // Calculate next bid amount after this one
    const nextBidAfter = outcryConfig
      ? calculateNextBid(newAmount, basePrice, outcryConfig)
      : newAmount + basePrice

    // Broadcast outcry-bid event
    const channel = supabase.channel(`auction-${auctionId}`)
    await channel.send({
      type: 'broadcast',
      event: 'outcry-bid',
      payload: {
        roundId: round.id,
        bidId,
        amount: newAmount,
        sequence: newSequence,
        teamId,
        teamName: team?.name || 'Unknown',
        timerExpiresAt,
        nextBidAmount: nextBidAfter,
        basePrice,
        playerId: round.player_id,
      },
    })
    await supabase.removeChannel(channel)

    return NextResponse.json({
      success: true,
      amount: newAmount,
      sequence: newSequence,
      bidId,
      timerExpiresAt,
      nextBidAmount: nextBidAfter,
    })
  } catch (error) {
    console.error('[outcry/raise] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
