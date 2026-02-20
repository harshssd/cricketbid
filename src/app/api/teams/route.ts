import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  primaryColor: z.string().default('#3B82F6'),
  secondaryColor: z.string().default('#1B2A4A'),
  logo: z.string().optional(),
  captainId: z.string().optional(),
  maxMembers: z.number().min(1).default(11),

  // Context association - exactly one must be provided
  clubId: z.string().optional(),
  leagueId: z.string().optional(),
  auctionId: z.string().optional(),

  // Auction-specific fields
  budgetRemaining: z.number().optional(),
})

const updateTeamSchema = createTeamSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
})

// Create a new team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const teamData = createTeamSchema.parse(body)

    // Validate that exactly one context is provided
    const contexts = [teamData.clubId, teamData.leagueId, teamData.auctionId].filter(Boolean)
    if (contexts.length !== 1) {
      return NextResponse.json(
        { error: 'Exactly one of clubId, leagueId, or auctionId must be provided' },
        { status: 400 }
      )
    }

    // Validate context exists
    if (teamData.clubId) {
      const club = await prisma.club.findUnique({
        where: { id: teamData.clubId },
        include: { _count: { select: { teams: true } } }
      })
      if (!club) {
        return NextResponse.json(
          { error: 'Club not found' },
          { status: 404 }
        )
      }
    } else if (teamData.leagueId) {
      const league = await prisma.league.findUnique({
        where: { id: teamData.leagueId },
        include: { _count: { select: { teams: true } } }
      })
      if (!league) {
        return NextResponse.json(
          { error: 'League not found' },
          { status: 404 }
        )
      }

      // Check team limit for leagues
      if (league.maxTeams && league._count.teams >= league.maxTeams) {
        return NextResponse.json(
          { error: `League is full. Maximum ${league.maxTeams} teams allowed.` },
          { status: 400 }
        )
      }
    } else if (teamData.auctionId) {
      const auction = await prisma.auction.findUnique({
        where: { id: teamData.auctionId },
      })
      if (!auction) {
        return NextResponse.json(
          { error: 'Auction not found' },
          { status: 404 }
        )
      }
    }

    // Validate captain if provided
    if (teamData.captainId) {
      const captain = await prisma.user.findUnique({
        where: { id: teamData.captainId }
      })
      if (!captain) {
        return NextResponse.json(
          { error: 'Captain not found' },
          { status: 404 }
        )
      }
    }

    // Create the team
    const team = await prisma.team.create({
      data: teamData,
      include: {
        captain: { select: { id: true, name: true, email: true, image: true } },
        club: { select: { id: true, name: true, logo: true } },
        league: { select: { id: true, name: true, logo: true } },
        auction: { select: { id: true, name: true } },
        _count: { select: { members: true } }
      }
    })

    return NextResponse.json({
      success: true,
      team
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create team:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to create team',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get teams with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clubId = searchParams.get('clubId')
    const leagueId = searchParams.get('leagueId')
    const auctionId = searchParams.get('auctionId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Build where clause
    const whereClause: any = {}
    if (clubId) whereClause.clubId = clubId
    if (leagueId) whereClause.leagueId = leagueId
    if (auctionId) whereClause.auctionId = auctionId
    if (!includeInactive) whereClause.isActive = true

    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        captain: { select: { id: true, name: true, email: true, image: true } },
        club: { select: { id: true, name: true, logo: true } },
        league: { select: { id: true, name: true, logo: true } },
        auction: { select: { id: true, name: true } },
        _count: { select: { members: true } }
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ teams })

  } catch (error) {
    console.error('Failed to fetch teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

// Update multiple teams
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { teams } = body

    if (!Array.isArray(teams)) {
      return NextResponse.json(
        { error: 'Teams must be an array' },
        { status: 400 }
      )
    }

    // Validate all teams
    const validatedTeams = teams.map(team => updateTeamSchema.parse(team))

    // Process updates in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedTeams = []

      for (const teamData of validatedTeams) {
        const { id, ...updateData } = teamData

        const updatedTeam = await tx.team.update({
          where: { id },
          data: updateData,
          include: {
            captain: { select: { id: true, name: true, email: true, image: true } },
            club: { select: { id: true, name: true, logo: true } },
            league: { select: { id: true, name: true, logo: true } },
            auction: { select: { id: true, name: true } },
            _count: { select: { members: true } }
          }
        })
        updatedTeams.push(updatedTeam)
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