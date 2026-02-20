import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string; teamId: string }>
}

const assignPlayersSchema = z.object({
  playerIds: z.array(z.string()).min(1, 'At least one player ID is required'),
})

const removePlayersSchema = z.object({
  playerIds: z.array(z.string()).min(1, 'At least one player ID is required'),
})

// Assign players to a team (pre-auction)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params
    const body = await request.json()
    const { playerIds } = assignPlayersSchema.parse(body)

    // Verify auction exists and is editable
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: { status: true, squadSize: true }
    })

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    if (auction.status !== 'DRAFT' && auction.status !== 'LOBBY') {
      return NextResponse.json(
        { error: 'Cannot assign players - auction must be in DRAFT or LOBBY status' },
        { status: 400 }
      )
    }

    // Verify team belongs to this auction
    const team = await prisma.team.findFirst({
      where: { id: teamId, auctionId },
      include: { _count: { select: { players: true } } }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found in this auction' }, { status: 404 })
    }

    // Check squad size limit
    if (team._count.players + playerIds.length > auction.squadSize) {
      return NextResponse.json(
        { error: `Cannot assign ${playerIds.length} players. Squad size limit is ${auction.squadSize}, team already has ${team._count.players} players.` },
        { status: 400 }
      )
    }

    // Verify all players belong to this auction and are available
    const players = await prisma.player.findMany({
      where: {
        id: { in: playerIds },
        auctionId,
      },
      select: { id: true, name: true, status: true, assignedTeamId: true }
    })

    if (players.length !== playerIds.length) {
      return NextResponse.json(
        { error: 'Some players were not found in this auction' },
        { status: 400 }
      )
    }

    const alreadyAssigned = players.filter(p => p.assignedTeamId && p.assignedTeamId !== teamId)
    if (alreadyAssigned.length > 0) {
      const names = alreadyAssigned.map(p => p.name).join(', ')
      return NextResponse.json(
        { error: `Players already assigned to another team: ${names}` },
        { status: 400 }
      )
    }

    // Assign players to the team
    await prisma.player.updateMany({
      where: {
        id: { in: playerIds },
        auctionId,
      },
      data: {
        assignedTeamId: teamId,
      }
    })

    // Fetch updated team with players
    const updatedTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
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
        _count: { select: { players: true } }
      }
    })

    return NextResponse.json({ success: true, team: updatedTeam })

  } catch (error) {
    console.error('Failed to assign players:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to assign players',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Remove players from a team (pre-auction)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params
    const body = await request.json()
    const { playerIds } = removePlayersSchema.parse(body)

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
        { error: 'Cannot remove players - auction must be in DRAFT or LOBBY status' },
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

    // Unassign players from this team
    await prisma.player.updateMany({
      where: {
        id: { in: playerIds },
        auctionId,
        assignedTeamId: teamId,
      },
      data: {
        assignedTeamId: null,
      }
    })

    // Fetch updated team
    const updatedTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
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
        _count: { select: { players: true } }
      }
    })

    return NextResponse.json({ success: true, team: updatedTeam })

  } catch (error) {
    console.error('Failed to remove players:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to remove players',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
