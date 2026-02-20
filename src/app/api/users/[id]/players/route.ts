import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Schema for claiming a player profile
const claimPlayerSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
  verificationCode: z.string().optional(), // For future verification system
})

// Get all players linked to a user
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: userId } = await params

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get all linked players for this user
    const linkedPlayers = await prisma.player.findMany({
      where: {
        userId: userId,
        isLinked: true
      },
      include: {
        auction: {
          select: {
            id: true,
            name: true,
            status: true,
            scheduledAt: true,
            logo: true
          }
        },
        tier: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            color: true
          }
        },
        assignedTeam: {
          select: {
            id: true,
            name: true,
            primaryColor: true
          }
        }
      },
      orderBy: [
        { linkedAt: 'desc' },
        { name: 'asc' }
      ]
    })

    // Group players by auction for better organization
    const playersByAuction = linkedPlayers.reduce((acc, player) => {
      const auctionId = player.auction.id
      if (!acc[auctionId]) {
        acc[auctionId] = {
          auction: player.auction,
          players: []
        }
      }
      acc[auctionId].players.push(player)
      return acc
    }, {} as Record<string, { auction: any, players: any[] }>)

    const stats = {
      totalLinkedPlayers: linkedPlayers.length,
      activeAuctions: Object.keys(playersByAuction).length,
      soldPlayers: linkedPlayers.filter(p => p.status === 'SOLD').length,
      availablePlayers: linkedPlayers.filter(p => p.status === 'AVAILABLE').length,
      unsoldPlayers: linkedPlayers.filter(p => p.status === 'UNSOLD').length,
    }

    return NextResponse.json({
      success: true,
      user,
      linkedPlayers,
      playersByAuction: Object.values(playersByAuction),
      stats
    })

  } catch (error) {
    console.error('Failed to get user players:', error)
    return NextResponse.json({
      error: 'Failed to get user players',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Allow user to claim a player profile
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: userId } = await params
    const body = await request.json()
    const { playerId, verificationCode } = claimPlayerSchema.parse(body)

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if player exists and is available for claiming
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        linkedUser: {
          select: { id: true, name: true, email: true }
        },
        auction: {
          select: { id: true, name: true }
        }
      }
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    if (player.isLinked && player.userId !== userId) {
      return NextResponse.json(
        { error: 'Player is already linked to another user' },
        { status: 400 }
      )
    }

    if (player.isLinked && player.userId === userId) {
      return NextResponse.json(
        { error: 'Player is already linked to your account' },
        { status: 400 }
      )
    }

    // Check if player email matches user email for auto-verification
    const shouldAutoVerify = player.email === user.email

    // Basic verification logic (can be enhanced with codes, admin approval, etc.)
    let canClaim = false
    let reasonDenied = ''

    if (shouldAutoVerify) {
      canClaim = true
    } else if (player.email && player.email !== user.email) {
      reasonDenied = 'Player email does not match your account email'
    } else {
      // No email on player profile - require admin approval for now
      canClaim = true // For now, allow claiming. Later can add admin approval workflow
    }

    if (!canClaim) {
      return NextResponse.json({
        error: 'Cannot claim player profile',
        reason: reasonDenied,
        suggestion: 'Contact auction organizers for manual linking'
      }, { status: 400 })
    }

    // Link the player to the user
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        userId: userId,
        isLinked: true,
        linkedAt: new Date(),
        linkingMethod: 'USER_CLAIM',
        linkVerified: shouldAutoVerify,
      },
      include: {
        linkedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        auction: {
          select: {
            id: true,
            name: true
          }
        },
        tier: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            color: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: shouldAutoVerify
        ? 'Player profile claimed and verified successfully'
        : 'Player profile claimed successfully (pending verification)',
      player: updatedPlayer
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Failed to claim player:', error)
    return NextResponse.json({
      error: 'Failed to claim player',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}