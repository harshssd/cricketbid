import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string; teamId: string }>
}

const updateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').optional(),
  description: z.string().nullable().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  logo: z.string().nullable().optional(),
  captainId: z.string().nullable().optional(),
  budgetRemaining: z.number().optional(),
})

// Update a single team
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params
    const body = await request.json()
    const data = updateTeamSchema.parse(body)

    // Verify auction exists and is editable
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: { status: true }
    })

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    if (auction.status !== 'DRAFT' && auction.status !== 'LOBBY') {
      return NextResponse.json(
        { error: 'Cannot modify team - auction must be in DRAFT or LOBBY status' },
        { status: 400 }
      )
    }

    // Verify team belongs to this auction
    const existingTeam = await prisma.team.findFirst({
      where: { id: teamId, auctionId }
    })

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found in this auction' }, { status: 404 })
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data,
      include: {
        captain: { select: { id: true, name: true, email: true, image: true } },
        players: {
          select: {
            id: true,
            name: true,
            image: true,
            playingRole: true,
            status: true,
            tier: { select: { name: true, color: true } }
          }
        },
        _count: { select: { players: true, members: true } }
      }
    })

    return NextResponse.json({ success: true, team: updatedTeam })

  } catch (error) {
    console.error('Failed to update team:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to update team',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Delete a single team
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params

    // Verify auction exists and is editable
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: { status: true }
    })

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    if (auction.status !== 'DRAFT' && auction.status !== 'LOBBY') {
      return NextResponse.json(
        { error: 'Cannot delete team - auction must be in DRAFT or LOBBY status' },
        { status: 400 }
      )
    }

    // Verify team belongs to this auction
    const team = await prisma.team.findFirst({
      where: { id: teamId, auctionId }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found in this auction' }, { status: 404 })
    }

    // Unassign all players first, then delete team
    await prisma.$transaction(async (tx) => {
      await tx.player.updateMany({
        where: { assignedTeamId: teamId },
        data: { assignedTeamId: null }
      })

      await tx.team.delete({
        where: { id: teamId }
      })
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to delete team:', error)
    return NextResponse.json({
      error: 'Failed to delete team',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
