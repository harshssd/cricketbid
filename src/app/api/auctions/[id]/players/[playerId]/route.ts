import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{
    id: string
    playerId: string
  }>
}

const updatePlayerSchema = z.object({
  name: z.string().min(1, 'Player name is required').optional(),
  playingRole: z.string().optional(), // Accept comma-separated roles as string
  customTags: z.string().optional(),
  tierId: z.string().optional(),
})

// PUT - Update individual player
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, playerId } = await params
    const body = await request.json()

    // Validate request body
    const validatedData = updatePlayerSchema.parse(body)

    // Get authenticated user
    const { userId } = getAuthenticatedUser(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if auction exists and user has permission
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        participations: {
          where: { userId },
          select: { role: true }
        }
      }
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // Check if user has permission (auction owner or participant with appropriate role)
    const userParticipant = auction.participations[0]
    const canManage = auction.ownerId === userId ||
                     (userParticipant && ['OWNER', 'MODERATOR', 'CAPTAIN'].includes(userParticipant.role))

    if (!canManage) {
      return NextResponse.json(
        { error: 'Permission denied - insufficient privileges to edit players' },
        { status: 403 }
      )
    }

    // Only allow editing in DRAFT status
    if (auction.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Players can only be edited in DRAFT status' },
        { status: 400 }
      )
    }

    // Check if player exists and belongs to this auction
    const existingPlayer = await prisma.player.findFirst({
      where: {
        id: playerId,
        auctionId: auctionId
      }
    })

    if (!existingPlayer) {
      return NextResponse.json(
        { error: 'Player not found in this auction' },
        { status: 404 }
      )
    }

    // Validate tier if provided
    if (validatedData.tierId) {
      const tier = await prisma.tier.findFirst({
        where: {
          id: validatedData.tierId,
          auctionId: auctionId
        }
      })

      if (!tier) {
        return NextResponse.json(
          { error: 'Invalid tier ID for this auction' },
          { status: 400 }
        )
      }
    }

    // Handle multiple playing roles - store the first role in playingRole field
    // and store all roles in customTags for backward compatibility
    let updateData: any = {}

    if (validatedData.playingRole) {
      const roles = validatedData.playingRole.split(',').map(r => r.trim()).filter(r => r)
      const validRoles = ['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER']

      // Validate all roles are valid
      const invalidRoles = roles.filter(role => !validRoles.includes(role))
      if (invalidRoles.length > 0) {
        return NextResponse.json(
          { error: 'Invalid playing roles', details: { invalidRoles } },
          { status: 400 }
        )
      }

      if (roles.length > 0) {
        // Store primary role in playingRole field
        updateData.playingRole = roles[0] as 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER'

        // Store all roles in customTags as comma-separated string
        const existingTags = validatedData.customTags || existingPlayer.customTags || ''
        const roleString = roles.join(',')

        // If we have existing custom tags that aren't roles, preserve them
        const existingNonRoleTags = existingTags.split(',')
          .map(t => t.trim())
          .filter(t => t && !validRoles.includes(t))
          .join(',')

        updateData.customTags = existingNonRoleTags
          ? `${roleString},${existingNonRoleTags}`
          : roleString
      }
    }

    // Add other fields to update
    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.tierId) updateData.tierId = validatedData.tierId
    if (validatedData.customTags !== undefined && !validatedData.playingRole) {
      updateData.customTags = validatedData.customTags
    }

    // Update the player
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: updateData,
      include: {
        tier: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            color: true,
          }
        },
        assignedTeam: {
          select: {
            id: true,
            name: true,
            primaryColor: true,
          }
        },
        linkedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Player ${updatedPlayer.name} updated successfully`,
      player: updatedPlayer
    })

  } catch (error) {
    console.error('Failed to update player:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to update player',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET - Get individual player details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, playerId } = await params

    const player = await prisma.player.findFirst({
      where: {
        id: playerId,
        auctionId: auctionId
      },
      include: {
        tier: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            color: true,
          }
        },
        assignedTeam: {
          select: {
            id: true,
            name: true,
            primaryColor: true,
          }
        },
        linkedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      }
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found in this auction' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      player
    })

  } catch (error) {
    console.error('Failed to get player:', error)
    return NextResponse.json(
      { error: 'Failed to get player details' },
      { status: 500 }
    )
  }
}

// DELETE - Delete individual player
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, playerId } = await params

    // Get authenticated user
    const { userId } = getAuthenticatedUser(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if auction exists and user has permission
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        participations: {
          where: { userId },
          select: { role: true }
        }
      }
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // Check permission
    const userParticipant = auction.participations[0]
    const canManage = auction.ownerId === userId ||
                     (userParticipant && ['OWNER', 'MODERATOR', 'CAPTAIN'].includes(userParticipant.role))

    if (!canManage) {
      return NextResponse.json(
        { error: 'Permission denied - insufficient privileges to delete players' },
        { status: 403 }
      )
    }

    // Only allow deletion in DRAFT status
    if (auction.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Players can only be deleted in DRAFT status' },
        { status: 400 }
      )
    }

    // Check if player exists and belongs to this auction
    const existingPlayer = await prisma.player.findFirst({
      where: {
        id: playerId,
        auctionId: auctionId
      }
    })

    if (!existingPlayer) {
      return NextResponse.json(
        { error: 'Player not found in this auction' },
        { status: 404 }
      )
    }

    // Delete the player
    await prisma.player.delete({
      where: { id: playerId }
    })

    return NextResponse.json({
      success: true,
      message: `Player ${existingPlayer.name} deleted successfully`
    })

  } catch (error) {
    console.error('Failed to delete player:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete player',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}