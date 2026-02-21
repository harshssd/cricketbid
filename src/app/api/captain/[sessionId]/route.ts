import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyTeamAdminAccess, getAuthenticatedUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { sessionId } = await params

    // The sessionId format will be: auctionId-teamId
    const [auctionId, teamId] = sessionId.split('-')

    if (!auctionId || !teamId) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      )
    }

    // Get authenticated user from middleware headers
    const { userId, userEmail } = getAuthenticatedUser(request)

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify team admin access (captain, vice-captain, or auction admin)
    const authResult = await verifyTeamAdminAccess(userId, userEmail, teamId, auctionId)

    if (!authResult.success) {
      return NextResponse.json(
        {
          error: authResult.error,
          details: authResult.details,
          currentUser: authResult.currentUser
        },
        { status: authResult.statusCode || 403 }
      )
    }

    // Fetch auction details
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('id, name, status, currency_name, currency_icon, budget_per_team')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError || !auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // Fetch team for this auction
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, primary_color, budget_remaining, captain_id, captain:users!captain_id(id, name, email, image), players:players(id)')
      .eq('id', teamId)
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found in this auction' },
        { status: 404 }
      )
    }

    // Fetch open rounds for this auction
    const { data: openRounds, error: roundsError } = await supabase
      .from('rounds')
      .select('id, tier_id, status, closed_at, timer_seconds, opened_at')
      .eq('auction_id', auctionId)
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1)

    if (roundsError) {
      throw roundsError
    }

    // Fetch tiers for this auction
    const { data: tiers, error: tiersError } = await supabase
      .from('tiers')
      .select('*')
      .eq('auction_id', auctionId)
      .order('sort_order', { ascending: true })

    if (tiersError) {
      throw tiersError
    }

    // Get current round (if any)
    const currentRound = openRounds?.[0]
    let currentRoundData = null

    if (currentRound) {
      // Get total bid count for this round
      const { count: totalBids } = await supabase
        .from('bids')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', currentRound.id)

      // Get highest bid for this round
      const { data: highestBidResult } = await supabase
        .from('bids')
        .select('amount')
        .eq('round_id', currentRound.id)
        .order('amount', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Get tier info for this round
      const tier = tiers?.find(t => t.id === currentRound.tier_id)

      // Get players for the current round's tier
      const { data: playersInTier } = await supabase
        .from('players')
        .select('id, name, image, playing_role')
        .eq('tier_id', currentRound.tier_id)
        .eq('status', 'AVAILABLE')
        .limit(1) // For now, get the first available player in the tier

      const currentPlayer = playersInTier?.[0]

      // Find captain's bid for this round
      // The captain is the team's captain, so we look for bids by users who captain this team
      const { data: captainBid } = await supabase
        .from('bids')
        .select('amount, submitted_at, is_winning_bid')
        .eq('round_id', currentRound.id)
        .eq('captain_id', team.captain_id)
        .maybeSingle()

      currentRoundData = {
        id: currentRound.id,
        tierId: currentRound.tier_id,
        status: currentRound.status,
        timeRemaining: currentRound.closed_at ?
          Math.max(0, Math.floor((new Date(currentRound.closed_at).getTime() - Date.now()) / 1000)) :
          null,
        maxTime: currentRound.timer_seconds || 300,
        player: currentPlayer ? {
          id: currentPlayer.id,
          name: currentPlayer.name,
          image: currentPlayer.image,
          playingRole: currentPlayer.playing_role
        } : null,
        tier: tier ? {
          id: tier.id,
          name: tier.name,
          basePrice: tier.base_price,
          color: tier.color
        } : null,
        myBid: captainBid ? {
          amount: captainBid.amount,
          submittedAt: captainBid.submitted_at,
          status: captainBid.is_winning_bid ? 'WINNING' : 'SUBMITTED'
        } : undefined,
        highestBid: highestBidResult?.amount,
        totalBids: totalBids ?? 0
      }
    }

    // Build session response
    const session = {
      id: sessionId,
      auction: {
        id: auction.id,
        name: auction.name,
        status: auction.status,
        currencyName: auction.currency_name,
        currencyIcon: auction.currency_icon
      },
      team: {
        id: team.id,
        name: team.name,
        primaryColor: team.primary_color,
        remainingBudget: team.budget_remaining ?? auction.budget_per_team,
        totalBudget: auction.budget_per_team,
        playerCount: team.players?.length ?? 0,
        captain: team.captain
      },
      currentRound: currentRoundData,
      roundHistory: [], // TODO: Implement round history
      isConnected: true // TODO: Implement real-time connection status
    }

    return NextResponse.json(session)

  } catch (error) {
    console.error('Failed to fetch captain session:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch captain session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
