import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTeamAdminAccess, getAuthenticatedUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
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
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        teams: {
          where: { id: teamId },
          include: {
            captain: {
              select: { id: true, name: true, email: true, image: true }
            },
            _count: { select: { players: true } }
          }
        },
        rounds: {
          where: { status: 'OPEN' },
          include: {
            tier: {
              select: { id: true, name: true, basePrice: true, color: true }
            },
            bids: {
              where: {
                captain: {
                  captainedTeams: {
                    some: { id: teamId }
                  }
                }
              },
              select: { amount: true, submittedAt: true, isWinningBid: true }
            },
            _count: { select: { bids: true } }
          },
          orderBy: { openedAt: 'desc' },
          take: 1
        },
        tiers: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    const team = auction.teams[0]
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found in this auction' },
        { status: 404 }
      )
    }

    // Get current round (if any)
    const currentRound = auction.rounds[0]
    let currentRoundData = null

    if (currentRound) {
      // Get highest bid for this round
      const highestBidResult = await prisma.bid.findFirst({
        where: { roundId: currentRound.id },
        orderBy: { amount: 'desc' },
        select: { amount: true }
      })

      // Get players for the current round's tier
      const playersInTier = await prisma.player.findMany({
        where: {
          tierId: currentRound.tierId,
          status: 'AVAILABLE'
        },
        select: {
          id: true,
          name: true,
          image: true,
          playingRole: true
        },
        take: 1 // For now, get the first available player in the tier
      })

      const currentPlayer = playersInTier[0]

      // Find captain's bid for this round
      const captainBid = currentRound.bids[0]

      currentRoundData = {
        id: currentRound.id,
        tierId: currentRound.tierId,
        status: currentRound.status,
        timeRemaining: currentRound.closedAt ?
          Math.max(0, Math.floor((new Date(currentRound.closedAt).getTime() - Date.now()) / 1000)) :
          null,
        maxTime: currentRound.timerSeconds || 300,
        player: currentPlayer ? {
          id: currentPlayer.id,
          name: currentPlayer.name,
          image: currentPlayer.image,
          playingRole: currentPlayer.playingRole
        } : null,
        tier: currentRound.tier,
        myBid: captainBid ? {
          amount: captainBid.amount,
          submittedAt: captainBid.submittedAt,
          status: captainBid.isWinningBid ? 'WINNING' : 'SUBMITTED'
        } : undefined,
        highestBid: highestBidResult?.amount,
        totalBids: currentRound._count.bids
      }
    }

    // Build session response
    const session = {
      id: sessionId,
      auction: {
        id: auction.id,
        name: auction.name,
        status: auction.status,
        currencyName: auction.currencyName,
        currencyIcon: auction.currencyIcon
      },
      team: {
        id: team.id,
        name: team.name,
        primaryColor: team.primaryColor,
        remainingBudget: team.budgetRemaining ?? auction.budgetPerTeam,
        totalBudget: auction.budgetPerTeam,
        playerCount: team._count.players,
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