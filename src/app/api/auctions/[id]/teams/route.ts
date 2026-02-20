import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateTeamsSchema = z.array(z.object({
  id: z.string().optional(), // Optional for new teams
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  primaryColor: z.string().default('#3B82F6'),
  secondaryColor: z.string().default('#1B2A4A'),
  logo: z.string().optional(),
  captainId: z.string().nullable().optional(),
  budgetRemaining: z.number().optional(),
}))

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params
    const body = await request.json()

    // Validate the request body
    const teams = updateTeamsSchema.parse(body.teams || body)

    // Check if auction exists and is editable
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: { teams: true }
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    if (auction.status !== 'DRAFT' && auction.status !== 'LOBBY') {
      return NextResponse.json(
        { error: 'Cannot modify teams - auction must be in DRAFT or LOBBY status' },
        { status: 400 }
      )
    }

    // Update teams in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get existing team IDs
      const existingTeamIds = auction.teams.map(team => team.id)

      // Process team updates/creations
      const updatedTeams = []
      const providedTeamIds = teams
        .filter(team => team.id)
        .map(team => team.id!)

      // Update or create teams
      for (const teamData of teams) {
        if (teamData.id && existingTeamIds.includes(teamData.id)) {
          // Update existing team
          const updatedTeam = await tx.team.update({
            where: { id: teamData.id },
            data: {
              name: teamData.name,
              description: teamData.description,
              primaryColor: teamData.primaryColor,
              secondaryColor: teamData.secondaryColor,
              logo: teamData.logo,
              ...(teamData.captainId !== undefined && {
                captainId: teamData.captainId
              }),
              ...(teamData.budgetRemaining !== undefined && {
                budgetRemaining: teamData.budgetRemaining
              })
            },
            include: {
              captain: { select: { id: true, name: true, email: true, image: true } },
              players: { select: { id: true, name: true, playingRole: true } },
              _count: { select: { players: true, members: true } }
            }
          })
          updatedTeams.push(updatedTeam)
        } else {
          // Create new team
          const newTeam = await tx.team.create({
            data: {
              auctionId,
              name: teamData.name,
              description: teamData.description,
              primaryColor: teamData.primaryColor,
              secondaryColor: teamData.secondaryColor,
              logo: teamData.logo,
              captainId: teamData.captainId || undefined,
              budgetRemaining: teamData.budgetRemaining || auction.budgetPerTeam,
            },
            include: {
              captain: { select: { id: true, name: true, email: true, image: true } },
              players: { select: { id: true, name: true, playingRole: true } },
              _count: { select: { players: true, members: true } }
            }
          })
          updatedTeams.push(newTeam)
        }
      }

      // Delete teams that are no longer in the list
      const teamsToDelete = existingTeamIds.filter(id => !providedTeamIds.includes(id))
      if (teamsToDelete.length > 0) {
        await tx.team.deleteMany({
          where: {
            id: { in: teamsToDelete },
            auctionId
          }
        })
      }

      return updatedTeams
    })

    return NextResponse.json({
      success: true,
      teams: result
    })

  } catch (error) {
    console.error('Failed to update teams:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to update teams',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get teams for an auction
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: { status: true, budgetPerTeam: true }
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    const teams = await prisma.team.findMany({
      where: { auctionId },
      orderBy: { name: 'asc' },
      include: {
        captain: { select: { id: true, name: true, email: true, image: true } },
        players: {
          select: {
            id: true,
            name: true,
            image: true,
            playingRole: true,
            tierId: true,
            status: true,
            tier: { select: { name: true, color: true } }
          }
        },
        _count: {
          select: {
            players: true,
            members: true,
            participations: true
          }
        }
      }
    })

    return NextResponse.json({
      teams,
      auctionStatus: auction.status,
      budgetPerTeam: auction.budgetPerTeam
    })

  } catch (error) {
    console.error('Failed to fetch teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}
