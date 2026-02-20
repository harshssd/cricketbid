import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // Get team and captain info
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        captain: { select: { id: true } },
        auction: {
          select: { id: true, status: true, budgetPerTeam: true }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    if (team.auction?.id !== auctionId) {
      return NextResponse.json(
        { error: 'Team does not belong to this auction' },
        { status: 400 }
      )
    }

    if (team.auction.status !== 'LIVE') {
      return NextResponse.json(
        { error: 'Auction is not live' },
        { status: 400 }
      )
    }

    // Verify round is active
    const round = await prisma.round.findFirst({
      where: {
        id: roundId,
        auctionId: auctionId,
        status: 'OPEN'
      },
      include: {
        tier: {
          select: { basePrice: true }
        }
      }
    })

    if (!round) {
      return NextResponse.json(
        { error: 'Round not found or not active' },
        { status: 404 }
      )
    }

    // Get player information separately
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, name: true, tierId: true }
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    // Verify player belongs to the current round's tier
    if (player.tierId !== round.tierId) {
      return NextResponse.json(
        { error: 'Player does not belong to current round tier' },
        { status: 400 }
      )
    }

    // Check if bid meets minimum requirements
    if (amount < round.tier.basePrice) {
      return NextResponse.json(
        { error: `Minimum bid is ${round.tier.basePrice}` },
        { status: 400 }
      )
    }

    // Check if team has sufficient budget
    const remainingBudget = team.budgetRemaining ?? team.auction.budgetPerTeam
    if (amount > remainingBudget) {
      return NextResponse.json(
        { error: 'Insufficient budget' },
        { status: 400 }
      )
    }

    // Check if round is still open (time-based)
    if (round.closedAt && new Date() > round.closedAt) {
      return NextResponse.json(
        { error: 'Bidding time has expired for this round' },
        { status: 400 }
      )
    }

    // Use the authenticated user as the captain ID for the bid
    // This allows multiple authorized users to place bids for the team
    const bid = await prisma.bid.upsert({
      where: {
        roundId_captainId_playerId: {
          roundId: roundId,
          captainId: userId,
          playerId: playerId
        }
      },
      update: {
        amount: amount,
        submittedAt: new Date(),
        rejectionReason: null
      },
      create: {
        roundId: roundId,
        captainId: userId,
        playerId: playerId,
        amount: amount
      },
      include: {
        captain: {
          select: { id: true, name: true, email: true }
        },
        player: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      bid: {
        id: bid.id,
        amount: bid.amount,
        submittedAt: bid.submittedAt,
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