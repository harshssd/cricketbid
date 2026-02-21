import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { verifyTeamAdminAccess, getAuthenticatedUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

const bidSchema = z.object({
  roundId: z.string(),
  playerId: z.string(),
  amount: z.number().min(1)
})

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { sessionId } = await params
    const body = await request.json()

    // Validate request body
    const { roundId, playerId, amount } = bidSchema.parse(body)

    // Parse session ID to get auction and team
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

    // Get team and auction info
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, budget_remaining, captain_id, auction_id, auction:auctions!auction_id(id, status, budget_per_team)')
      .eq('id', teamId)
      .maybeSingle()

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    const teamAuction = team.auction as unknown as { id: string; status: string; budget_per_team: number } | null

    if (teamAuction?.id !== auctionId) {
      return NextResponse.json(
        { error: 'Team does not belong to this auction' },
        { status: 400 }
      )
    }

    if (teamAuction.status !== 'LIVE') {
      return NextResponse.json(
        { error: 'Auction is not live' },
        { status: 400 }
      )
    }

    // Verify round is active
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('id, tier_id, status, closed_at, tier:tiers!tier_id(base_price)')
      .eq('id', roundId)
      .eq('auction_id', auctionId)
      .eq('status', 'OPEN')
      .maybeSingle()

    if (roundError || !round) {
      return NextResponse.json(
        { error: 'Round not found or not active' },
        { status: 404 }
      )
    }

    // Get player information
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, name, tier_id')
      .eq('id', playerId)
      .maybeSingle()

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    // Verify player belongs to the current round's tier
    if (player.tier_id !== round.tier_id) {
      return NextResponse.json(
        { error: 'Player does not belong to current round tier' },
        { status: 400 }
      )
    }

    // Check if bid meets minimum requirements
    const roundTier = round.tier as unknown as { base_price: number } | null
    const basePrice = roundTier?.base_price ?? 0
    if (amount < basePrice) {
      return NextResponse.json(
        { error: `Minimum bid is ${basePrice}` },
        { status: 400 }
      )
    }

    // Check if team has sufficient budget
    const remainingBudget = team.budget_remaining ?? teamAuction.budget_per_team
    if (amount > remainingBudget) {
      return NextResponse.json(
        { error: 'Insufficient budget' },
        { status: 400 }
      )
    }

    // Check if round is still open (time-based)
    if (round.closed_at && new Date() > new Date(round.closed_at)) {
      return NextResponse.json(
        { error: 'Bidding time has expired for this round' },
        { status: 400 }
      )
    }

    // Use the authenticated user as the captain ID for the bid
    // This allows multiple authorized users to place bids for the team
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .upsert(
        {
          round_id: roundId,
          captain_id: userId,
          player_id: playerId,
          amount: amount,
          submitted_at: new Date().toISOString(),
          rejection_reason: null,
        },
        { onConflict: 'round_id, captain_id, player_id' }
      )
      .select('*, captain:users!captain_id(id, name, email), player:players!player_id(id, name)')
      .single()

    if (bidError) {
      throw bidError
    }

    return NextResponse.json({
      success: true,
      bid: {
        id: bid.id,
        amount: bid.amount,
        submittedAt: bid.submitted_at,
        captain: bid.captain,
        player: bid.player
      },
      message: `Bid of ${amount} submitted successfully for ${player.name}`
    })

  } catch (error) {
    console.error('Failed to submit bid:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid bid data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to submit bid',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
